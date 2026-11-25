import mongoose from 'mongoose';

// Cached connection: required on serverless platforms (Vercel) where the function is re-invoked often.
const cache = globalThis.__lumoraMongo || (globalThis.__lumoraMongo = { conn: null, promise: null });

export default async function connectDB() {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    mongoose.set('strictQuery', true);
    cache.promise = mongoose
      .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 })
      .catch((e) => { cache.promise = null; throw e; });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}
