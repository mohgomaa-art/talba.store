import fs from 'fs';
import assert from 'assert';

async function testWebsiteFlow() {
    console.log("Starting End-to-End Test...");
    const products = JSON.parse(fs.readFileSync('data/products.json', 'utf8'));
    if (products.length === 0) throw new Error("No products found to test.");
    
    const testProductId = products[0].id;
    console.log(`[1] Testing GET /api/products/${testProductId}...`);
    
    const res = await fetch(`http://localhost:3000/api/products/${testProductId}`);
    if (!res.ok) throw new Error(`Product API failed with status ${res.status}`);
    const product = await res.json();
    assert.strictEqual(product.id, testProductId, "Product ID mismatch");
    console.log(`✅ Product API working: Retrieved ${product.name}`);

    console.log(`\n[2] Testing POST /api/orders (Checkout)...`);
    const orderData = {
        customer: {
            name: "Test User",
            phone: "01000000000",
            address: "Test Address, Cairo",
            governorate: "القاهرة"
        },
        products: [
            {
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: 2
            }
        ],
        totalPrice: (product.price * 2) + 50 // assuming 50 is shipping
    };

    const orderRes = await fetch('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
    });
    
    if (!orderRes.ok) throw new Error(`Order API failed with status ${orderRes.status}`);
    const orderResponse = await orderRes.json();
    assert(orderResponse.success, "Order submission failed");
    console.log(`✅ Order API working: Order placed successfully. Reference: ${orderResponse.orderId}`);

    console.log(`\n[3] Verifying Order in data/orders.json...`);
    const orders = JSON.parse(fs.readFileSync('data/orders.json', 'utf8'));
    const foundOrder = orders.find(o => o.id === orderResponse.orderId);
    assert(foundOrder, "Order not found in database!");
    assert.strictEqual(foundOrder.customer.name, "Test User", "Customer data mismatch");
    console.log(`✅ Order verified in database.`);

    console.log(`\n🎉 End-to-End Test Passed! All core backend flows are working properly.`);
}

testWebsiteFlow().catch(console.error);
