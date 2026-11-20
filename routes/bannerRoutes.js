import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.js';
import { protect, adminOnly } from '../middleware/auth.js';
import * as c from '../controllers/bannerController.js';

const r = Router();
r.get('/', c.listBanners);
r.get('/admin/all', protect, adminOnly, c.listAllBanners);
r.post('/', protect, adminOnly, validate([body('title').trim().notEmpty().withMessage('Headline is required')]), c.createBanner);
r.put('/:id', protect, adminOnly, c.updateBanner);
r.delete('/:id', protect, adminOnly, c.deleteBanner);
export default r;
