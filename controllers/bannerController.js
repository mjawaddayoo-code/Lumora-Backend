import Banner from '../models/Banner.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { pick } from '../utils/helpers.js';
import { destroyImages } from '../utils/cloudinary.js';

const FIELDS = ['tag', 'title', 'text', 'image', 'ctaText', 'ctaLink', 'order', 'isActive'];
// Only internal paths or http(s) links are allowed as CTA targets.
const safeLink = (l) => (typeof l === 'string' && (l.startsWith('/') || /^https?:\/\//.test(l)) ? l : '/shop');

export const listBanners = asyncHandler(async (_req, res) => {
  res.json({ success: true, banners: await Banner.find({ isActive: true }).sort({ order: 1, createdAt: -1 }) });
});
export const listAllBanners = asyncHandler(async (_req, res) => {
  res.json({ success: true, banners: await Banner.find().sort({ order: 1, createdAt: -1 }) });
});

export const createBanner = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (data.ctaLink !== undefined) data.ctaLink = safeLink(data.ctaLink);
  res.status(201).json({ success: true, banner: await Banner.create(data) });
});

export const updateBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) throw new ApiError(404, 'Banner not found');
  const oldImage = banner.image?.publicId;
  const data = pick(req.body, FIELDS);
  if (data.ctaLink !== undefined) data.ctaLink = safeLink(data.ctaLink);
  Object.assign(banner, data);
  await banner.save();
  if (oldImage && oldImage !== banner.image?.publicId) await destroyImages([oldImage]);
  res.json({ success: true, banner });
});

export const deleteBanner = asyncHandler(async (req, res) => {
  const banner = await Banner.findById(req.params.id);
  if (!banner) throw new ApiError(404, 'Banner not found');
  await destroyImages([banner.image?.publicId]);
  await banner.deleteOne();
  res.json({ success: true, message: 'Banner deleted' });
});
