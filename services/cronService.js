import cron from 'node-cron';
import { syncProducts } from '../controllers/taagerController.js';
import { runAutoAutomation } from '../taagerScraper.js';

/**
 * Scheduled tasks for EKIEI
 */
export const startCronJobs = () => {
    // API Sync - Every 24 hours at 3 AM
    cron.schedule('0 3 * * *', async () => {
        console.log('[Cron] Starting daily Taager API sync...');
        try {
            await syncProducts({}, { json: (data) => console.log('[Cron] Sync result:', data) });
        } catch (e) {
            console.error('[Cron] Sync failed:', e.message);
        }
    });

    // Full Scraping Automation - Every 24 hours at 4 AM
    cron.schedule('0 4 * * *', async () => {
        console.log('[Cron] Starting full scraping automation...');
        try {
            await runAutoAutomation();
        } catch (e) {
            console.error('[Cron] Scraping failed:', e.message);
        }
    });

    console.log('[Cron] Scheduled: daily API sync (3 AM) and Full Scraping (4 AM)');
};

