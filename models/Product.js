import mongoose from 'mongoose';
import { slugify } from '../utils/helpers.js';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, unique: true, index: true },
    description: { type: String, required: true, maxlength: 4000 },
    price: { type: Number, required: true, min: 0 },
    comparePrice: { type: Number, min: 0, default: 0 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    images: [{ url: { type: String, required: true }, publicId: { type: String, default: '' }, _id: false }],
    stock: { type: Number, required: true, min: 0, default: 0 },
    sku: { type: String, trim: true, default: '' },
    brand: { type: String, trim: true, default: '' },
    tags: [{ type: String, trim: true }],
    featured: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    ratingAvg: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    sold: { type: Number, default: 0 },
  },
  { timestamps: true }
);

productSchema.pre('validate', function () {
  if (!this.slug) this.slug = `${slugify(this.name)}-${Math.random().toString(36).slice(2, 7)}`;
});

export default mongoose.model('Product', productSchema);
