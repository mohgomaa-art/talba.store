/**
 * Global Cart Logic for EKIEI
 */

function getCart() {
    return JSON.parse(localStorage.getItem('ekiei_cart')) || [];
}

function saveCart(cart) {
    localStorage.setItem('ekiei_cart', JSON.stringify(cart));
    updateCartBadge();
}

function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

async function addToCart(productId, quantity = 1) {
    let cart = getCart();
    const existing = cart.find(item => item.id === productId);
    
    if (existing) {
        existing.quantity = parseInt(existing.quantity) + parseInt(quantity);
    } else {
        try {
            const res = await fetch(`/api/products/${productId}`);
            const p = await res.json();
            cart.push({
                id: p.id,
                name: p.name,
                price: p.price,
                image: p.images[0],
                slug: p.slug,
                quantity: parseInt(quantity)
            });
        } catch (e) {
            console.error('Failed to add to cart:', e);
            return;
        }
    }
    
    saveCart(cart);
    showToast('تمت الإضافة للسلة بنجاح');
}

function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
    if (window.renderCart) window.renderCart();
}

function updateQuantity(productId, n) {
    let cart = getCart();
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += n;
        if (item.quantity < 1) item.quantity = 1;
        saveCart(cart);
        if (window.renderCart) window.renderCart();
    }
}

function updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    if (badge) {
        const cart = getCart();
        const total = cart.reduce((sum, item) => sum + item.quantity, 0);
        badge.textContent = total;
    }
}
