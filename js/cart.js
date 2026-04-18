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
    const subtotal = cart.reduce((sum, item) => {
      const product = Products.getProductById(item.id);
      return sum + (product ? product.price * item.qty : 0);
    }, 0);
    const tax = Math.round(subtotal * 0.05);
    const delivery = subtotal > 0 ? (subtotal >= 1000 ? 0 : 49) : 0;
    return { subtotal, tax, delivery, total: subtotal + tax + delivery };
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
        <div class="cart-summary-row"><span>GST (5%)</span><span>${Utils.formatCurrency(totals.tax)}</span></div>
        <div class="cart-summary-row"><span>Delivery</span><span>${totals.delivery === 0 ? 'FREE' : Utils.formatCurrency(totals.delivery)}</span></div>
        <div class="cart-summary-row total"><span>Total</span><span>${Utils.formatCurrency(totals.total)}</span></div>
        <button class="btn btn-primary" style="width:100%;margin-top:20px" onclick="App.navigate('checkout')">Proceed to Checkout</button>`;
    }
    this.updateBadge();
  },

  buyNow(productId) {
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
