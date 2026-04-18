// ===== YUMEI Bakery — Orders Module =====

const Orders = {
  STORAGE_KEY: 'yumei_orders',

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
        orders.push({ id: doc.id, ...doc.data() });
      });
      
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
      const statusLabels = { processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered' };
      return `
        <div class="order-card">
          <div class="order-card-header" onclick="Orders.toggleOrder(this)">
            <div>
              <span class="order-id">${order.id}</span>
              <span class="order-date"> — ${Utils.formatDate(order.date)}</span>
            </div>
            <span class="order-status ${order.status}">${statusLabels[order.status] || order.status}</span>
            <span class="order-total">${Utils.formatCurrency(order.total)}</span>
          </div>
          <div class="order-details">
            <div class="order-details-content">
              ${order.items.map(item => `
                <div class="order-detail-item">
                  <span>${item.name} × ${item.qty}</span>
                  <span>${Utils.formatCurrency(item.price * item.qty)}</span>
                </div>
              `).join('')}
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

  toggleOrder(headerEl) {
    const details = headerEl.nextElementSibling;
    details.classList.toggle('expanded');
  }
};
