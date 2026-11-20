import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { protect, adminOnly } from '../middleware/auth.js';
import * as c from '../controllers/reviewController.js';

const r = Router();
const rules = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
  body('comment').trim().notEmpty().withMessage('Please write a short review'),
];
r.get('/admin/all', protect, adminOnly, c.allReviews);
r.get('/product/:productId', c.productReviews);
r.post('/product/:productId', protect, validate(rules), c.addReview);
r.put('/:id', protect, validate(rules), c.updateReview);
r.delete('/:id', protect, c.deleteReview);
export default r;
