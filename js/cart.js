// ===== YUMEI Bakery — Cart Module =====

const Cart = {
  STORAGE_KEY: 'yumei_cart',

  getCart() {
    return Utils.getFromStorage(this.STORAGE_KEY) || [];
  },

  saveCart(cart) {
    Utils.saveToStorage(this.STORAGE_KEY, cart);
    this.updateBadge();
  },

  addToCart(productId, qty = 1) {
    const product = Products.getProductById(productId);
    if (!product) return;

    if (product.outOfStock === true || product.outOfStock === 'true') {
      Utils.showToast(`${product.name} is currently out of stock`, 'error');
      return;
    }

    const cart = this.getCart();
    const existing = cart.find(item => item.id === productId);

    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({ id: productId, qty });
    }

    this.saveCart(cart);
    Utils.showToast(`${product.name} added to cart!`, 'success');
    this.renderCart();
  },

  removeFromCart(productId) {
    let cart = this.getCart().filter(item => item.id !== productId);
    this.saveCart(cart);
    Utils.showToast('Item removed from cart', 'info');
    this.renderCart();
  },

  updateQuantity(productId, qty) {
    const cart = this.getCart();
    const item = cart.find(i => i.id === productId);
    if (!item) return;

    if (qty <= 0) {
      this.removeFromCart(productId);
      return;
    }

    item.qty = qty;
    this.saveCart(cart);
    this.renderCart();
  },

  getCartTotal() {
    const cart = this.getCart();
    let subtotal = 0;
    let tax = 0;
    
    cart.forEach(item => {
      const product = Products.getProductById(item.id);
      if (product) {
        const itemSubtotal = product.price * item.qty;
        subtotal += itemSubtotal;
        // Use product-specific GST or fallback to 5%
        const gstPercent = parseFloat(product.gst !== undefined ? product.gst : 5) / 100;
        tax += itemSubtotal * gstPercent;
      }
    });

    tax = Math.round(tax);
    
    // Dynamic delivery and convenience fee
    const { freeDeliveryMin, deliveryCharge, convenienceFeeEnabled, convenienceFeeAmount } = Config.data;
    const delivery = subtotal > 0 ? (subtotal >= freeDeliveryMin ? 0 : deliveryCharge) : 0;
    const convenienceFee = (subtotal > 0 && convenienceFeeEnabled) ? convenienceFeeAmount : 0;
    
    return { 
      subtotal, 
      tax, 
      delivery, 
      convenienceFee,
      total: subtotal + tax + delivery + convenienceFee 
    };
  },

  getItemCount() {
    return this.getCart().reduce((sum, item) => sum + item.qty, 0);
  },

  updateBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const count = this.getItemCount();
    badge.textContent = count;
    badge.classList.toggle('show', count > 0);
  },

  renderCart() {
    const container = document.getElementById('cart-items');
    const summaryEl = document.getElementById('cart-summary');
    if (!container) return;

    const cart = this.getCart();

    if (cart.length === 0) {
      container.innerHTML = `
        <div class="cart-empty">
          <i>🛒</i>
          <h3>Your cart is empty</h3>
          <p>Looks like you haven't added anything yet.</p>
          <button class="btn btn-primary" onclick="App.navigate('menu')" style="margin-top:20px">Browse Menu</button>
        </div>`;
      if (summaryEl) summaryEl.style.display = 'none';
      return;
    }

    container.innerHTML = cart.map(item => {
      const p = Products.getProductById(item.id);
      if (!p) return '';
      return `
        <div class="cart-item">
          <div class="cart-item-img"><img src="${p.image}" alt="${p.name}"></div>
          <div class="cart-item-info">
            <h4>${p.name}</h4>
            <span class="cart-item-cat">${p.category}</span>
          </div>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="Cart.updateQuantity('${p.id}', ${item.qty - 1})">−</button>
            <span>${item.qty}</span>
            <button class="qty-btn" onclick="Cart.updateQuantity('${p.id}', ${item.qty + 1})">+</button>
          </div>
          <div class="cart-item-price">${Utils.formatCurrency(p.price * item.qty)}</div>
          <button class="cart-item-remove" onclick="Cart.removeFromCart('${p.id}')" title="Remove">✕</button>
        </div>`;
    }).join('');

    if (summaryEl) {
      const totals = this.getCartTotal();
      summaryEl.style.display = 'block';
      summaryEl.innerHTML = `
        <div class="cart-summary-row"><span>Subtotal</span><span>${Utils.formatCurrency(totals.subtotal)}</span></div>
        <div class="cart-summary-row"><span>GST</span><span>${Utils.formatCurrency(totals.tax)}</span></div>
        ${totals.convenienceFee > 0 ? `<div class="cart-summary-row"><span>Convenience Fee</span><span>${Utils.formatCurrency(totals.convenienceFee)}</span></div>` : ''}
        <div class="cart-summary-row"><span>Delivery</span><span>${totals.delivery === 0 ? 'FREE' : Utils.formatCurrency(totals.delivery)}</span></div>
        <div class="cart-summary-row total"><span>Total</span><span>${Utils.formatCurrency(totals.total)}</span></div>
        <button class="btn btn-primary" style="width:100%;margin-top:20px" onclick="App.navigate('checkout')">Proceed to Checkout</button>`;
    }
    this.updateBadge();
  },

  buyNow(productId) {
    const product = Products.getProductById(productId);
    if (product && (product.outOfStock === true || product.outOfStock === 'true')) {
      Utils.showToast(`${product.name} is currently out of stock`, 'error');
      return;
    }
    const cart = [{ id: productId, qty: 1 }];
    this.saveCart(cart);
    this.updateBadge();
    App.navigate('checkout');
  },

  clearCart() {
    this.saveCart([]);
    this.renderCart();
  },

  init() {
    this.updateBadge();
  }
};
