import Review from '../models/Review.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const productReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId }).populate('user', 'name').sort('-createdAt');
  res.json({ success: true, reviews });
});

export const addReview = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  if (!(await Product.exists({ _id: productId }))) throw new ApiError(404, 'Product not found');
  if (await Review.exists({ product: productId, user: req.user._id })) throw new ApiError(409, 'You have already reviewed this product');
  const verifiedPurchase = !!(await Order.exists({ user: req.user._id, status: 'delivered', 'items.product': productId }));
  const review = await Review.create({
    product: productId, user: req.user._id, verifiedPurchase,
    rating: req.body.rating, title: req.body.title, comment: req.body.comment,
  });
  await Review.recalc(productId);
  await review.populate('user', 'name');
  res.status(201).json({ success: true, review });
});

export const updateReview = asyncHandler(async (req, res) => {
  const review = await Review.findOne({ _id: req.params.id, user: req.user._id });
  if (!review) throw new ApiError(404, 'Review not found');
  Object.assign(review, { rating: req.body.rating, title: req.body.title ?? review.title, comment: req.body.comment });
  await review.save();
  await Review.recalc(review.product);
  await review.populate('user', 'name');
  res.json({ success: true, review });
});

export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new ApiError(404, 'Review not found');
  if (String(review.user) !== String(req.user._id) && req.user.role !== 'admin') throw new ApiError(403, 'Not allowed');
  await review.deleteOne();
  await Review.recalc(review.product);
  res.json({ success: true, message: 'Review deleted' });
});

export const allReviews = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 20;
  const [reviews, total] = await Promise.all([
    Review.find().populate('user', 'name email').populate('product', 'name slug').sort('-createdAt').skip((page - 1) * limit).limit(limit),
    Review.countDocuments(),
  ]);
  res.json({ success: true, reviews, page, pages: Math.ceil(total / limit) || 1, total });
});
