import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import sanitize from './middleware/sanitize.js';
import { notFound, errorHandler } from './middleware/error.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import miscRoutes from './routes/miscRoutes.js';
import bannerRoutes from './routes/bannerRoutes.js';

const isServerless = !!process.env.VERCEL;
// Log instead of crashing the whole function on a stray rejected promise.
process.on('unhandledRejection', (reason) => console.error('Unhandled rejection:', reason));
const missing = ['MONGO_URI', 'JWT_SECRET'].filter((k) => !process.env[k]);
if (missing.length && !isServerless) {
  console.error(`Missing required env var(s): ${missing.join(', ')}. Copy server/.env.example to server/.env and fill it in.`);
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Allowed browser origins. Trailing slashes are ignored so "https://x.app/" and "https://x.app" both work.
const norm = (s) => s.trim().replace(/\/+$/, '');
const origins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map(norm).filter(Boolean);
app.use(cors({ origin: (origin, cb) => cb(null, !origin || origins.includes(norm(origin))) }));
app.use(express.json({ limit: '1mb' }));
app.use(sanitize);
if (!isServerless && process.env.NODE_ENV !== 'test') app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/', (_req, res) => res.json({ success: true, name: 'Lumora API', docs: 'All routes live under /api' }));
// Health check never touches the database. Shows which settings are present (booleans only, no secrets).
app.get('/api/health', (_req, res) =>
  res.json({ success: true, status: 'ok', env: { MONGO_URI: !!process.env.MONGO_URI, JWT_SECRET: !!process.env.JWT_SECRET, CLIENT_URL: origins, CLOUDINARY: !!process.env.CLOUDINARY_CLOUD_NAME } })
);

// Everything below needs the database. Errors are returned as JSON (with CORS headers) instead of crashing the function.
app.use('/api', async (_req, res, next) => {
  if (missing.length) return res.status(500).json({ success: false, message: `Server misconfigured: missing env var(s) ${missing.join(', ')}` });
  try { await connectDB(); next(); } catch (e) {
    console.error('MongoDB connection failed:', e.message);
    res.status(503).json({ success: false, message: 'Database connection failed. Check MONGO_URI and the MongoDB Atlas Network Access list (allow 0.0.0.0/0 for Vercel).' });
  }
});

app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }), authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api', miscRoutes);

app.use(notFound);
app.use(errorHandler);

if (!isServerless) {
  const port = process.env.PORT || 5000;
  connectDB()
    .then(() => app.listen(port, () => console.log(`API listening on :${port}`)))
    .catch((e) => { console.error('MongoDB connection failed:', e.message); process.exit(1); });
}

export default app;
