import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import * as c from '../controllers/cartController.js';

const r = Router();
r.use(protect);
r.get('/', c.getMyCart);
r.post('/items', validate([body('productId').isMongoId().withMessage('Invalid product'), body('qty').optional().isInt({ min: 1, max: 99 }).withMessage('Quantity must be 1-99')]), c.addItem);
r.put('/items/:productId', validate([body('qty').isInt({ min: 0, max: 99 }).withMessage('Quantity must be 0-99')]), c.setQty);
r.delete('/items/:productId', c.removeItem);
r.delete('/', c.clearCart);
export default r;
