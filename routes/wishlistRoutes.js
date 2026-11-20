import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import * as c from '../controllers/wishlistController.js';

const r = Router();
r.use(protect);
r.get('/', c.getWishlist);
r.post('/:productId', c.addToWishlist);
r.delete('/:productId', c.removeFromWishlist);
export default r;
