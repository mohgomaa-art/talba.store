import connectDB, { Product } from '../config/db.js';
import * as taager from '../services/taagerService.js';

/**
 * Manual sync trigger from admin
 */
export const syncProducts = async (req, res) => {
  try {
    await connectDB();
    console.log('[Sync] Starting Taager product sync...');
    const taagerProducts = await taager.fetchAllProducts();

    let count = 0;
    for (const tp of taagerProducts) {
      const mapped = taager.mapTaagerProduct(tp);
      await Product.findOneAndUpdate(
        { taagerId: mapped.taagerId },
        { $set: mapped },
        { upsert: true, new: true }
      );
      count++;
    }

    res.json({ success: true, count });
  } catch (e) {
    console.error('[Sync] Failed:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
};
