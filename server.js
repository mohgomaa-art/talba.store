import express from 'express';
import path from 'path';
import expressLayouts from 'express-ejs-layouts';
import 'dotenv/config';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

import pageRoutes from './routes/pageRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import { syncProducts } from './controllers/taagerController.js';
import { isAdminApi } from './middleware/auth.js';
import connectDB, { Product, Order } from './config/db.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Connect to MongoDB (runs before every request, cached after first time) ──
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (e) {
        console.error('[DB] Connection error:', e.message);
        res.status(500).json({ error: 'Database connection failed' });
    }
});

// ─── Cloudinary Setup ─────────────────────────────────────────────────────────
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const cloudinaryStorage = new CloudinaryStorage({
    cloudinary,
    params: { folder: 'talba-store', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'] },
});
const upload = multer({ storage: cloudinaryStorage });

// ─── Session ──────────────────────────────────────────────────────────────────
app.use(session({
    secret: process.env.SESSION_SECRET || 'talba-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(helmet({ contentSecurityPolicy: false }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', limiter);

// ─── EJS Setup ────────────────────────────────────────────────────────────────
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('layout', './layouts/main');

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/', pageRoutes);
app.use('/api/orders', orderRoutes);

// ─── Public API ───────────────────────────────────────────────────────────────
app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findOne({ id: req.params.id }).lean();
        if (!product) return res.status(404).json({ error: 'Not found' });
        res.json(product);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── Admin Stats ──────────────────────────────────────────────────────────────
app.get('/api/admin/stats', isAdminApi, async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 }).limit(50).lean();
        const totalOrders = await Order.countDocuments();
        const allOrders = await Order.find().lean();
        const totalSales = allOrders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
        res.json({ totalOrders, totalSales, recentOrders: orders });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── Admin Products ───────────────────────────────────────────────────────────
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
        const id = 'T' + Date.now().toString().slice(-6);
        const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\u0621-\u064A0-9a-z-]/g, '');
        const product = await Product.create({
            id, name, slug, category,
            price: parseFloat(price),
            oldPrice: oldPrice ? parseFloat(oldPrice) : null,
            description: description || '',
            seoTitle: seoTitle || '',
            seoDescription: seoDescription || '',
            inStock: true,
            featured: false,
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
            {
                $set: {
                    ...(name && { name }),
                    ...(category && { category }),
                    ...(price && { price: parseFloat(price) }),
                    ...(oldPrice !== undefined && { oldPrice: oldPrice ? parseFloat(oldPrice) : null }),
                    ...(description !== undefined && { description }),
                    ...(seoTitle !== undefined && { seoTitle }),
                    ...(seoDescription !== undefined && { seoDescription }),
                    ...(images?.length && { images }),
                    ...(taagerId !== undefined && { taagerId: taagerId ? parseInt(taagerId) : null }),
                }
            },
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

// ─── Sync & Scrape ────────────────────────────────────────────────────────────
app.post('/api/sync', isAdminApi, syncProducts);

app.post('/api/admin/auto-scrape', isAdminApi, async (req, res) => {
    try {
        const { spawn } = await import('child_process');
        const child = spawn('node', ['taagerScraper.js', '--auto'], { detached: true, stdio: 'ignore' });
        child.unref();
        res.json({ success: true, message: 'تم تشغيل روبوت السحب في الخلفية بنجاح! سيتم إضافة المنتجات تلقائياً خلال بضع دقائق.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── Image Upload (Cloudinary) ────────────────────────────────────────────────
app.post('/api/admin/upload-images', isAdminApi, upload.array('images', 10), (req, res) => {
    try {
        const urls = req.files.map(f => f.path); // Cloudinary returns full URL in f.path
        res.json({ success: true, urls });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Talba Store Server running on http://localhost:${PORT}`);
});
