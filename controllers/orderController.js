import crypto from 'crypto';
import Order, { ORDER_STATUSES } from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { computeShipping } from '../utils/helpers.js';
import { isMethodEnabled } from '../services/payment.js';

const restock = (items) =>
  items.length
    ? Product.bulkWrite(items.map((i) => ({ updateOne: { filter: { _id: i.product }, update: { $inc: { stock: i.qty, sold: -i.qty } } } })))
    : null;

const orderNumber = () => `LM-${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

export const createOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, paymentMethod = 'cod', notes = '' } = req.body;
  if (!isMethodEnabled(paymentMethod)) throw new ApiError(400, 'That payment method is not available');

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart || !cart.items.length) throw new ApiError(400, 'Your cart is empty');

  const products = await Product.find({ _id: { $in: cart.items.map((i) => i.product) }, isActive: true });
  const map = new Map(products.map((p) => [String(p._id), p]));
  const items = cart.items.map((ci) => {
    const p = map.get(String(ci.product));
    if (!p) throw new ApiError(400, 'An item in your cart is no longer available. Please review your cart.');
    if (p.stock < ci.qty) throw new ApiError(400, `Only ${p.stock} of "${p.name}" left in stock`);
    return { product: p._id, name: p.name, image: p.images[0]?.url || '', price: p.price, qty: ci.qty };
  });

  const reserved = [];
  try {
    for (const it of items) {
      const r = await Product.updateOne({ _id: it.product, stock: { $gte: it.qty } }, { $inc: { stock: -it.qty, sold: it.qty } });
      if (!r.modifiedCount) throw new ApiError(409, `"${it.name}" just went out of stock`);
      reserved.push(it);
    }
    const itemsPrice = items.reduce((s, i) => s + i.price * i.qty, 0);
    const shippingPrice = computeShipping(itemsPrice);
    const order = await Order.create({
      orderNumber: orderNumber(),
      user: req.user._id,
      items,
      shippingAddress,
      notes,
      paymentMethod,
      itemsPrice,
      shippingPrice,
      totalPrice: itemsPrice + shippingPrice,
    });
    cart.items = [];
    await cart.save();
    res.status(201).json({ success: true, order });
  } catch (e) {
    await restock(reserved);
    throw e;
  }
});

export const myOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort('-createdAt');
  res.json({ success: true, orders });
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email phone');
  if (!order) throw new ApiError(404, 'Order not found');
  const ownerId = String(order.user?._id || order.user);
  if (ownerId !== String(req.user._id) && req.user.role !== 'admin') throw new ApiError(403, 'Not allowed');
  res.json({ success: true, order });
});

export const cancelMyOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.status !== 'pending') throw new ApiError(400, 'Only pending orders can be cancelled. Please contact support.');
  order.status = 'cancelled';
  await order.save();
  await restock(order.items);
  res.json({ success: true, order });
});

// ---- Admin ----
export const allOrders = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 15);
  const filter = {};
  if (ORDER_STATUSES.includes(req.query.status)) filter.status = req.query.status;
  if (req.query.search) filter.orderNumber = new RegExp(String(req.query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const [orders, total] = await Promise.all([
    Order.find(filter).populate('user', 'name email').sort('-createdAt').skip((page - 1) * limit).limit(limit),
    Order.countDocuments(filter),
  ]);
  res.json({ success: true, orders, page, pages: Math.ceil(total / limit) || 1, total });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Order not found');
  const { status } = req.body;
  if (['delivered', 'cancelled'].includes(order.status)) throw new ApiError(400, `A ${order.status} order cannot be changed`);
  order.status = status;
  if (status === 'cancelled') await restock(order.items);
  if (status === 'delivered') {
    order.deliveredAt = new Date();
    if (order.paymentMethod === 'cod') {
      order.paymentStatus = 'paid';
      order.paidAt = new Date();
    }
  }
  await order.save();
  res.json({ success: true, order });
});

