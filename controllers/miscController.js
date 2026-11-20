import Message from '../models/Message.js';
import Order from '../models/Order.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { storeConfig } from '../utils/helpers.js';
import { getMethods, createIntent, verifyIntent } from '../services/payment.js';

export const config = (_req, res) => res.json({ success: true, config: storeConfig(), paymentMethods: getMethods() });

export const contact = asyncHandler(async (req, res) => {
  await Message.create({ name: req.body.name, email: req.body.email, subject: req.body.subject, message: req.body.message });
  res.status(201).json({ success: true, message: 'Thanks! We received your message and will reply by email.' });
});

const ownOrder = async (req) => {
  const order = await Order.findOne({ _id: req.params.orderId, user: req.user._id });
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.paymentMethod !== 'card') throw new ApiError(400, 'This order is not a card order');
  return order;
};

export const paymentIntent = asyncHandler(async (req, res) => {
  const order = await ownOrder(req);
  if (order.paymentStatus === 'paid') throw new ApiError(400, 'Order is already paid');
  const { clientSecret, paymentRef } = await createIntent(order, storeConfig().currency);
  order.paymentRef = paymentRef;
  await order.save();
  res.json({ success: true, clientSecret });
});

export const confirmPayment = asyncHandler(async (req, res) => {
  const order = await ownOrder(req);
  if (!order.paymentRef) throw new ApiError(400, 'No payment started for this order');
  if (!(await verifyIntent(order.paymentRef))) throw new ApiError(402, 'Payment has not been completed');
  order.paymentStatus = 'paid';
  order.paidAt = new Date();
  await order.save();
  res.json({ success: true, order });
});
