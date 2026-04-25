import { Order, Product } from '../config/db.js';
import { createTaagerOrder } from '../services/taagerService.js';

/**
 * Create a new order
 */
export const createOrder = async (req, res) => {
  try {
    const { customer, products, totalPrice, paymentMethod, notes } = req.body;

    // 1. Save order locally first
    const newOrder = await Order.create({
      customer,
      products,
      totalPrice,
      paymentMethod,
      notes,
      status: 'pending'
    });

    // 2. Try to forward to Taager for each product that has a taagerId
    // In a real scenario, we might group these or send one by one
    for (const item of products) {
      const product = await Product.findById(item.id);
      if (product && product.taagerId) {
        try {
          const taagerRes = await createTaagerOrder({
            specs: [{ prodID: product.taagerId, quantity: item.quantity }],
            orderPrice: item.price,
            orderProfit: product.profit * item.quantity,
            buyerName: customer.name,
            buyerPhoneNumber: customer.phone,
            buyerPhoneNumber2: customer.phone2 || '',
            province: customer.governorate,
            district: customer.city,
            streetName: customer.address,
            countryIsoCode3: 'EGY'
          });

          // Update local order with Taager ID
          await Order.findByIdAndUpdate(newOrder.id, {
            taagerOrderId: taagerRes.data?.orderID || taagerRes.orderID,
            status: 'confirmed'
          });
          
          console.log(`[Order] Forwarded to Taager: ${newOrder.id}`);
        } catch (taagerError) {
          console.error(`[Order] Taager Forwarding Failed for ${newOrder.id}:`, taagerError.message);
          await Order.findByIdAndUpdate(newOrder.id, { status: 'taager_failed' });
        }
      }
    }

    res.json({ success: true, orderId: newOrder.id });
  } catch (e) {
    console.error('[Order] Creation Failed:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
};

/**
 * Get order status
 */
export const getOrderStatus = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
};
