import ApiError from '../utils/ApiError.js';

/**
 * Payment interface. COD is always available. Card payments are only enabled when a real
 * gateway is configured (PAYMENT_GATEWAY=stripe + STRIPE_SECRET_KEY + `npm i stripe`).
 * Nothing is ever marked "paid" without gateway confirmation.
 */
const cardConfigured = () => process.env.PAYMENT_GATEWAY === 'stripe' && !!process.env.STRIPE_SECRET_KEY;

export const getMethods = () => [
  { id: 'cod', label: 'Cash on Delivery', enabled: true },
  {
    id: 'card',
    label: 'Credit / Debit Card',
    enabled: cardConfigured(),
    reason: cardConfigured() ? '' : 'Card payments are not configured for this store yet.',
  },
];

export const isMethodEnabled = (id) => getMethods().some((m) => m.id === id && m.enabled);

const stripeClient = async () => {
  if (!cardConfigured()) throw new ApiError(501, 'Card payments are not configured');
  try {
    const { default: Stripe } = await import('stripe');
    return new Stripe(process.env.STRIPE_SECRET_KEY);
  } catch {
    throw new ApiError(501, 'Stripe SDK not installed. Run `npm i stripe` in /server');
  }
};

// Creates a gateway payment intent for an existing order. Returns a client secret for the frontend.
export const createIntent = async (order, currency) => {
  const stripe = await stripeClient();
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(order.totalPrice * 100),
    currency: currency.toLowerCase(),
    metadata: { orderId: String(order._id), orderNumber: order.orderNumber },
  });
  return { clientSecret: intent.client_secret, paymentRef: intent.id };
};

// Verifies with the gateway that the intent actually succeeded.
export const verifyIntent = async (paymentRef) => {
  const stripe = await stripeClient();
  const intent = await stripe.paymentIntents.retrieve(paymentRef);
  return intent.status === 'succeeded';
};
