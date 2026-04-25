import express from 'express';
import path from 'path';
import expressLayouts from 'express-ejs-layouts';
import 'dotenv/config';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import multer from 'multer';
import fs from 'fs';

import pageRoutes from './routes/pageRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import { syncProducts } from './controllers/taagerController.js';
import * as productCtrl from './controllers/productController.js';
import { isAdminApi } from './middleware/auth.js';

import { startCronJobs } from './services/cronService.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Cron
startCronJobs();

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'ekiei-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Security (Allowing some Unsplash/Google fonts images)
app.use(helmet({
  contentSecurityPolicy: false,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// Multer Setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'public/uploads/';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname))
    }
});
const upload = multer({ storage: storage });

// EJS Setup
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('layout', './layouts/main');

// Routes
app.use('/', pageRoutes);
app.use('/api/orders', orderRoutes);

// Public API Endpoints
app.get('/api/products/:id', async (req, res) => {
    const { Product } = await import('./config/db.js');
    const products = await Product.read();
    const product = products.find(p => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json(product);
});

// Protected Admin API Endpoints
app.get('/api/admin/stats', isAdminApi, async (req, res) => {
    const { Order } = await import('./config/db.js');
    const orders = await Order.read();
    const totalSales = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    res.json({
        totalOrders: orders.length,
        totalSales,
        recentOrders: orders.slice(-10).reverse()
    });
});

app.get('/api/admin/products', isAdminApi, async (req, res) => {
    const { Product } = await import('./config/db.js');
    const products = await Product.read();
    res.json(products);
});

app.post('/api/admin/products', isAdminApi, async (req, res) => {
    const { Product } = await import('./config/db.js');
    const { name, category, price, oldPrice, description, seoTitle, seoDescription, images, taagerId } = req.body;
    const products = await Product.read();
    const newProduct = {
        id: 'T' + Date.now().toString().slice(-4),
        name,
        slug: name.toLowerCase().replace(/ /g, '-').replace(/[^\u0621-\u064A0-9a-z-]/g, ''),
        category,
        price,
        oldPrice,
        description: description || '',
        seoTitle: seoTitle || '',
        seoDescription: seoDescription || '',
        inStock: true,
        featured: false,
        images: images || ["https://images.unsplash.com/photo-1585338107529-13afc5f0141f?auto=format&fit=crop&q=80&w=800"],
        specs: [],
        taagerId: taagerId || null
    };
    products.push(newProduct);
    await Product.write(products);
    res.status(201).json(newProduct);
});

app.put('/api/admin/products/:id', isAdminApi, async (req, res) => {
    const { Product } = await import('./config/db.js');
    const { name, category, price, oldPrice, description, seoTitle, seoDescription, images, taagerId } = req.body;
    const products = await Product.read();
    const idx = products.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    
    products[idx] = { 
        ...products[idx], 
        name, category, price, oldPrice, 
        description: description !== undefined ? description : products[idx].description,
        seoTitle: seoTitle !== undefined ? seoTitle : products[idx].seoTitle,
        seoDescription: seoDescription !== undefined ? seoDescription : products[idx].seoDescription,
        images: images !== undefined && images.length ? images : products[idx].images,
        taagerId: taagerId !== undefined ? taagerId : products[idx].taagerId
    };
    await Product.write(products);
    res.json(products[idx]);
});

app.delete('/api/admin/products/:id', isAdminApi, async (req, res) => {
    const { Product } = await import('./config/db.js');
    const products = await Product.read();
    const filtered = products.filter(p => p.id !== req.params.id);
    await Product.write(filtered);
    res.json({ success: true });
});

app.post('/api/sync', isAdminApi, syncProducts);

app.post('/api/admin/auto-scrape', isAdminApi, async (req, res) => {
    try {
        const { spawn } = await import('child_process');
        const child = spawn('node', ['taagerScraper.js', '--auto'], {
            detached: true,
            stdio: 'ignore'
        });
        child.unref();
        res.json({ success: true, message: 'تم تشغيل روبوت السحب في الخلفية بنجاح! سيتم فحص المنتجات وإضافتها تلقائياً (قد يستغرق ذلك بضع دقائق).' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/upload-images', isAdminApi, upload.array('images', 10), (req, res) => {
    try {
        const urls = req.files.map(f => `/uploads/${f.filename}`);
        res.json({ success: true, urls });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});



// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Talba Store Server running on http://localhost:${PORT}`);
});
