import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { protect, adminOnly } from '../middleware/auth.js';
import * as c from '../controllers/productController.js';

const r = Router();
const rules = (req) => [
  body('name')[req ? 'exists' : 'optional']().trim().notEmpty().withMessage('Product name is required'),
  body('description')[req ? 'exists' : 'optional']().trim().notEmpty().withMessage('Description is required'),
  body('price')[req ? 'exists' : 'optional']().isFloat({ min: 0 }).withMessage('Price must be 0 or more'),
  body('comparePrice').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Compare price must be 0 or more'),
  body('stock')[req ? 'exists' : 'optional']().isInt({ min: 0 }).withMessage('Stock must be a whole number, 0 or more'),
  body('category')[req ? 'exists' : 'optional']().isMongoId().withMessage('Choose a valid category'),
];

r.get('/', c.listProducts);
r.get('/admin/list', protect, adminOnly, c.listProductsAdmin);
r.post('/', protect, adminOnly, validate(rules(true)), c.createProduct);
r.get('/:id/related', c.relatedProducts);
r.get('/:id', c.getProduct);
r.put('/:id', protect, adminOnly, validate(rules(false)), c.updateProduct);
r.patch('/:id/stock', protect, adminOnly, validate([body('stock').isInt({ min: 0 }).withMessage('Stock must be a whole number, 0 or more')]), c.updateStock);
r.delete('/:id', protect, adminOnly, c.deleteProduct);
export default r;
