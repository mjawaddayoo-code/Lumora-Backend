import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { protect, adminOnly } from '../middleware/auth.js';
import * as c from '../controllers/categoryController.js';

const r = Router();
r.get('/', c.listCategories);
r.get('/admin/all', protect, adminOnly, c.listAllCategories);
r.post('/', protect, adminOnly, validate([body('name').trim().notEmpty().withMessage('Category name is required')]), c.createCategory);
r.put('/:id', protect, adminOnly, c.updateCategory);
r.delete('/:id', protect, adminOnly, c.deleteCategory);
export default r;
