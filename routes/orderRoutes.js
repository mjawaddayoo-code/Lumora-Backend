import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { ORDER_STATUSES } from '../models/Order.js';
import * as c from '../controllers/orderController.js';

const r = Router();
r.use(protect);
r.post('/', validate([
  body('shippingAddress.fullName').trim().notEmpty().withMessage('Full name is required'),
  body('shippingAddress.phone').matches(/^[0-9+\-\s()]{7,20}$/).withMessage('Enter a valid phone number'),
  body('shippingAddress.street').trim().notEmpty().withMessage('Street address is required'),
  body('shippingAddress.city').trim().notEmpty().withMessage('City is required'),
  body('paymentMethod').optional().isIn(['cod', 'card']).withMessage('Invalid payment method'),
]), c.createOrder);
r.get('/my', c.myOrders);
r.get('/admin/all', adminOnly, c.allOrders);
r.put('/admin/:id/status', adminOnly, validate([body('status').isIn(ORDER_STATUSES).withMessage('Invalid status')]), c.updateOrderStatus);
r.get('/:id', c.getOrder);
r.put('/:id/cancel', c.cancelMyOrder);
export default r;
