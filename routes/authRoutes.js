import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import * as c from '../controllers/authController.js';

const r = Router();
const email = body('email').isEmail().withMessage('Enter a valid email').normalizeEmail({ gmail_remove_dots: false });
const password = body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters');

r.post('/register', validate([body('name').trim().notEmpty().withMessage('Name is required'), email, password,
  body('phone').optional({ checkFalsy: true }).matches(/^[0-9+\-\s()]{7,20}$/).withMessage('Enter a valid phone number')]), c.register);
r.post('/login', validate([email, body('password').notEmpty().withMessage('Password is required')]), c.login);
r.post('/admin-login', validate([email, body('password').notEmpty().withMessage('Password is required')]), c.adminLogin);
r.get('/me', protect, c.me);
r.put('/me', protect, validate([body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Enter a valid email'),
  body('phone').optional({ checkFalsy: true }).matches(/^[0-9+\-\s()]{7,20}$/).withMessage('Enter a valid phone number')]), c.updateProfile);
r.put('/password', protect, validate([body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')]), c.changePassword);
r.delete('/me', protect, c.deleteAccount);
export default r;
