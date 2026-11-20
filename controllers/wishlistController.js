import User from '../models/User.js';
import Product from '../models/Product.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

const reply = async (req, res) => {
  const user = await User.findById(req.user._id).populate({ path: 'wishlist', match: { isActive: true }, populate: { path: 'category', select: 'name slug' } });
  res.json({ success: true, products: user.wishlist.filter(Boolean) });
};

export const getWishlist = asyncHandler(reply);

export const addToWishlist = asyncHandler(async (req, res) => {
  if (!(await Product.exists({ _id: req.params.productId, isActive: true }))) throw new ApiError(404, 'Product not found');
  await User.updateOne({ _id: req.user._id }, { $addToSet: { wishlist: req.params.productId } });
  await reply(req, res);
});

export const removeFromWishlist = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $pull: { wishlist: req.params.productId } });
  await reply(req, res);
});
