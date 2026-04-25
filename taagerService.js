/**
 * Taager API Service
 * Handles all communication with Taager's dropshipping API
 */
import 'dotenv/config';

const BASE = process.env.TAAGER_API_BASE || 'https://merchant.api.taager.com';
let TOKEN = process.env.TAAGER_API_KEY || '';
const TAAGER_PHONE = process.env.TAAGER_PHONE || '';
const TAAGER_PASS = process.env.TAAGER_PASS || '';

const headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`,
  'country': 'EGY',
});

// Login to get a fresh token
async function loginTaager() {
  if (!TAAGER_PHONE || !TAAGER_PASS) {
    throw new Error('TAAGER_PHONE and TAAGER_PASS required in .env for auto-login');
  }
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: TAAGER_PHONE, password: TAAGER_PASS }),
  });
  const data = await res.json();
  if (typeof data.data === 'string' && data.data.startsWith('ey')) {
    TOKEN = data.data;
    console.log('[Taager] Login successful, token refreshed');
    return TOKEN;
  }
  if (data.data?.jwt || data.jwt || data.token) {
    TOKEN = data.data?.jwt || data.jwt || data.token;
    console.log('[Taager] Login successful, token refreshed');
    return TOKEN;
  }
  throw new Error('Login failed: ' + JSON.stringify(data));
}

// Generic request with auto-retry on 401
async function taagerFetch(endpoint, options = {}) {
  const url = `${BASE}${endpoint}`;
  let res = await fetch(url, { headers: headers(), ...options });

  // If 401, try logging in and retry once
  if (res.status === 401 && TAAGER_PHONE && TAAGER_PASS) {
    console.log('[Taager] Token expired, logging in...');
    await loginTaager();
    res = await fetch(url, { headers: headers(), ...options });
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`Taager API Error ${res.status}: ${data.message || res.statusText}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// ═══════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════

/** Get all products (handles pagination) */
export async function fetchAllProducts(categoryId = null) {
  let page = 1;
  let allProducts = [];
  let hasMore = true;

  while (hasMore) {
    const query = new URLSearchParams({ country: 'EGY', page, pageSize: 50 });
    if (categoryId) query.set('category', categoryId);

    const data = await taagerFetch(`/api/product/products?${query}`);
    const products = data.data || data.products || data || [];

    if (Array.isArray(products) && products.length > 0) {
      allProducts = allProducts.concat(products);
      page++;
      hasMore = products.length >= 50;
    } else {
      hasMore = false;
    }
  }
  return allProducts;
}

/** Get single product by Taager ID */
export async function getProduct(taagerProductId) {
  return taagerFetch(`/api/product/getProductByProdId/${taagerProductId}`);
}

/** Get categories */
export async function getCategories() {
  return taagerFetch('/api/category/getCategories?country=EGY');
}

/** Map a Taager product to our local schema */
export function mapTaagerProduct(tp) {
  return {
    id: String(Date.now() + Math.random() * 1000 | 0),
    taagerId: tp._id || tp.id || tp.prodID,
    slug: slugify(tp.productName || tp.name || 'product'),
    name: tp.productName || tp.name || '',
    description: tp.productDescription || tp.description || '',
    price: tp.productProfit || tp.sellerPrice || tp.price || 0,
    oldPrice: tp.productPrice || tp.originalPrice || 0,
    images: (tp.productPicture ? [tp.productPicture] : tp.images || []),
    specs: buildSpecs(tp),
    category: tp.categoryName || tp.category || '',
    inStock: tp.isAvailable !== false && tp.stock !== 0,
    featured: false,
    seoTitle: `${tp.productName || tp.name} | Talba Store`,
    seoDescription: (tp.productDescription || tp.description || '').slice(0, 160),
    taagerData: { sku: tp.sku, weight: tp.weight, supplierPrice: tp.supplierPrice },
    createdAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════

/** Create an order on Taager */
export async function createTaagerOrder(orderData) {
  /*
    orderData shape:
    {
      productId: "taager_product_id",
      quantity: 1,
      receiverName: "Customer Name",
      phoneNumber: "01xxxxxxxxx",
      province: "القاهرة",
      city: "مدينة نصر",
      address: "123 شارع...",
      notes: "optional"
    }
  */
  const payload = {
    products: [{
      productId: orderData.productId || orderData.taagerId,
      quantity: parseInt(orderData.quantity) || 1,
    }],
    receiverName: orderData.receiverName || orderData.name,
    phoneNumber: orderData.phoneNumber || orderData.phone,
    province: orderData.province || orderData.city,
    city: orderData.city || '',
    address: orderData.address,
    notes: orderData.notes || '',
  };

  const result = await taagerFetch('/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return {
    taagerOrderId: result.orderId || result._id || result.id,
    status: result.status || 'pending',
    raw: result,
  };
}

/** Check order status from Taager */
export async function getOrderStatus(taagerOrderId) {
  return taagerFetch(`/orders/${taagerOrderId}`);
}

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════

function slugify(text) {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
    || `product-${Date.now()}`;
}

function buildSpecs(tp) {
  const specs = [];
  if (tp.weight) specs.push({ key: 'الوزن', value: `${tp.weight} جم` });
  if (tp.attributes) {
    for (const [k, v] of Object.entries(tp.attributes)) {
      specs.push({ key: k, value: String(v) });
    }
  }
  return specs;
}
