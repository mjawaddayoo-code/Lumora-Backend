import Category from '../models/Category.js';
import Product from '../models/Product.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { pick } from '../utils/helpers.js';
import { destroyImages } from '../utils/cloudinary.js';

const FIELDS = ['name', 'description', 'image', 'isActive'];

const withCounts = async (cats) => {
  const counts = await Product.aggregate([{ $group: { _id: '$category', n: { $sum: 1 } } }]);
  const map = new Map(counts.map((c) => [String(c._id), c.n]));
  return cats.map((c) => ({ ...c.toObject(), productCount: map.get(String(c._id)) || 0 }));
};

export const listCategories = asyncHandler(async (_req, res) => {
  const cats = await Category.find({ isActive: true }).sort('name');
  res.json({ success: true, categories: await withCounts(cats) });
});

export const listAllCategories = asyncHandler(async (_req, res) => {
  const cats = await Category.find().sort('name');
  res.json({ success: true, categories: await withCounts(cats) });
});

export const createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create(pick(req.body, FIELDS));
  res.status(201).json({ success: true, category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');
  const oldImage = category.image?.publicId;
  Object.assign(category, pick(req.body, FIELDS));
  await category.save();
  if (oldImage && oldImage !== category.image?.publicId) await destroyImages([oldImage]);
  res.json({ success: true, category });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');
  if (await Product.exists({ category: category._id })) throw new ApiError(400, 'Move or delete this category\'s products first');
  await destroyImages([category.image?.publicId]);
  await category.deleteOne();
  res.json({ success: true, message: 'Category deleted' });
});
