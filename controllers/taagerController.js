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
    const msg = e.message.includes('401') || e.message.includes('Unauthorized')
        ? 'تم رفض الاتصال من سيرفر تاجر (401). تأكد من صحة بيانات الدخول أو أن تاجر لا يمنع الاتصال.'
        : `فشلت المزامنة: ${e.message}`;
    res.status(400).json({ success: false, error: msg });
  }
};
