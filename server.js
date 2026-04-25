import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import expressLayouts from 'express-ejs-layouts';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

import pageRoutes from './routes/pageRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import { syncProducts } from './controllers/taagerController.js';
import { isAdminApi } from './middleware/auth.js';
import connectDB, { Product, Order } from './config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// ─── Connect to MongoDB (cached after first connect) ─────────────────────────
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (e) {
        console.error('[DB] Connection error:', e.message);
        res.status(500).send('Database connection failed: ' + e.message);
    }
});

// ─── Multer / Image Upload Setup ──────────────────────────────────────────────
let upload;
try {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    const cStorage = new CloudinaryStorage({
        cloudinary,
        params: { folder: 'talba-store', allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'] },
    });
    upload = multer({ storage: cStorage });
    console.log('[Upload] Cloudinary active');
} catch (e) {
    console.warn('[Upload] Cloudinary failed, falling back to disk:', e.message);
    const dStorage = multer.diskStorage({
        destination: (req, file, cb) => {
            const dir = path.join(__dirname, 'public/uploads');
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            cb(null, dir);
        },
        filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
    });
    upload = multer({ storage: dStorage });
}

// ─── Session ──────────────────────────────────────────────────────────────────
app.use(session({
    secret: process.env.SESSION_SECRET || 'talba-secret-2026',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ 
        mongoUrl: process.env.MONGODB_URI,
        collectionName: 'sessions',
        ttl: 24 * 60 * 60 // 1 day
    }),
    cookie: { maxAge: 24 * 60 * 60 * 1000, secure: process.env.VERCEL === '1', httpOnly: true }
}));

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(helmet({ contentSecurityPolicy: false }));
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// ─── EJS ──────────────────────────────────────────────────────────────────────
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main');

// ─── Page & Order Routes ──────────────────────────────────────────────────────
app.use('/', pageRoutes);
app.use('/api/orders', orderRoutes);

// ─── Public API: Get single product ──────────────────────────────────────────
app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findOne({ id: req.params.id }).lean();
        if (!product) return res.status(404).json({ error: 'Not found' });
        res.json(product);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── Sitemap ──────────────────────────────────────────────────────────────────
app.get('/sitemap.xml', async (req, res) => {
    try {
        const products = await Product.find({ inStock: true }, 'slug updatedAt').lean();
        const baseUrl = 'https://www.talba.store';
        
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
        
        // Static routes
        const staticRoutes = ['', '/shop', '/about', '/contact', '/shipping', '/returns'];
        staticRoutes.forEach(route => {
            xml += `  <url>\n    <loc>${baseUrl}${route}</loc>\n    <changefreq>daily</changefreq>\n    <priority>${route === '' ? '1.0' : '0.8'}</priority>\n  </url>\n`;
        });

        // Product routes
        products.forEach(p => {
            xml += `  <url>\n    <loc>${baseUrl}/product/${p.slug}</loc>\n    <lastmod>${new Date(p.updatedAt || Date.now()).toISOString().split('T')[0]}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
        });

        xml += `</urlset>`;
        
        res.header('Content-Type', 'application/xml');
        res.send(xml);
    } catch (e) {
        res.status(500).end();
    }
});

// ─── Admin: Stats & Orders ────────────────────────────────────────────────────
app.get('/api/admin/stats', isAdminApi, async (req, res) => {
    try {
        const [recentOrders, totalOrders, allOrders] = await Promise.all([
            Order.find().sort({ createdAt: -1 }).limit(50).lean(),
            Order.countDocuments(),
            Order.find({}, 'totalPrice').lean()
        ]);
        const totalSales = allOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
        res.json({ totalOrders, totalSales, recentOrders });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── Admin: Products CRUD ─────────────────────────────────────────────────────
app.get('/api/admin/products', isAdminApi, async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 }).lean();
        res.json(products);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/products', isAdminApi, async (req, res) => {
    try {
        const { name, category, price, oldPrice, description, seoTitle, seoDescription, images, taagerId } = req.body;
        const product = await Product.create({
            id: 'T' + Date.now().toString().slice(-6),
            name,
            slug: name.toLowerCase().replace(/ /g, '-').replace(/[^\u0621-\u064A0-9a-z-]/g, ''),
            category,
            price: parseFloat(price),
            oldPrice: oldPrice ? parseFloat(oldPrice) : null,
            description: description || '',
            seoTitle: seoTitle || '',
            seoDescription: seoDescription || '',
            inStock: true, featured: false,
            images: images?.length ? images : ['https://images.unsplash.com/photo-1585338107529-13afc5f0141f?auto=format&fit=crop&q=80&w=800'],
            specs: [],
            taagerId: taagerId ? parseInt(taagerId) : null
        });
        res.status(201).json(product);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/admin/products/:id', isAdminApi, async (req, res) => {
    try {
        const { name, category, price, oldPrice, description, seoTitle, seoDescription, images, taagerId } = req.body;
        const product = await Product.findOneAndUpdate(
            { id: req.params.id },
            { $set: {
                name, category,
                price: parseFloat(price),
                oldPrice: oldPrice ? parseFloat(oldPrice) : null,
                description, seoTitle, seoDescription,
                ...(images?.length && { images }),
                taagerId: taagerId ? parseInt(taagerId) : null
            }},
            { new: true }
        );
        if (!product) return res.status(404).json({ error: 'Not found' });
        res.json(product);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/admin/products/:id', isAdminApi, async (req, res) => {
    try {
        await Product.deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── Sync ─────────────────────────────────────────────────────────────────────
app.post('/api/sync', isAdminApi, syncProducts);

app.post('/api/admin/auto-scrape', isAdminApi, (req, res) => {
    res.json({ success: true, message: 'روبوت السحب غير متاح على Vercel - يرجى تشغيله محلياً.' });
});

// ─── Image Upload ─────────────────────────────────────────────────────────────
app.post('/api/admin/upload-images', isAdminApi, upload.array('images', 10), (req, res) => {
    try {
        const urls = req.files.map(f => f.path || `/uploads/${f.filename}`);
        res.json({ success: true, urls });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── Start / Export ───────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ Talba Store running on http://localhost:${PORT}`);
    });
}

export default app;
