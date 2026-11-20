import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { uploadBuffer } from '../utils/cloudinary.js';

export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No image provided (field name: "image")');
  const image = await uploadBuffer(req.file.buffer, ['categories', 'banners'].includes(req.query.folder) ? req.query.folder : 'products');
  res.status(201).json({ success: true, image });
});
