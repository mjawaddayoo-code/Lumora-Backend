import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 100, default: '' },
    comment: { type: String, required: true, trim: true, maxlength: 1500 },
    verifiedPurchase: { type: Boolean, default: false },
  },
  { timestamps: true }
);
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

reviewSchema.statics.recalc = async function (productId) {
  const [agg] = await this.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(String(productId)) } },
    { $group: { _id: '$product', avg: { $avg: '$rating' }, n: { $sum: 1 } } },
  ]);
  await mongoose.model('Product').findByIdAndUpdate(productId, {
    ratingAvg: agg ? Math.round(agg.avg * 10) / 10 : 0,
    numReviews: agg ? agg.n : 0,
  });
};

export default mongoose.model('Review', reviewSchema);
