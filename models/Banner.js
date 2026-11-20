import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema(
  {
    tag: { type: String, trim: true, maxlength: 40, default: '' },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    text: { type: String, trim: true, maxlength: 240, default: '' },
    image: { url: { type: String, default: '' }, publicId: { type: String, default: '' } },
    ctaText: { type: String, trim: true, maxlength: 30, default: 'Shop now' },
    ctaLink: { type: String, trim: true, default: '/shop' },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Banner', bannerSchema);
