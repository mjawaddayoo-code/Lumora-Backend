import multer from 'multer';
import ApiError from '../utils/ApiError.js';

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    /^image\/(jpe?g|png|webp|gif|avif)$/.test(file.mimetype)
      ? cb(null, true)
      : cb(new ApiError(400, 'Only JPG, PNG, WEBP, GIF or AVIF images are allowed')),
});
