import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTS_FILE = path.join(__dirname, 'data', 'products.json');

/**
 * Taager Scraper Tool - Automated Version
 */

async function loginToTaager(page) {
    console.log('[Scraper] Logging in to Taager...');
    try {
        await page.goto('https://taager.com/eg/login', { waitUntil: 'networkidle2' });
        
        // Wait for page to be ready
        await new Promise(r => setTimeout(r, 5000));
        
        // Wait for phone input - use more generic selector
        await page.waitForSelector('input[type="tel"]', { timeout: 30000 });
        await page.click('input[type="tel"]');
        await page.type('input[type="tel"]', process.env.TAAGER_PHONE || '201011384083', { delay: 100 });
        
        // Wait for password input
        await page.waitForSelector('input[type="password"]', { timeout: 10000 });
        await page.click('input[type="password"]');
        await page.type('input[type="password"]', process.env.TAAGER_PASS || 'Qwer246810*', { delay: 100 });
        
        // Click login button - find by text if ID fails
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const loginBtn = btns.find(b => b.innerText.includes('تسجيل الدخول') || b.id === 'phone-login-submit-btn');
            if (loginBtn) loginBtn.click();
        });
        
        // Wait for successful login (redirect to home or profile)
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
        console.log('[Scraper] Login successful.');
        return true;
    } catch (err) {
        console.error('[Scraper] Login failed:', err.message);
        return false;
    }
}

async function scrapeProduct(url) {
    console.log(`[Scraper] Visiting: ${url}`);
    const browser = await puppeteer.launch({ 
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForSelector('h1', { timeout: 10000 });

        const data = await page.evaluate(() => {
            const name = document.querySelector('h1')?.innerText || '';
            const price = document.querySelector('[class*="Price"]')?.innerText?.replace(/[^\d]/g, '') || '0';
            const description = document.querySelector('[class*="Description"]')?.innerText || '';
            const sku = document.querySelector('[class*="Sku"]')?.innerText?.replace('SKU:', '').trim() || '';
            const images = Array.from(document.querySelectorAll('img')).map(img => img.src).filter(src => src.includes('taager') || src.includes('cloudinary')).filter((v, i, a) => a.indexOf(v) === i);
            const specs = Array.from(document.querySelectorAll('ul li, table tr')).map(el => {
                const text = el.innerText;
                if (text.includes(':')) {
                    const [key, value] = text.split(':');
                    return { key: key.trim(), value: value.trim() };
                }
                return null;
            }).filter(Boolean);

            return { name, price: parseInt(price), description, images, sku, specs };
        });

        await browser.close();

        return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            name: data.name,
            slug: data.name.toLowerCase().replace(/ /g, '-').replace(/[^\u0621-\u064A0-9a-z-]/g, ''),
            description: data.description,
            price: data.price,
            oldPrice: Math.round(data.price * 1.2),
            category: "عام",
            images: data.images.length > 0 ? data.images : ["https://images.unsplash.com/photo-1585338107529-13afc5f0141f?auto=format&fit=crop&q=80&w=800"],
            inStock: true,
            featured: false,
            specs: data.specs,
            seoTitle: `${data.name} | Talba Store`,
            seoDescription: data.description.slice(0, 160),
            taagerData: { sku: data.sku },
            createdAt: new Date().toISOString()
        };
    } catch (err) {
        console.error(`[Scraper] Error:`, err.message);
        await browser.close();
        return null;
    }
}

async function discoverProducts(categoryUrl) {
    console.log(`[Scraper] Discovering products in: ${categoryUrl}`);
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    try {
        await page.goto(categoryUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.evaluate(async () => {
            await new Promise(resolve => {
                let totalHeight = 0;
                let timer = setInterval(() => {
                    window.scrollBy(0, 100);
                    totalHeight += 100;
                    if(totalHeight >= 3000) { clearInterval(timer); resolve(); }
                }, 100);
            });
        });

        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a')).map(a => a.href).filter(href => href.includes('/products/')).filter((v, i, a) => a.indexOf(v) === i);
        });

        await browser.close();
        return links;
    } catch (err) {
        console.error('[Scraper] Discovery failed:', err.message);
        await browser.close();
        return [];
    }
}

export async function runAutoAutomation() {
    const browser = await puppeteer.launch({ 
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    const loggedIn = await loginToTaager(page);
    if (!loggedIn) {
        await browser.close();
        return 0;
    }

    const categories = [
        'https://taager.com/eg/products/category/244', // Kitchen Tools (أدوات المطبخ)
        'https://taager.com/eg/products/category/245', // Accessories/Others (likely next ID)
    ];

    let count = 0;
    for (const cat of categories) {
        console.log(`[Scraper] Discovering products in: ${cat}`);
        try {
            await page.goto(cat, { waitUntil: 'networkidle2', timeout: 60000 });
            
            // Scroll to load products
            await page.evaluate(async () => {
                await new Promise(resolve => {
                    let totalHeight = 0;
                    let timer = setInterval(() => {
                        window.scrollBy(0, 100);
                        totalHeight += 100;
                        if(totalHeight >= 2000) { clearInterval(timer); resolve(); }
                    }, 100);
                });
            });

            const productLinks = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('a'))
                    .map(a => a.href)
                    .filter(href => href.includes('/products/'))
                    .filter((v, i, a) => a.indexOf(v) === i);
            });

            for (const link of productLinks.slice(0, 5)) {
                console.log(`[Scraper] Visiting product: ${link}`);
                await page.goto(link, { waitUntil: 'networkidle2', timeout: 60000 });
                
                const data = await page.evaluate(() => {
                    const name = document.querySelector('h1')?.innerText || '';
                    const price = document.querySelector('[class*="Price"]')?.innerText?.replace(/[^\d]/g, '') || '0';
                    const description = document.querySelector('[class*="Description"]')?.innerText || '';
                    const sku = document.querySelector('[class*="Sku"]')?.innerText?.replace('SKU:', '').trim() || '';
                    const images = Array.from(document.querySelectorAll('img'))
                        .map(img => img.src)
                        .filter(src => src.includes('taager') || src.includes('cloudinary'))
                        .filter((v, i, a) => a.indexOf(v) === i);
                    
                    return { name, price: parseInt(price), description, images, sku };
                });

                if (data.name) {
                    const products = JSON.parse(await fs.readFile(PRODUCTS_FILE, 'utf-8').catch(() => '[]'));
                    if (!products.find(p => p.name === data.name)) {
                        products.push({
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                            name: data.name,
                            slug: data.name.toLowerCase().replace(/ /g, '-').replace(/[^\u0621-\u064A0-9a-z-]/g, ''),
                            description: data.description,
                            price: data.price,
                            oldPrice: Math.round(data.price * 1.2),
                            category: "عام",
                            images: data.images.length > 0 ? data.images : ["https://images.unsplash.com/photo-1585338107529-13afc5f0141f?auto=format&fit=crop&q=80&w=800"],
                            inStock: true,
                            featured: false,
                            seoTitle: `${data.name} | Talba Store`,
                            seoDescription: data.description.slice(0, 160),
                            taagerData: { sku: data.sku },
                            taagerId: parseInt(link.split('/').pop()) || null,
                            createdAt: new Date().toISOString()
                        });
                        await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));
                        console.log(`[Automation] Added: ${data.name}`);
                        count++;
                    }
                }
            }
        } catch (err) {
            console.error(`[Scraper] Error in category ${cat}:`, err.message);
        }
    }

    await browser.close();
    return count;
}

async function main() {
    const args = process.argv.slice(2);
    if (args[0] === '--auto') {
        await runAutoAutomation();
    } else if (args.length > 0) {
        for (const url of args) {
            const p = await scrapeProduct(url);
            if (p) {
                const localData = JSON.parse(await fs.readFile(PRODUCTS_FILE, 'utf-8').catch(() => '[]'));
                localData.push(p);
                await fs.writeFile(PRODUCTS_FILE, JSON.stringify(localData, null, 2));
            }
        }
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
}

