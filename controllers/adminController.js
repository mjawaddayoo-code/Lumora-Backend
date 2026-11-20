import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Message from '../models/Message.js';
import Cart from '../models/Cart.js';
import Review from '../models/Review.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { escapeRegex } from '../utils/helpers.js';

export const stats = asyncHandler(async (_req, res) => {
  const since = new Date(Date.now() - 29 * 24 * 3600 * 1000);
  since.setHours(0, 0, 0, 0);
  const [totalUsers, totalProducts, totalOrders, revenueAgg, byStatus, daily, topProducts, lowStock, recentOrders, unreadMessages] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    Product.countDocuments(),
    Order.countDocuments(),
    Order.aggregate([{ $match: { status: { $ne: 'cancelled' } } }, { $group: { _id: null, total: { $sum: '$totalPrice' }, n: { $sum: 1 } } }]),
    Order.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $ne: 'cancelled' } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$totalPrice' }, orders: { $sum: 1 } } },
    ]),
    Product.find().sort({ sold: -1 }).limit(5).select('name sold price images'),
    Product.find({ stock: { $lte: 5 } }).sort({ stock: 1 }).limit(8).select('name stock images'),
    Order.find().populate('user', 'name').sort('-createdAt').limit(6),
    Message.countDocuments({ read: false }),
  ]);
  // Fill missing days so the chart has a continuous 30-day series.
  const dayMap = new Map(daily.map((d) => [d._id, d]));
  const sales = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(since.getTime() + i * 24 * 3600 * 1000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { date: key, revenue: dayMap.get(key)?.revenue || 0, orders: dayMap.get(key)?.orders || 0 };
  });
  res.json({
    success: true,
    stats: {
      totalUsers, totalProducts, totalOrders,
      totalRevenue: revenueAgg[0]?.total || 0,
      averageOrderValue: revenueAgg[0] ? Math.round(revenueAgg[0].total / revenueAgg[0].n) : 0,
      ordersByStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.n])),
      sales, topProducts, lowStock, recentOrders, unreadMessages,
    },
  });
});

export const listUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 15;
  const filter = { role: 'user' };
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(String(req.query.search).trim()), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  const [users, total] = await Promise.all([
    User.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  const stats = await Order.aggregate([
    { $match: { user: { $in: users.map((u) => u._id) }, status: { $ne: 'cancelled' } } },
    { $group: { _id: '$user', orders: { $sum: 1 }, spent: { $sum: '$totalPrice' } } },
  ]);
  const map = new Map(stats.map((s) => [String(s._id), s]));
  res.json({
    success: true, page, pages: Math.ceil(total / limit) || 1, total,
    users: users.map((u) => ({ ...u, wishlist: undefined, orders: map.get(String(u._id))?.orders || 0, spent: map.get(String(u._id))?.spent || 0 })),
  });
});

export const setUserActive = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (user.role === 'admin') throw new ApiError(400, 'Admin accounts cannot be modified here');
  user.isActive = !!req.body.isActive;
  await user.save();
  res.json({ success: true, user });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (user.role === 'admin') throw new ApiError(400, 'Admin accounts cannot be deleted here');
  const reviews = await Review.find({ user: user._id });
  await Promise.all([Cart.deleteOne({ user: user._id }), Review.deleteMany({ user: user._id }), user.deleteOne()]);
  await Promise.all([...new Set(reviews.map((r) => String(r.product)))].map((id) => Review.recalc(id)));
  res.json({ success: true, message: 'User deleted' });
});

export const listMessages = asyncHandler(async (_req, res) => {
  res.json({ success: true, messages: await Message.find().sort('-createdAt').limit(200) });
});
export const markMessage = asyncHandler(async (req, res) => {
  const m = await Message.findByIdAndUpdate(req.params.id, { read: !!req.body.read }, { new: true });
  if (!m) throw new ApiError(404, 'Message not found');
  res.json({ success: true, message: m });
});
export const deleteMessage = asyncHandler(async (req, res) => {
  await Message.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});
