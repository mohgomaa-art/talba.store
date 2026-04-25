import { Product, Category } from '../config/db.js';

/**
 * List products with filters
 */
export const getProducts = async (req, res) => {
  const { category, search, minPrice, maxPrice, sort } = req.query;
  
  let products = await Product.read();

  if (category) products = products.filter(p => p.category === category);
  if (search) {
    const q = search.toLowerCase();
    products = products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.description.toLowerCase().includes(q)
    );
  }
  if (minPrice) products = products.filter(p => p.price >= Number(minPrice));
  if (maxPrice) products = products.filter(p => p.price <= Number(maxPrice));

  if (sort === 'price_asc') products.sort((a,b) => a.price - b.price);
  if (sort === 'price_desc') products.sort((a,b) => b.price - a.price);
  if (sort === 'newest') products.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json(products);
};

/**
 * Get products data for SSR
 */
export const getProductsData = async (query = {}) => {
  const { category, search, minPrice, maxPrice, sort } = query;
  
  let products = await Product.read();

  if (category) products = products.filter(p => p.category === category);
  if (search) {
    const q = search.toLowerCase();
    products = products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.description && p.description.toLowerCase().includes(q))
    );
  }
  if (minPrice) products = products.filter(p => p.price >= Number(minPrice));
  if (maxPrice) products = products.filter(p => p.price <= Number(maxPrice));

  if (sort === 'price_asc') products.sort((a,b) => a.price - b.price);
  if (sort === 'price_desc') products.sort((a,b) => b.price - a.price);
  if (sort === 'newest') products.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  return products;
};

/**
 * Get single product by slug
 */
export const getProductBySlug = async (slug) => {
  return await Product.findOne({ slug });
};

/**
 * Get featured products
 */
export const getFeaturedProducts = async () => {
  const products = await Product.read();
  return products.filter(p => p.featured).slice(0, 8);
};
