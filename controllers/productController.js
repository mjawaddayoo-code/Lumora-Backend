import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import Cart from '../models/Cart.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { pick, escapeRegex, toArray } from '../utils/helpers.js';
import { destroyImages } from '../utils/cloudinary.js';

const SORTS = {
  newest: { createdAt: -1 },
  'price-asc': { price: 1 },
  'price-desc': { price: -1 },
  rating: { ratingAvg: -1, numReviews: -1 },
  trending: { sold: -1, ratingAvg: -1 },
  'name-asc': { name: 1 },
};
const FIELDS = ['name', 'description', 'price', 'comparePrice', 'category', 'stock', 'sku', 'brand', 'featured', 'isActive'];

const buildFilter = async (q, includeInactive = false) => {
  const f = includeInactive ? {} : { isActive: true };
  if (q.search) {
    const rx = new RegExp(escapeRegex(String(q.search).trim()), 'i');
    f.$or = [{ name: rx }, { brand: rx }, { tags: rx }, { description: rx }];
  }
  if (q.category) {
    const cat = mongoose.isValidObjectId(q.category)
      ? await Category.findById(q.category)
      : await Category.findOne({ slug: q.category });
    f.category = cat ? cat._id : new mongoose.Types.ObjectId();
  }
  if (q.minPrice || q.maxPrice) {
    f.price = {};
    if (q.minPrice) f.price.$gte = Number(q.minPrice);
    if (q.maxPrice) f.price.$lte = Number(q.maxPrice);
  }
  if (q.inStock === 'true') f.stock = { $gt: 0 };
  if (q.featured === 'true') f.featured = true;
  if (q.exclude && mongoose.isValidObjectId(q.exclude)) f._id = { $ne: q.exclude };
  return f;
};

const runList = async (req, res, includeInactive) => {
  const filter = await buildFilter(req.query, includeInactive);
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(48, Math.max(1, parseInt(req.query.limit) || 12));
  const sort = SORTS[req.query.sort] || SORTS.newest;
  const [products, total] = await Promise.all([
    Product.find(filter).populate('category', 'name slug').sort(sort).skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter),
  ]);
  res.json({ success: true, products, page, pages: Math.ceil(total / limit) || 1, total });
};

export const listProducts = asyncHandler((req, res) => runList(req, res, false));
export const listProductsAdmin = asyncHandler((req, res) => runList(req, res, true));

export const getProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await Product.findOne(mongoose.isValidObjectId(id) ? { _id: id } : { slug: id }).populate('category', 'name slug');
  if (!product || !product.isActive) throw new ApiError(404, 'Product not found');
  res.json({ success: true, product });
});

export const relatedProducts = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');
  const products = await Product.find({ category: product.category, isActive: true, _id: { $ne: product._id } })
    .populate('category', 'name slug').sort({ sold: -1, createdAt: -1 }).limit(8);
  res.json({ success: true, products });
});

const cleanImages = (images) =>
  (Array.isArray(images) ? images : [])
    .filter((i) => i && typeof i.url === 'string' && /^https?:\/\//.test(i.url))
    .map((i) => ({ url: i.url, publicId: i.publicId || '' }));

export const createProduct = asyncHandler(async (req, res) => {
  if (!(await Category.exists({ _id: req.body.category }))) throw new ApiError(400, 'Category does not exist');
  const product = await Product.create({
    ...pick(req.body, FIELDS),
    tags: toArray(req.body.tags),
    images: cleanImages(req.body.images),
  });
  res.status(201).json({ success: true, product });
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');
  if (req.body.category && !(await Category.exists({ _id: req.body.category }))) throw new ApiError(400, 'Category does not exist');
  const before = product.images.map((i) => i.publicId);
  Object.assign(product, pick(req.body, FIELDS));
  if (req.body.tags !== undefined) product.tags = toArray(req.body.tags);
  if (req.body.images !== undefined) product.images = cleanImages(req.body.images);
  await product.save();
  const after = new Set(product.images.map((i) => i.publicId));
  await destroyImages(before.filter((id) => id && !after.has(id)));
  res.json({ success: true, product });
});

export const updateStock = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { stock: req.body.stock }, { new: true, runValidators: true });
  if (!product) throw new ApiError(404, 'Product not found');
  res.json({ success: true, product });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');
  await destroyImages(product.images.map((i) => i.publicId));
  await Promise.all([
    Review.deleteMany({ product: product._id }),
    User.updateMany({}, { $pull: { wishlist: product._id } }),
    Cart.updateMany({}, { $pull: { items: { product: product._id } } }),
    product.deleteOne(),
  ]);
  res.json({ success: true, message: 'Product deleted' });
});
