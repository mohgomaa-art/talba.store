import puppeteer from 'puppeteer';
import { runAutoAutomation } from './taagerScraper.js';

async function debug() {
    console.log('[Debug] Starting manual scrape test...');
    try {
        const browser = await puppeteer.launch({ 
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        const page = await browser.newPage();
        
        // Test a category
        const cat = 'https://taager.com/eg/categories/628e0e7a270f280014766126';
        console.log(`[Debug] Checking category: ${cat}`);
        await page.goto(cat, { waitUntil: 'networkidle2' });
        await page.screenshot({ path: 'debug_cat.png' });
        
        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a')).map(a => a.href).filter(href => href.includes('/products/'));
        });
        console.log(`[Debug] Found ${links.length} product links.`);
        
        if (links.length > 0) {
            console.log(`[Debug] Testing first link: ${links[0]}`);
            await page.goto(links[0], { waitUntil: 'networkidle2' });
            await page.screenshot({ path: 'debug_product.png' });
            
            const productData = await page.evaluate(() => {
                return {
                    h1: document.querySelector('h1')?.innerText,
                    price: document.querySelector('[class*="Price"]')?.innerText,
                    image: document.querySelector('img')?.src
                };
            });
            console.log('[Debug] Product Data found:', productData);
        }
        
        await browser.close();
        
        console.log('[Debug] Running full automation logic...');
        const count = await runAutoAutomation();
        console.log(`[Debug] Automation finished. Added ${count} products.`);
    } catch (e) {
        console.error('[Debug] FATAL ERROR:', e);
    }
}

debug();
