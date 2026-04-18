// ===== YUMEI Bakery — Checkout Module =====

const Checkout = {
  renderCheckout() {
    const container = document.getElementById('checkout-content');
    if (!container) return;

    const cart = Cart.getCart();
    if (cart.length === 0) {
      container.innerHTML = `
        <div class="cart-empty">
          <i>📦</i>
          <h3>Nothing to checkout</h3>
          <p>Your cart is empty. Add some items first!</p>
          <button class="btn btn-primary" onclick="App.navigate('menu')" style="margin-top:20px">Browse Menu</button>
        </div>`;
      return;
    }

    const totals = Cart.getCartTotal();
    const user = Auth.getCurrentUser();

    if (!user) {
      container.innerHTML = `
        <div class="cart-empty">
          <i>🔒</i>
          <h3>Sign in to checkout</h3>
          <p>Please sign in to complete your order.</p>
          <button class="btn btn-primary" onclick="App.navigate('profile')" style="margin-top:20px">Go to Sign In</button>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="checkout-container">
        <div class="checkout-form-section">
          <h3 style="margin-bottom:24px;color:var(--text-primary)">Delivery Details</h3>
          <form id="checkout-form" onsubmit="return Checkout.placeOrder(event)">
            <div class="form-row">
              <div class="form-group">
                <label>Full Name</label>
                <input type="text" class="form-input" id="co-name" value="${user?.name || ''}" placeholder="Your full name" required>
              </div>
              <div class="form-group">
                <label>Phone Number</label>
                <input type="tel" class="form-input" id="co-phone" value="${user?.phone || ''}" placeholder="98XXXXXXXX" required>
              </div>
            </div>
            <div class="form-group">
              <label>Email Address</label>
              <input type="email" class="form-input" id="co-email" value="${user?.email || ''}" placeholder="you@example.com" required>
            </div>
            <div class="form-group">
              <label>Delivery Address</label>
              <textarea class="form-input" id="co-address" rows="3" placeholder="Street address, landmark, city, PIN code" required></textarea>
            </div>
            <div class="form-group">
              <label>Special Instructions</label>
              <textarea class="form-input" id="co-notes" rows="2" placeholder="Any special requests? (optional)"></textarea>
            </div>
            <h3 style="margin:24px 0 16px;color:var(--text-primary)">Payment Method</h3>
            <div style="display:flex;gap:12px;margin-bottom:24px;">
              <label style="flex:1;display:flex;align-items:center;gap:10px;padding:16px;background:var(--bg-glass);border:1px solid var(--border-color);border-radius:var(--radius-sm);cursor:pointer;">
                <input type="radio" name="payment" value="cod" checked> Cash on Delivery
              </label>
              <label style="flex:1;display:flex;align-items:center;gap:10px;padding:16px;background:var(--bg-glass);border:1px solid var(--border-color);border-radius:var(--radius-sm);cursor:pointer;">
                <input type="radio" name="payment" value="card"> Card Payment
              </label>
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%;padding:16px;font-size:1rem;">Place Order — ${Utils.formatCurrency(totals.total)}</button>
          </form>
        </div>
        <div class="checkout-summary">
          <h3 style="margin-bottom:20px;color:var(--text-primary)">Order Summary</h3>
          ${cart.map(item => {
      const p = Products.getProductById(item.id);
      if (!p) return '';
      return `<div class="checkout-summary-item"><span>${p.name} × ${item.qty}</span><span>${Utils.formatCurrency(p.price * item.qty)}</span></div>`;
    }).join('')}
          <hr style="border:none;border-top:1px solid var(--border-color);margin:16px 0;">
          <div class="checkout-summary-item"><span>Subtotal</span><span>${Utils.formatCurrency(totals.subtotal)}</span></div>
          <div class="checkout-summary-item"><span>GST (5%)</span><span>${Utils.formatCurrency(totals.tax)}</span></div>
          <div class="checkout-summary-item"><span>Delivery</span><span>${totals.delivery === 0 ? 'FREE' : Utils.formatCurrency(totals.delivery)}</span></div>
          <div class="checkout-summary-item" style="font-size:1.1rem;font-weight:700;color:var(--accent-gold);margin-top:8px;padding-top:12px;border-top:1px solid var(--border-color);">
            <span>Total</span><span>${Utils.formatCurrency(totals.total)}</span>
          </div>
        </div>
      </div>`;
  },

  async placeOrder(e) {
    e.preventDefault();

    const user = Auth.getCurrentUser();
    if (!user) {
      Utils.showToast("Please sign in to place an order.", "error");
      return false;
    }

    const name = document.getElementById('co-name').value;
    const phone = document.getElementById('co-phone').value;
    const email = document.getElementById('co-email').value;
    const address = document.getElementById('co-address').value;
    const notes = document.getElementById('co-notes').value;
    const payment = document.querySelector('input[name="payment"]:checked').value;

    const cart = Cart.getCart();
    const totals = Cart.getCartTotal();

    // Disable the button to prevent multiple clicks
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Processing...';
    }

    const order = {
      id: Utils.generateId(),
      date: new Date().toISOString(),
      items: cart.map(item => {
        const p = Products.getProductById(item.id);
        return { id: item.id, name: p?.name, price: p?.price, qty: item.qty, image: p?.image };
      }),
      customer: { name, phone, email, address, notes },
      payment: payment === 'cod' ? 'Cash on Delivery' : 'Card Payment',
      status: 'processing',
      ...totals
    };

    const success = await Orders.saveOrder(order);

    if (success) {
      Cart.clearCart();
      this.showSuccess(order);
    } else {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `Place Order — ${Utils.formatCurrency(totals.total)}`;
      }
    }
    
    return false;
  },

  showSuccess(order) {
    const container = document.getElementById('checkout-content');
    container.innerHTML = `
      <div style="max-width:500px;margin:0 auto;text-align:center;padding:40px 20px;">
        <div class="success-icon">✓</div>
        <h2 style="margin-bottom:12px;">Order Placed!</h2>
        <p style="color:var(--text-muted);margin-bottom:8px;">Thank you for your order. We'll start preparing your goodies right away!</p>
        <p style="color:var(--accent-gold);font-family:var(--font-heading);font-size:1.1rem;margin-bottom:8px;">Order ID: ${order.id}</p>
        <p style="color:var(--text-secondary);margin-bottom:32px;">Total: ${Utils.formatCurrency(order.total)}</p>
        <div style="display:flex;gap:12px;justify-content:center;">
          <button class="btn btn-secondary" onclick="App.navigate('profile')">View Orders</button>
          <button class="btn btn-primary" onclick="App.navigate('menu')">Continue Shopping</button>
        </div>
      </div>`;
  }
};
