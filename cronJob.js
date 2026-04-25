/**
 * Cron Jobs — scheduled tasks
 */
import cron from 'node-cron';
import { syncProducts } from './taagerProductSync.js';

export function startCronJobs() {
  // Sync products every 24 hours at 3 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('[Cron] Running daily product sync...');
    try {
      const result = await syncProducts();
      console.log('[Cron] Sync complete:', result);
    } catch (err) {
      console.error('[Cron] Sync failed:', err.message);
    }
  });

  console.log('[Cron] Scheduled: daily product sync at 3:00 AM');
}
