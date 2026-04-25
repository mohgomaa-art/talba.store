import mongoose from 'mongoose';

// ─── MongoDB Connection ────────────────────────────────────────────────────────
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[DB] MongoDB connected successfully');
  } catch (e) {
    console.error('[DB] MongoDB connection failed:', e.message);
    process.exit(1);
  }
};

// ─── Product Schema ───────────────────────────────────────────────────────────
const productSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  name: { type: String, required: true },
  slug: { type: String, unique: true },
  description: String,
  price: Number,
  oldPrice: Number,
  category: String,
  inStock: { type: Boolean, default: true },
  featured: { type: Boolean, default: false },
  images: [String],
  specs: [{ key: String, value: String }],
  seoTitle: String,
  seoDescription: String,
  taagerId: Number,
  taagerData: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

// ─── Order Schema ─────────────────────────────────────────────────────────────
const orderSchema = new mongoose.Schema({
  id: String,
  customer: {
    name: String,
    phone: String,
    phone2: String,
    governorate: String,
    city: String,
    address: String,
  },
  products: [mongoose.Schema.Types.Mixed],
  totalPrice: Number,
  paymentMethod: String,
  notes: String,
  status: { type: String, default: 'pending' },
  taagerOrderId: String,
}, { timestamps: true });

// ─── Settings Schema ──────────────────────────────────────────────────────────
const settingsSchema = new mongoose.Schema({
  key: { type: String, unique: true },
  value: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

// ─── Export Models ────────────────────────────────────────────────────────────
export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
export const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
export default connectDB;
