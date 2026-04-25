// ===== YUMEI Bakery — Orders Module =====

const Orders = {
  STORAGE_KEY: 'yumei_orders',
  _allOrders: [], // Cache for fetched orders to allow quick lookup

  async getOrders() {
    const user = Auth.getCurrentUser();
    if (!user || !window.FirebaseDB || !window.FirestoreCollection) return [];

    try {
      // Query without orderBy to avoid needing a Firestore composite index
      const q = window.FirestoreQuery(
        window.FirestoreCollection(window.FirebaseDB, "orders"),
        window.FirestoreWhere("userId", "==", user.uid)
      );
      const querySnapshot = await window.FirestoreGetDocs(q);
      const orders = [];
      querySnapshot.forEach((doc) => {
        orders.push({ docId: doc.id, ...doc.data() });
      });
      
      this._allOrders = orders; // Store in cache
      
      // Sort orders client-side by date descending
      orders.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });
      
      return orders;
    } catch (error) {
      console.error("Error getting orders: ", error);
      return [];
    }
  },

  async saveOrder(order) {
    const user = Auth.getCurrentUser();
    if (!user || !window.FirebaseDB) {
      Utils.showToast("Must be logged in to place an order.", "error");
      return false;
    }

    try {
      // Add the user ID to the order document
      order.userId = user.uid;
      // We do not need the local random id if we use Firestore doc id, but let's keep it as an order reference
      await window.FirestoreAddDoc(window.FirestoreCollection(window.FirebaseDB, "orders"), order);
      return true;
    } catch (error) {
      console.error("Error saving order: ", error);
      Utils.showToast("Failed to save order.", "error");
      return false;
    }
  },

  async renderOrderHistory(containerId = 'profile-orders') {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Show loading state
    container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-muted);">Loading orders...</div>`;

    // Load user reviews first to know what has been rated
    if (typeof Reviews !== 'undefined') await Reviews.loadUserReviews();

    const orders = await this.getOrders();

    if (orders.length === 0) {
      container.innerHTML = `
        <div class="cart-empty" style="padding:40px 20px;">
          <i>📋</i>
          <h3>No orders yet</h3>
          <p>Your order history will appear here once you place an order.</p>
        </div>`;
      return;
    }

    container.innerHTML = orders.map(order => {
      const statusLabels = { 
        processing: 'Processing', 
        shipped: 'Shipped', 
        delivered: 'Delivered',
        cancellation_requested: 'Cancel Requested'
      };
      
      return `
        <div class="order-card">
          <div class="order-card-header" onclick="Orders.toggleOrder(this)">
            <div>
              <span class="order-id">${order.id}</span>
              <span class="order-date"> — ${Utils.formatDate(order.date)}</span>
            </div>
            <div style="display:flex; align-items:center; gap:12px;">
              <span class="order-status ${order.status}">${statusLabels[order.status] || order.status}</span>
              <span class="order-total">${Utils.formatCurrency(order.total)}</span>
              
              ${order.status === 'processing' ? `
                <button class="btn btn-secondary btn-sm" style="padding: 4px 10px; font-size: 0.7rem; text-transform: none; border-color: var(--accent-rose); color: var(--accent-rose);" 
                  onclick="event.stopPropagation(); Orders.requestCancellation('${order.docId}')">
                  Cancel?
                </button>
              ` : ''}

              <button class="order-download-btn" onclick="event.stopPropagation(); Orders.downloadInvoiceById('${order.id}')" title="Download Invoice">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Invoice
              </button>
            </div>
          </div>
          <div class="order-details">
            <div class="order-details-content">
              ${order.items.map(item => {
                const addonsText = (item.addons && item.addons.length > 0)
                  ? item.addons.map(a => `${a.name}${a.price > 0 ? ` (+${Utils.formatCurrency(a.price)})` : ''}`).join(', ')
                  : '';
                return `
                  <div class="order-detail-item" style="flex-direction:column; align-items:flex-start; gap:2px;">
                      <span>${item.name} × ${item.qty}</span>
                      <div style="display:flex; align-items:center; gap:10px;">
                        ${(() => {
                          if (order.status !== 'delivered') return '';
                          const alreadyReviewed = typeof Reviews !== 'undefined' && Reviews.hasUserReviewed(item.id);
                          if (alreadyReviewed) {
                            return `<span style="font-size:0.7rem; color:var(--accent-gold); font-weight:600; background:rgba(212,160,86,0.1); padding:2px 8px; border-radius:4px;">★ Rated</span>`;
                          }
                          return `<button class="order-rate-btn" onclick="Reviews.openModal('${item.id}', '${order.id}')">Rate Item</button>`;
                        })()}
                        <span>${Utils.formatCurrency(item.price * item.qty)}</span>
                      </div>
                    </div>
                    ${addonsText ? `<span style="font-size:0.78rem; color:var(--text-muted);">Add-ons: ${addonsText}</span>` : ''}
                    ${item.cookingRequest ? `<span style="font-size:0.78rem; color:var(--text-muted); font-style:italic;">📝 ${item.cookingRequest}</span>` : ''}
                  </div>
                `;
              }).join('')}
              <div class="order-detail-item" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border-color);font-weight:600;color:var(--text-primary);">
                <span>Total</span>
                <span style="color:var(--accent-gold);">${Utils.formatCurrency(order.total)}</span>
              </div>
              <p style="margin-top:12px;font-size:0.85rem;color:var(--text-muted);">Payment: ${order.payment}</p>
              ${order.customer ? `<p style="font-size:0.85rem;color:var(--text-muted);">Delivery to: ${order.customer.address}</p>` : ''}
            </div>
          </div>
        </div>`;
    }).join('');
  },

  async requestCancellation(docId) {
    const confirmCancel = confirm("Are you sure you want to request cancellation for this order?");
    if (!confirmCancel) return;

    try {
      if (!window.FirebaseDB || !window.FirestoreDoc || !window.FirestoreUpdateDoc) {
        Utils.showToast("Firestore not available", "error");
        return;
      }

      const orderRef = window.FirestoreDoc(window.FirebaseDB, "orders", docId);
      await window.FirestoreUpdateDoc(orderRef, {
        status: 'cancellation_requested',
        cancelRequestedAt: new Date().toISOString()
      });

      Utils.showToast("Cancellation request sent to admin.", "success");
      this.renderOrderHistory(); // Refresh UI
    } catch (error) {
      console.error("Cancellation error:", error);
      Utils.showToast("Failed to send cancellation request.", "error");
    }
  },

  toggleOrder(headerEl) {
    const details = headerEl.nextElementSibling;
    details.classList.toggle('expanded');
  },

  downloadInvoiceById(orderId) {
    const order = this._allOrders.find(o => o.id === orderId);
    if (!order) {
      Utils.showToast('Order details not found.', 'error');
      return;
    }
    this.downloadInvoice(order);
  },

  downloadInvoice(order) {
    if (!order) { Utils.showToast('No order data provided.', 'error'); return; }
    const date = Utils.formatDate(order.date);
    const itemRows = (order.items || []).map(item => {
      const addonsHtml = (item.addons && item.addons.length > 0)
        ? `<div style="margin-top:5px; display:flex; flex-wrap:wrap; gap:4px;">
            ${item.addons.map(a =>
              `<span style="font-size:0.72rem; padding:2px 8px; background:#fdf8f3; border:1px solid #f0e8dd; border-radius:20px; color:#8b7355;">
                ${a.name}${a.price > 0 ? ` +₹${Number(a.price).toLocaleString('en-IN')}` : ''}
              </span>`
            ).join('')}
          </div>`
        : '';
      const cookingHtml = item.cookingRequest
        ? `<div style="margin-top:5px; font-size:0.78rem; color:#8b7355; font-style:italic;">📝 ${item.cookingRequest}</div>`
        : '';
      return `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f0e8dd;">
          <div>${item.name}</div>
          ${addonsHtml}
          ${cookingHtml}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0e8dd;text-align:center;">${item.qty}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0e8dd;text-align:right;">₹${Number(item.price).toLocaleString('en-IN')}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0e8dd;text-align:right;">₹${Number(item.price * item.qty).toLocaleString('en-IN')}</td>
      </tr>`;
    }).join('');

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
      <div style="margin-top:8px;"><span class="status-badge">${order.status || 'Processing'}</span></div>
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
    <div class="inv-total-row"><span>GST (Included)</span><span>₹${Number(order.tax || 0).toLocaleString('en-IN')}</span></div>
    ${order.convenienceFee > 0 ? `<div class="inv-total-row"><span>Convenience Fee</span><span>₹${Number(order.convenienceFee).toLocaleString('en-IN')}</span></div>` : ''}
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
