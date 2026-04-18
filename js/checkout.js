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
        return { id: item.id, name: p?.name, price: p?.price, qty: item.qty, image: p?.image };
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
          <button class="btn btn-primary" style="background:linear-gradient(135deg,#d4a056,#b5656b);"
            onclick="Checkout.downloadInvoice(${JSON.stringify(order).replace(/"/g, '&quot;')})">
            ⬇️ Download Invoice
          </button>
          <button class="btn btn-secondary" onclick="App.navigate('menu')">🛍️ Shop More</button>
        </div>
      </div>`;
  },

  downloadInvoice(order) {
    const date = Utils.formatDate(order.date);
    const itemRows = (order.items || []).map(item => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f0e8dd;">${item.name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0e8dd;text-align:center;">${item.qty}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0e8dd;text-align:right;">₹${Number(item.price).toLocaleString('en-IN')}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0e8dd;text-align:right;">₹${Number(item.price * item.qty).toLocaleString('en-IN')}</td>
      </tr>`).join('');

    const invoiceHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice — ${order.id}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: #fff; color: #2d2013; font-size: 14px; line-height: 1.6; }
    .page { max-width: 720px; margin: 0 auto; padding: 48px 40px; }

    /* Header */
    .inv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 3px solid #d4a056; }
    .inv-brand { font-family: 'Playfair Display', serif; font-size: 2.2rem; font-weight: 700; color: #d4a056; letter-spacing: 3px; }
    .inv-brand span { color: #2d2013; font-weight: 400; }
    .inv-title-block { text-align: right; }
    .inv-title-block h2 { font-family: 'Playfair Display', serif; font-size: 1.6rem; color: #2d2013; letter-spacing: 1px; }
    .inv-title-block .inv-id { font-size: 0.85rem; color: #8b7355; margin-top: 4px; letter-spacing: 0.5px; }
    .inv-title-block .inv-date { font-size: 0.85rem; color: #8b7355; }

    /* Meta grid */
    .inv-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 36px; }
    .inv-meta-box { background: #fdf8f3; border: 1px solid #f0e8dd; border-radius: 8px; padding: 16px 20px; }
    .inv-meta-box h4 { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1.5px; color: #a07848; margin-bottom: 10px; }
    .inv-meta-box p { font-size: 0.9rem; color: #2d2013; margin-bottom: 4px; }
    .inv-meta-box .muted { color: #8b7355; font-size: 0.85rem; }

    /* Table */
    table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
    thead tr { background: #2d2013; }
    thead th { padding: 12px 12px; color: #f5e6d3; font-size: 0.8rem; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
    thead th:first-child { text-align: left; border-radius: 6px 0 0 6px; }
    thead th:last-child { text-align: right; border-radius: 0 6px 6px 0; }
    thead th:not(:first-child):not(:last-child) { text-align: center; }
    tbody tr:last-child td { border-bottom: none; }

    /* Totals */
    .inv-totals { margin-left: auto; width: 280px; }
    .inv-total-row { display: flex; justify-content: space-between; padding: 8px 0; color: #5a4030; font-size: 0.9rem; border-bottom: 1px solid #f0e8dd; }
    .inv-total-row:last-child { border-bottom: none; padding-top: 12px; margin-top: 4px; font-size: 1.1rem; font-weight: 700; color: #2d2013; }
    .inv-total-row:last-child span:last-child { color: #d4a056; }

    /* Footer */
    .inv-footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #f0e8dd; display: flex; justify-content: space-between; align-items: center; }
    .inv-footer p { font-size: 0.8rem; color: #8b7355; }
    .inv-badge { background: #fdf8f3; border: 1px solid #d4a056; border-radius: 20px; padding: 6px 16px; font-size: 0.75rem; color: #a07848; font-weight: 600; letter-spacing: 0.5px; }

    .status-badge { display: inline-block; background: #fff3e0; color: #e67e00; border: 1px solid #f4c06f; border-radius: 20px; padding: 3px 12px; font-size: 0.78rem; font-weight: 600; text-transform: capitalize; }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 20px; }
    }
  </style>
</head>
<body>
<div class="page">

  <div class="inv-header">
    <div>
      <div class="inv-brand">YUMEI<span>.</span></div>
      <div style="font-size:0.8rem;color:#8b7355;margin-top:4px;">Artisan Bakery & Patisserie</div>
      <div style="font-size:0.8rem;color:#8b7355;">New Rajendra Nagar, Raipur, CG 492001</div>
    </div>
    <div class="inv-title-block">
      <h2>INVOICE</h2>
      <div class="inv-id">Order ID: <strong>${order.id}</strong></div>
      <div class="inv-date">Date: ${date}</div>
      <div style="margin-top:8px;"><span class="status-badge">Processing</span></div>
    </div>
  </div>

  <div class="inv-meta">
    <div class="inv-meta-box">
      <h4>Bill To</h4>
      <p><strong>${order.customer?.name || '—'}</strong></p>
      <p class="muted">${order.customer?.email || '—'}</p>
      <p class="muted">${order.customer?.phone || '—'}</p>
    </div>
    <div class="inv-meta-box">
      <h4>Deliver To</h4>
      <p>${order.customer?.address || '—'}</p>
      ${order.customer?.notes ? `<p class="muted" style="margin-top:6px;">Note: ${order.customer.notes}</p>` : ''}
    </div>
    <div class="inv-meta-box">
      <h4>Payment</h4>
      <p>${order.payment}</p>
    </div>
    <div class="inv-meta-box">
      <h4>Items Ordered</h4>
      <p>${(order.items || []).length} item(s)</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th style="text-align:center;">Qty</th>
        <th style="text-align:right;">Unit Price</th>
        <th style="text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="inv-totals">
    <div class="inv-total-row"><span>Subtotal</span><span>₹${Number(order.subtotal || 0).toLocaleString('en-IN')}</span></div>
    <div class="inv-total-row"><span>GST (5%)</span><span>₹${Number(order.tax || 0).toLocaleString('en-IN')}</span></div>
    <div class="inv-total-row"><span>Delivery</span><span>${(order.delivery === 0 || order.delivery === '0') ? 'FREE' : '₹' + Number(order.delivery || 0).toLocaleString('en-IN')}</span></div>
    <div class="inv-total-row"><span>Grand Total</span><span>₹${Number(order.total || 0).toLocaleString('en-IN')}</span></div>
  </div>

  <div class="inv-footer">
    <p>Thank you for choosing YUMEI. We hope you love every bite! 🍰</p>
    <div class="inv-badge">YUMEI Bakery</div>
  </div>

</div>
<script>window.onload = () => { window.print(); };<\/script>
</body>
</html>`;

    // Open invoice in a new tab — browser print dialog lets user save as PDF
    const win = window.open('', '_blank', 'width=800,height=900');
    if (win) {
      win.document.write(invoiceHTML);
      win.document.close();
    } else {
      Utils.showToast('Please allow pop-ups to download the invoice.', 'error');
    }
  }
};
