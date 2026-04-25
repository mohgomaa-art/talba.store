import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();
puppeteer.use(StealthPlugin());

const CATS = [
  'https://taager.com/eg/products/category/244',
  'https://taager.com/eg/products/category/245', 
  'https://taager.com/eg/products/category/242',
  'https://taager.com/eg/products/category/243',
  'https://taager.com/eg/products/category/241',
  'https://taager.com/eg/products/category/246',
  'https://taager.com/eg/products/category/247',
  'https://taager.com/eg/products/category/248',
  'https://taager.com/eg/products/category/249',
  'https://taager.com/eg/products/category/250',
];

async function run() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1920, height: 1080 });

  // Login
  console.log('[Login] Going to login page...');
  await page.goto('https://taager.com/eg/login', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 5000));
  
  try {
    await page.waitForSelector('input[type="tel"]', { timeout: 15000 });
    await page.click('input[type="tel"]');
    await page.type('input[type="tel"]', process.env.TAAGER_PHONE || '201011384083', { delay: 80 });
    await page.waitForSelector('input[type="password"]', { timeout: 5000 });
    await page.click('input[type="password"]');
    await page.type('input[type="password"]', process.env.TAAGER_PASS || 'Qwer246810*', { delay: 80 });
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.innerText.includes('تسجيل الدخول'));
      if (b) b.click();
    });
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    console.log('[Login] Success!');
  } catch (e) {
    console.log('[Login] Failed:', e.message, '- continuing anyway');
  }

  const allProducts = [];
  
  for (const catUrl of CATS) {
    console.log(`[Cat] ${catUrl}`);
    try {
      await page.goto(catUrl, { waitUntil: 'networkidle2', timeout: 20000 });
      await new Promise(r => setTimeout(r, 3000));
      
      // Scroll to load all products
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollBy(0, 800));
        await new Promise(r => setTimeout(r, 1000));
      }

      // Extract product links
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href*="/products/"]'))
          .map(a => a.href)
          .filter(h => /\/products\/\d+/.test(h))
          .filter((v, i, a) => a.indexOf(v) === i);
      });
      
      console.log(`  Found ${links.length} product links`);

      // Visit each product (max 15 per category)
      for (const link of links.slice(0, 15)) {
        try {
          await page.goto(link, { waitUntil: 'networkidle2', timeout: 15000 });
          await new Promise(r => setTimeout(r, 2000));

          const data = await page.evaluate(() => {
            const name = document.querySelector('h1')?.innerText?.trim() || '';
            const priceEl = document.querySelector('[class*="rice"]');
            const price = parseInt(priceEl?.innerText?.replace(/[^\d]/g, '') || '0');
            const imgs = Array.from(document.querySelectorAll('img[src*="media.taager.com"]'))
              .map(i => i.src)
              .filter((v, i, a) => a.indexOf(v) === i);
            const desc = document.querySelector('[class*="escription"]')?.innerText?.trim() || 
                         document.querySelector('p')?.innerText?.trim() || '';
            return { name, price, imgs, desc };
          });

          if (data.name && data.imgs.length > 0 && data.price > 0) {
            allProducts.push({
              name: data.name,
              price: data.price,
              images: data.imgs,
              description: data.desc,
              url: link
            });
            console.log(`  ✅ ${data.name} (${data.price} EGP, ${data.imgs.length} imgs)`);
          }
        } catch (e) {
          // skip
        }
      }
    } catch (e) {
      console.log(`  ❌ Category error: ${e.message}`);
    }
  }

  await browser.close();
  
  // Save results
  fs.writeFileSync('scraped_products.json', JSON.stringify(allProducts, null, 2));
  console.log(`\n✅ Total scraped: ${allProducts.length} products`);
  console.log('Saved to scraped_products.json');
}

run().catch(e => console.error('Fatal:', e.message));
