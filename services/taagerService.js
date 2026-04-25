import 'dotenv/config';
import axios from 'axios';

const BASE = process.env.TAAGER_API_BASE || 'https://merchant.api.taager.com';
let TOKEN = process.env.TAAGER_API_KEY || '';
const TAAGER_PHONE = process.env.TAAGER_PHONE || '';
const TAAGER_PASS = process.env.TAAGER_PASS || '';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`,
  'country': 'EGY'
});

/**
 * Login to get a fresh token
 */
export async function loginTaager() {
  if (!TAAGER_PHONE || !TAAGER_PASS) {
    throw new Error('TAAGER_PHONE and TAAGER_PASS required in .env');
  }
  
  try {
    const res = await axios.post(`${BASE}/api/auth/login`, {
      username: TAAGER_PHONE,
      password: TAAGER_PASS
    });
    
    const data = res.data;
    if (typeof data.data === 'string' && data.data.startsWith('ey')) {
      TOKEN = data.data;
      return TOKEN;
    }
    throw new Error('Token not found in login response');
  } catch (e) {
    console.error('[Taager] Login Error Details:', e.response?.data || e.message);
    throw new Error(`Taager Login Failed: ${e.response?.data?.message || e.message}`);
  }
}

/**
 * Generic request with auto-retry on 401
 */
async function taagerFetch(endpoint, options = {}) {
  const url = `${BASE}${endpoint}`;
  
  try {
    const res = await axios({
      url,
      headers: getHeaders(),
      ...options
    });
    return res.data;
  } catch (e) {
    if (e.response?.status === 401 && TAAGER_PHONE && TAAGER_PASS) {
      await loginTaager();
      const res = await axios({
        url,
        headers: getHeaders(),
        ...options
      });
      return res.data;
    }
    throw e;
  }
}

/**
 * Fetch all products from Taager with pagination
 */
export async function fetchAllProducts(categoryId = null) {
  let page = 1;
  let allProducts = [];
  let hasMore = true;

  while (hasMore) {
    const query = new URLSearchParams({ country: 'EGY', page, pageSize: 50 });
    if (categoryId) query.set('category', categoryId);

    const data = await taagerFetch(`/api/product/products?${query}`);
    const products = data.data || data.products || [];

    if (Array.isArray(products) && products.length > 0) {
      allProducts.push(...products);
      page++;
    } else {
      hasMore = false;
    }
    
    // Safety break for testing
    if (page > 10) break; 
  }

  return allProducts;
}

/**
 * Get categories from Taager
 */
export async function getCategories() {
  const data = await taagerFetch('/api/category/getCategories?country=EGY');
  return data.data || [];
}

/**
 * Create order on Taager
 */
export async function createTaagerOrder(orderData) {
  return taagerFetch('/api/orders', {
    method: 'POST',
    data: {
      ...orderData,
      countryIsoCode3: 'EGY'
    }
  });
}

/**
 * Map Taager product to our schema
 */
export function mapTaagerProduct(tp) {
  return {
    taagerId: tp.prodID || tp.prod_id,
    name: tp.prodName,
    nameEn: tp.prodNameEn,
    slug: (tp.prodNameEn || tp.prodName).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description: tp.prodDescription,
    taagerPrice: tp.sellingPrice,
    price: Math.ceil(tp.sellingPrice * 1.2), // Default 20% margin
    profit: Math.ceil(tp.sellingPrice * 0.2),
    images: [tp.prodImage, ...(tp.additionalImages || [])].filter(Boolean),
    category: tp.categoryName,
    rating: 4.5,
    reviews: Math.floor(Math.random() * 100) + 10,
    inStock: tp.availability !== false,
    featured: false
  };
}
