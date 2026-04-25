// ===== YUMEI Bakery — Checkout Module =====

const Checkout = {

  // Load saved delivery details — checks user_profiles first, then last order as fallback
  async loadSavedProfile(uid) {
    try {
      if (!window.FirebaseDB) return null;

      // 1. Try the fast user_profiles document first
      if (window.FirestoreDoc && window.FirestoreGetDoc) {
        const ref = window.FirestoreDoc(window.FirebaseDB, "user_profiles", uid);
        const snap = await window.FirestoreGetDoc(ref);
        if (snap.exists()) return snap.data();
      }

      // 2. Fallback: pull details from the most recent order
      if (window.FirestoreQuery && window.FirestoreCollection && window.FirestoreWhere && window.FirestoreGetDocs) {
        const q = window.FirestoreQuery(
          window.FirestoreCollection(window.FirebaseDB, "orders"),
          window.FirestoreWhere("userId", "==", uid)
        );
        const snapshot = await window.FirestoreGetDocs(q);
        const orders = [];
        snapshot.forEach(doc => orders.push(doc.data()));
        if (orders.length > 0) {
          // Sort client-side to get latest order
          orders.sort((a, b) => new Date(b.date) - new Date(a.date));
          return orders[0].customer || null;
        }
      }

      return null;
    } catch (err) {
      console.warn("Could not load saved profile:", err);
      return null;
    }
  },

  // Save delivery details back to Firestore + localStorage so next checkout is pre-filled
  async saveProfileDetails(uid, details) {
    // Always write to localStorage immediately (instant, no network)
    try { localStorage.setItem('yumei_delivery_' + uid, JSON.stringify(details)); } catch(e) {}

    // Also persist to Firestore for cross-device sync
    try {
      if (!window.FirebaseDB || !window.FirestoreDoc || !window.FirestoreSetDoc) return;
      const ref = window.FirestoreDoc(window.FirebaseDB, "user_profiles", uid);
      await window.FirestoreSetDoc(ref, details, { merge: true });
    } catch (err) {
      console.warn("Could not save profile to Firestore:", err);
    }
  },

  async renderCheckout() {
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

    // Show a brief loading state while we fetch saved details
    container.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--text-muted);">Loading your details…</div>`;

    // Fetch previously saved profile (phone + address)
    const saved = await this.loadSavedProfile(user.uid);

    // Also check localStorage as instant fallback (always written after each order)
    let local = null;
    try { local = JSON.parse(localStorage.getItem('yumei_delivery_' + user.uid) || 'null'); } catch(e) {}

    const prefillName    = saved?.name    || local?.name    || user.displayName || '';
    const prefillPhone   = saved?.phone   || local?.phone   || '';
    const prefillEmail   = saved?.email   || local?.email   || user.email || '';
    const prefillAddress = saved?.address || local?.address || '';

    container.innerHTML = `
      <div class="checkout-container">
        <div class="checkout-form-section">
          <h3 style="margin-bottom:24px;color:var(--text-primary)">Delivery Details</h3>
          <form id="checkout-form" onsubmit="return Checkout.placeOrder(event)">
            <div class="form-row">
              <div class="form-group">
                <label>Full Name</label>
                <input type="text" class="form-input" id="co-name" value="${prefillName}" placeholder="Your full name" required>
              </div>
              <div class="form-group">
                <label>Phone Number</label>
                <input type="tel" class="form-input" id="co-phone" value="${prefillPhone}" placeholder="98XXXXXXXX" required>
              </div>
            </div>
            <div class="form-group">
              <label>Email Address</label>
              <input type="email" class="form-input" id="co-email" value="${prefillEmail}" placeholder="you@example.com" required>
            </div>
            <div class="form-group">
              <label>Delivery Address</label>
              <textarea class="form-input" id="co-address" rows="3" placeholder="Street address, landmark, city, PIN code" required>${prefillAddress}</textarea>
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
      const inclusivePrice = Utils.getInclusivePrice(p.price, p.gst);
      return `<div class="checkout-summary-item"><span>${p.name} × ${item.qty}</span><span>${Utils.formatCurrency(inclusivePrice * item.qty)}</span></div>`;
    }).join('')}
          <hr style="border:none;border-top:1px solid var(--border-color);margin:16px 0;">
          <div class="checkout-summary-item"><span>Subtotal</span><span>${Utils.formatCurrency(totals.subtotal)}</span></div>
          <div class="checkout-summary-item" style="font-size:0.85rem; color:var(--text-muted);"><span>Includes GST</span><span>${Utils.formatCurrency(totals.tax)}</span></div>
          ${totals.convenienceFee > 0 ? `<div class="checkout-summary-item"><span>Convenience Fee</span><span>${Utils.formatCurrency(totals.convenienceFee)}</span></div>` : ''}
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

    const name    = document.getElementById('co-name').value.trim();
    const phone   = document.getElementById('co-phone').value.trim();
    const email   = document.getElementById('co-email').value.trim();
    const address = document.getElementById('co-address').value.trim();
    const notes   = document.getElementById('co-notes').value.trim();
    const payment = document.querySelector('input[name="payment"]:checked').value;

    const cart   = Cart.getCart();
    const totals = Cart.getCartTotal();

    // Disable the button to prevent multiple clicks
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Processing…';
    }

    const order = {
      id: Utils.generateId(),
      date: new Date().toISOString(),
      items: cart.map(item => {
        const p = Products.getProductById(item.id);
        return { id: item.id, name: p?.name, price: Utils.getInclusivePrice(p?.price, p?.gst), qty: item.qty, image: p?.image };
      }),
      customer: { name, phone, email, address, notes },
      payment: payment === 'cod' ? 'Cash on Delivery' : 'Card Payment',
      status: 'processing',
      ...totals
    };

    const success = await Orders.saveOrder(order);

    if (success) {
      // Persist the delivery details for next time (silently in background)
      this.saveProfileDetails(user.uid, { name, phone, email, address });

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
    // Store order reference so downloadInvoice() can access it safely
    Checkout._lastOrder = order;

    const container = document.getElementById('checkout-content');
    container.innerHTML = `
      <div style="max-width:560px;margin:0 auto;text-align:center;padding:48px 24px;">
        <div class="success-icon" style="animation: scaleIn 0.5s ease;">✓</div>
        <h2 style="margin-bottom:12px;">Order Placed!</h2>
        <p style="color:var(--text-muted);margin-bottom:8px;">Thank you, <strong style="color:var(--text-primary)">${order.customer?.name || 'friend'}</strong>! We'll start preparing your goodies right away 🍰</p>
        <p style="color:var(--accent-gold);font-family:var(--font-heading);font-size:1.1rem;margin:16px 0 4px;">Order ID: <span style="letter-spacing:1px">${order.id}</span></p>
        <p style="color:var(--text-secondary);margin-bottom:32px;">Total Paid: <strong>${Utils.formatCurrency(order.total)}</strong></p>

        <div style="background:var(--bg-glass);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:20px;margin-bottom:28px;text-align:left;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <span style="color:var(--text-muted);font-size:0.85rem;">Payment</span>
            <span style="color:var(--text-primary);font-size:0.9rem;">${order.payment}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <span style="color:var(--text-muted);font-size:0.85rem;">Delivery to</span>
            <span style="color:var(--text-primary);font-size:0.9rem;text-align:right;max-width:60%;">${order.customer?.address || '—'}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="color:var(--text-muted);font-size:0.85rem;">Items</span>
            <span style="color:var(--text-primary);font-size:0.9rem;">${order.items?.length || 0} item(s)</span>
          </div>
        </div>

        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
          <button class="btn btn-secondary" onclick="App.navigate('profile')">📋 View Orders</button>
          <button class="btn btn-primary" id="invoice-btn"
            style="background:linear-gradient(135deg,#d4a056,#b5656b);" onclick="Orders.downloadInvoice(Checkout._lastOrder)">
            ⬇️ Download Invoice
          </button>
          <button class="btn btn-secondary" onclick="App.navigate('menu')">🛍️ Shop More</button>
        </div>
      </div>`;
  },

  downloadInvoice() {
    // This is now handled by Orders.downloadInvoice(Checkout._lastOrder)
    // We keep this function for backward compatibility if needed, but it delegates
    Orders.downloadInvoice(Checkout._lastOrder);
  }
};
