/**
 * migrate.js — Run ONCE to import existing JSON data into MongoDB Atlas.
 * Usage: node migrate.js
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import connectDB, { Product, Order } from './config/db.js';

async function migrate() {
  await connectDB();
  console.log('[Migrate] Connected to MongoDB');

  // ── Products ──────────────────────────────────────────────────────────────
  const productsPath = path.join(process.cwd(), 'data', 'products.json');
  if (fs.existsSync(productsPath)) {
    const products = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
    let inserted = 0;
    for (const p of products) {
      // Ensure unique slug by appending id if needed
      const slug = p.slug || p.name?.toLowerCase().replace(/ /g, '-').replace(/[^\u0621-\u064A0-9a-z-]/g, '') || p.id;
      const exists = await Product.findOne({ id: p.id });
      if (!exists) {
        await Product.create({ ...p, slug });
        inserted++;
      }
    }
    console.log(`[Migrate] Products: ${inserted} inserted (${products.length - inserted} already existed)`);
  } else {
    console.log('[Migrate] No products.json found, skipping.');
  }

  // ── Orders ────────────────────────────────────────────────────────────────
  const ordersPath = path.join(process.cwd(), 'data', 'orders.json');
  if (fs.existsSync(ordersPath)) {
    const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf-8'));
    let inserted = 0;
    for (const o of orders) {
      const exists = await Order.findOne({ id: o.id });
      if (!exists) {
        await Order.create(o);
        inserted++;
      }
    }
    console.log(`[Migrate] Orders: ${inserted} inserted (${orders.length - inserted} already existed)`);
  } else {
    console.log('[Migrate] No orders.json found, skipping.');
  }

  console.log('[Migrate] ✅ Done!');
  process.exit(0);
}

migrate().catch(e => {
  console.error('[Migrate] ❌ Failed:', e.message);
  process.exit(1);
});
