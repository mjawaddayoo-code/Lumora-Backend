import jwt from 'jsonwebtoken';

export const slugify = (s = '') =>
  s.toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'item';

export const pick = (obj = {}, keys = []) =>
  keys.reduce((acc, k) => (obj[k] !== undefined ? { ...acc, [k]: obj[k] } : acc), {});

export const escapeRegex = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

export const storeConfig = () => ({
  currency: process.env.CURRENCY || 'PKR',
  deliveryFee: Number(process.env.DELIVERY_FEE ?? 250),
  freeShippingThreshold: Number(process.env.FREE_SHIPPING_THRESHOLD ?? 0),
});

export const computeShipping = (itemsPrice) => {
  const { deliveryFee, freeShippingThreshold } = storeConfig();
  if (itemsPrice <= 0) return 0;
  return freeShippingThreshold > 0 && itemsPrice >= freeShippingThreshold ? 0 : deliveryFee;
};

export const toArray = (v) =>
  Array.isArray(v) ? v : typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : [];
