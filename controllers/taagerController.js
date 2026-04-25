import { Product, Category } from '../config/db.js';
import * as taager from '../services/taagerService.js';

/**
 * Manual sync trigger from admin
 */
export const syncProducts = async (req, res) => {
  try {
    console.log('[Sync] Starting Taager product sync...');
    const taagerProducts = await taager.fetchAllProducts();
    
    let count = 0;
    for (const tp of taagerProducts) {
      const mapped = taager.mapTaagerProduct(tp);
      
      // Update or Create
      await Product.updateOne(
        { taagerId: mapped.taagerId },
        mapped,
        { upsert: true }
      );
      count++;
    }

    // Also sync categories
    const taagerCats = await taager.getCategories();
    for (const tc of taagerCats) {
      await Category.updateOne(
        { name: tc.name },
        { name: tc.name, nameEn: tc.nameEn, isActive: true },
        { upsert: true }
      );
    }

    res.json({ success: true, count });
  } catch (e) {
    console.error('[Sync] Failed:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
};
