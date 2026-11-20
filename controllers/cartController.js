import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { computeShipping } from '../utils/helpers.js';

const load = async (userId) => {
  const cart = await Cart.findOne({ user: userId }).populate('items.product', 'name slug price images stock isActive');
  const items = (cart?.items || []).filter((i) => i.product && i.product.isActive).map((i) => ({ product: i.product, qty: i.qty }));
  const itemsPrice = items.reduce((s, i) => s + i.product.price * i.qty, 0);
  const shippingPrice = computeShipping(itemsPrice);
  return { items, itemsPrice, shippingPrice, totalPrice: itemsPrice + shippingPrice, count: items.reduce((s, i) => s + i.qty, 0) };
};
const reply = async (req, res) => res.json({ success: true, cart: await load(req.user._id) });
const getCart = (userId) => Cart.findOneAndUpdate({ user: userId }, { $setOnInsert: { user: userId } }, { upsert: true, new: true });

const checkStock = async (productId, qty) => {
  const p = await Product.findById(productId);
  if (!p || !p.isActive) throw new ApiError(404, 'Product not found');
  if (p.stock < 1) throw new ApiError(400, `"${p.name}" is out of stock`);
  if (qty > p.stock) throw new ApiError(400, `Only ${p.stock} of "${p.name}" available`);
};

export const getMyCart = asyncHandler(reply);

export const addItem = asyncHandler(async (req, res) => {
  const { productId, qty = 1 } = req.body;
  const cart = await getCart(req.user._id);
  const existing = cart.items.find((i) => String(i.product) === String(productId));
  const next = (existing?.qty || 0) + Number(qty);
  await checkStock(productId, next);
  if (existing) existing.qty = next;
  else cart.items.push({ product: productId, qty: next });
  await cart.save();
  await reply(req, res);
});

export const setQty = asyncHandler(async (req, res) => {
  const qty = Number(req.body.qty);
  const cart = await getCart(req.user._id);
  const item = cart.items.find((i) => String(i.product) === req.params.productId);
  if (!item) throw new ApiError(404, 'Item not in cart');
  if (qty < 1) cart.items = cart.items.filter((i) => i !== item);
  else {
    await checkStock(req.params.productId, qty);
    item.qty = qty;
  }
  await cart.save();
  await reply(req, res);
});

export const removeItem = asyncHandler(async (req, res) => {
  await Cart.updateOne({ user: req.user._id }, { $pull: { items: { product: req.params.productId } } });
  await reply(req, res);
});

export const clearCart = asyncHandler(async (req, res) => {
  await Cart.updateOne({ user: req.user._id }, { $set: { items: [] } });
  await reply(req, res);
});
