import User from '../models/User.js';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';
import Review from '../models/Review.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { pick, signToken } from '../utils/helpers.js';

const publicUser = (u) => ({
  _id: u._id, name: u.name, email: u.email, role: u.role, phone: u.phone, address: u.address, createdAt: u.createdAt,
});
const send = (res, user, status = 200) =>
  res.status(status).json({ success: true, token: signToken(user._id), user: publicUser(user) });

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (await User.findOne({ email: email.toLowerCase() })) throw new ApiError(409, 'An account with this email already exists');
  // Role is never accepted from the client; admins are created via the seed script.
  const user = await User.create({ name, email, password, phone });
  send(res, user, 201);
});

export const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(req.body.password))) throw new ApiError(401, 'Invalid email or password');
  if (!user.isActive) throw new ApiError(403, 'This account has been disabled');
  send(res, user);
});

export const adminLogin = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(req.body.password))) throw new ApiError(401, 'Invalid email or password');
  if (user.role !== 'admin') throw new ApiError(403, 'This account does not have admin access');
  if (!user.isActive) throw new ApiError(403, 'This account has been disabled');
  send(res, user);
});

export const me = asyncHandler(async (req, res) => res.json({ success: true, user: publicUser(req.user) }));

export const updateProfile = asyncHandler(async (req, res) => {
  const data = pick(req.body, ['name', 'phone']);
  Object.assign(req.user, data);
  if (req.body.address) Object.assign(req.user.address, pick(req.body.address, ['street', 'city', 'province', 'postalCode', 'country']));
  if (req.body.email && req.body.email.toLowerCase() !== req.user.email) {
    if (await User.findOne({ email: req.body.email.toLowerCase() })) throw new ApiError(409, 'That email is already in use');
    req.user.email = req.body.email;
  }
  await req.user.save();
  res.json({ success: true, user: publicUser(req.user) });
});

export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(req.body.currentPassword))) throw new ApiError(400, 'Current password is incorrect');
  user.password = req.body.newPassword;
  await user.save();
  send(res, user);
});

export const deleteAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(req.body.password || ''))) throw new ApiError(400, 'Password is incorrect');
  if (user.role === 'admin') throw new ApiError(400, 'Admin accounts cannot be self-deleted');
  const reviews = await Review.find({ user: user._id });
  await Promise.all([Cart.deleteOne({ user: user._id }), Review.deleteMany({ user: user._id }), user.deleteOne()]);
  await Promise.all([...new Set(reviews.map((r) => String(r.product)))].map((id) => Review.recalc(id)));
  // Orders are kept for accounting; they reference the (now removed) user id.
  res.json({ success: true, message: 'Account deleted' });
});
