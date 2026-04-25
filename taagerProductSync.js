/**
 * Taager Product Sync — fetches products from Taager and saves to local DB
 */
import { fetchAllProducts, mapTaagerProduct } from './taagerService.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTS_FILE = path.join(__dirname, 'data', 'products.json');

async function readLocal() {
  try { return JSON.parse(await fs.readFile(PRODUCTS_FILE, 'utf-8')); }
  catch { return []; }
}

async function writeLocal(products) {
  await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));
}

export async function syncProducts() {
  console.log('[Sync] Starting Taager product sync...');
  try {
    const taagerProducts = await fetchAllProducts();
    console.log(`[Sync] Fetched ${taagerProducts.length} products from Taager`);

    const local = await readLocal();
    // Keep products that were added manually (no taagerId)
    const manualProducts = local.filter(p => !p.taagerId);

    // Map and merge Taager products
    const mapped = taagerProducts
      .filter(tp => tp.isAvailable !== false)
      .map(tp => {
        const existing = local.find(p => p.taagerId === (tp._id || tp.id));
        const m = mapTaagerProduct(tp);
        if (existing) {
          // Preserve local overrides (featured, custom slug, etc)
          m.id = existing.id;
          m.slug = existing.slug;
          m.featured = existing.featured;
        }
        return m;
      });

    const final = [...manualProducts, ...mapped];
    await writeLocal(final);
    console.log(`[Sync] Saved ${final.length} products (${manualProducts.length} manual + ${mapped.length} from Taager)`);
    return { total: final.length, fromTaager: mapped.length, manual: manualProducts.length };
  } catch (err) {
    console.error('[Sync] Failed:', err.message);
    throw err;
  }
}
