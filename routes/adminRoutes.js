import { Router } from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { imageUpload } from '../middleware/upload.js';
import * as a from '../controllers/adminController.js';
import { uploadImage } from '../controllers/uploadController.js';

const r = Router();
r.use(protect, adminOnly);
r.get('/stats', a.stats);
r.get('/users', a.listUsers);
r.patch('/users/:id/active', a.setUserActive);
r.delete('/users/:id', a.deleteUser);
r.get('/messages', a.listMessages);
r.patch('/messages/:id', a.markMessage);
r.delete('/messages/:id', a.deleteMessage);
r.post('/upload', imageUpload.single('image'), uploadImage);
export default r;
