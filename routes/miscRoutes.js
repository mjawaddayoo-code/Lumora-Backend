import { Router } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { validate } from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import * as c from '../controllers/miscController.js';

const r = Router();
r.get('/config', c.config);
r.post('/contact', rateLimit({ windowMs: 60 * 60 * 1000, max: 10 }), validate([
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Enter a valid email'),
  body('message').trim().isLength({ min: 10 }).withMessage('Message must be at least 10 characters'),
]), c.contact);
r.post('/payments/:orderId/intent', protect, c.paymentIntent);
r.post('/payments/:orderId/confirm', protect, c.confirmPayment);
export default r;
