import mongoose from 'mongoose';
import { slugify } from '../utils/helpers.js';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 60 },
    slug: { type: String, unique: true, index: true },
    description: { type: String, default: '', maxlength: 300 },
    image: { url: { type: String, default: '' }, publicId: { type: String, default: '' } },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

categorySchema.pre('validate', function () {
  if (this.isModified('name') || !this.slug) this.slug = slugify(this.name);
});

export default mongoose.model('Category', categorySchema);
