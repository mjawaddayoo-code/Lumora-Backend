import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Review from '../models/Review.js';
import Cart from '../models/Cart.js';

const reset = process.argv.includes('--reset');

// Generic SAMPLE catalogue - replace with your own products in Admin. Products ship WITHOUT images: upload real photos from Admin > Products (Cloudinary).
const catalogue = {
  'Fashion & Accessories': ['Everyday style essentials.', [
    ['Classic Leather Wallet', 1800, 2200, 40, 'Lumora', true],
    ['Canvas Tote Bag', 1200, 0, 55, 'Lumora', false],
    ['Minimal Analog Watch', 3500, 4200, 25, 'Lumora', true],
  ]],
  'Home & Kitchen': ['Useful pieces for every room.', [
    ['Ceramic Mug Set (4 pcs)', 1650, 1950, 60, 'Lumora', true],
    ['Stainless Steel Water Bottle', 1400, 0, 80, 'Lumora', false],
    ['Cotton Throw Blanket', 2600, 0, 30, 'Lumora', false],
  ]],
  'Electronics': ['Smart accessories and gadgets.', [
    ['Wireless Earbuds', 4200, 5000, 35, 'Lumora', true],
    ['Fast Charging Cable 1m', 650, 0, 120, 'Lumora', false],
    ['Portable Power Bank 10000mAh', 3300, 3800, 45, 'Lumora', false],
  ]],
  'Gifts': ['Thoughtful gifts for any occasion.', [
    ['Gift Box - Small', 1500, 0, 50, 'Lumora', false],
    ['Personalised Notebook', 900, 1100, 70, 'Lumora', true],
  ]],
};

await mongoose.connect(process.env.MONGO_URI);

if (reset) {
  await Promise.all([Product.deleteMany(), Category.deleteMany(), Order.deleteMany(), Review.deleteMany(), Cart.deleteMany()]);
  console.log('Catalogue, orders, reviews and carts cleared.');
}

const email = (process.env.ADMIN_EMAIL || 'admin@lumora.test').toLowerCase();
if (!(await User.findOne({ email }))) {
  await User.create({ name: process.env.ADMIN_NAME || 'Store Admin', email, password: process.env.ADMIN_PASSWORD || 'ChangeMe123!', role: 'admin' });
  console.log(`Admin created: ${email}`);
} else console.log(`Admin exists: ${email}`);

if ((await Product.countDocuments()) === 0) {
  for (const [name, [description, products]] of Object.entries(catalogue)) {
    const cat = (await Category.findOne({ name })) || (await Category.create({ name, description }));
    for (const [pname, price, comparePrice, stock, brand, featured] of products) {
      await Product.create({
        name: pname, price, comparePrice, stock, brand, featured, category: cat._id,
        description: `${pname} by ${brand}. ${description} Authentic, carefully sourced and packed to order.`,
        tags: [name.toLowerCase(), brand.toLowerCase()],
      });
    }
  }
  console.log('Sample categories and products created (replace them in Admin > Products).');
} else console.log('Products already exist; skipping sample catalogue (use `npm run seed:reset` to rebuild).');

await mongoose.disconnect();
