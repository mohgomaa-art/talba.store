import express from 'express';
import * as productCtrl from '../controllers/productController.js';
import { isAuthenticated } from '../middleware/auth.js';

const router = express.Router();

router.get('/', async (req, res) => {
    const featuredProducts = await productCtrl.getFeaturedProducts();
    res.render('pages/home', { 
        title: 'الرئيسية',
        featuredProducts 
    });
});

router.get('/shop', async (req, res) => {
    const products = await productCtrl.getProductsData(req.query);
    res.render('pages/shop', { 
        title: 'المتجر',
        products,
        query: req.query
    });
});

router.get('/product/:slug', async (req, res) => {
    const product = await productCtrl.getProductBySlug(req.params.slug);
    if (!product) return res.status(404).send('المنتج غير موجود');
    
    res.render('pages/product', { 
        title: product.name,
        description: product.seoDescription || product.description.slice(0, 160),
        product 
    });
});

router.get('/cart', (req, res) => {
    res.render('pages/cart', { title: 'سلة التسوق' });
});

router.get('/checkout', (req, res) => {
    res.render('pages/checkout', { title: 'إتمام الطلب' });
});

// Admin Authentication
router.get('/login', (req, res) => {
    if (req.session.isAdmin) return res.redirect('/admin');
    res.render('pages/login', { title: 'تسجيل الدخول', error: null });
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASS || 'admin123';

    if (username === adminUser && password === adminPass) {
        req.session.isAdmin = true;
        // On Vercel (Serverless), we MUST wait for the session to save to MongoDB before redirecting
        return req.session.save((err) => {
            if (err) console.error('[Session] Save error:', err);
            res.redirect('/admin');
        });
    }
    res.render('pages/login', { title: 'تسجيل الدخول', error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

router.get('/admin', isAuthenticated, (req, res) => {
    res.render('pages/admin', { title: 'لوحة التحكم', layout: './layouts/main' });
});

router.get('/about', (req, res) => res.render('pages/static', { title: 'من نحن' }));
router.get('/shipping', (req, res) => res.render('pages/static', { title: 'سياسة الشحن' }));
router.get('/returns', (req, res) => res.render('pages/static', { title: 'سياسة الاسترجاع' }));
router.get('/contact', (req, res) => res.render('pages/static', { title: 'اتصل بنا' }));

export default router;

