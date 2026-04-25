/**
 * seed.js — Seeds MongoDB using the data from products.json using
 * a direct connection string (bypasses SRV DNS issues on local machines)
 * 
 * Run: node seed.js
 */
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dns from 'dns';
import 'dotenv/config';

// Force using Google DNS to bypass ISP DNS issues with MongoDB SRV
dns.setServers(['8.8.8.8', '8.8.4.4']);

const URI = process.env.MONGODB_URI;

async function seed() {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      family: 4,
    });
    console.log('[Seed] Connected!');

    const productSchema = new mongoose.Schema({}, { strict: false });
    const orderSchema = new mongoose.Schema({}, { strict: false });
    const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
    const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

    // Import Products
    const productsPath = path.join(process.cwd(), 'data', 'products.json');
    if (fs.existsSync(productsPath)) {
      const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
      let inserted = 0;
      for (const p of products) {
        await Product.findOneAndUpdate({ id: p.id }, p, { upsert: true, new: true });
        inserted++;
      }
      console.log(`[Seed] ✅ Products: ${inserted} upserted`);
    }

    // Import Orders
    const ordersPath = path.join(process.cwd(), 'data', 'orders.json');
    if (fs.existsSync(ordersPath)) {
      const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf-8'));
      let inserted = 0;
      for (const o of orders) {
        await Order.findOneAndUpdate({ id: o.id }, o, { upsert: true, new: true });
        inserted++;
      }
      console.log(`[Seed] ✅ Orders: ${inserted} upserted`);
    }

    await mongoose.disconnect();
    console.log('[Seed] 🎉 Done!');
    process.exit(0);
  } catch (e) {
    console.error('[Seed] ❌ Error:', e.message);
    process.exit(1);
  }
}

seed();
