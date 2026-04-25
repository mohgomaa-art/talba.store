import connectDB, { Product } from '../config/db.js';

/**
 * List products with filters
 */
export const getProducts = async (req, res) => {
  await connectDB();
  const { category, search, minPrice, maxPrice, sort } = req.query;

  const query = {};
  if (category) query.category = category;
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  let sortObj = {};
  if (sort === 'price_asc') sortObj = { price: 1 };
  else if (sort === 'price_desc') sortObj = { price: -1 };
  else if (sort === 'newest') sortObj = { createdAt: -1 };

  const products = await Product.find(query).sort(sortObj).lean();
  res.json(products);
};

/**
 * Get products data for SSR
 */
export const getProductsData = async (query = {}) => {
  await connectDB();
  const { category, search, minPrice, maxPrice, sort } = query;

  const filter = {};
  if (category) filter.category = category;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  let sortObj = {};
  if (sort === 'price_asc') sortObj = { price: 1 };
  else if (sort === 'price_desc') sortObj = { price: -1 };
  else if (sort === 'newest') sortObj = { createdAt: -1 };

  return await Product.find(filter).sort(sortObj).lean();
};

/**
 * Get single product by slug
 */
export const getProductBySlug = async (slug) => {
  await connectDB();
  return await Product.findOne({ slug }).lean();
};

/**
 * Get featured products
 */
export const getFeaturedProducts = async () => {
  await connectDB();
  return await Product.find({ featured: true }).limit(8).lean();
};
