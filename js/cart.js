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
    // Only merge if no add-ons on this item
    const existing = cart.find(item => item.id === productId && !item.addons?.length);

    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({ id: productId, qty, addons: [], addonExtra: 0, cookingRequest: '' });
    }

    this.saveCart(cart);
    Utils.showToast(`${product.name} added to cart!`, 'success');
    this.renderCart();
  },

  // Called by Addons module after user selects options
  addToCartWithAddons(productId, qty = 1, addons = [], addonExtra = 0, cookingRequest = '') {
    const product = Products.getProductById(productId);
    if (!product) return;

    if (product.outOfStock === true || product.outOfStock === 'true') {
      Utils.showToast(`${product.name} is currently out of stock`, 'error');
      return;
    }

    const cart = this.getCart();
    // Each add-on combo is stored as a separate line item (so user can have multiple combos)
    cart.push({ id: productId, qty, addons, addonExtra, cookingRequest });

    this.saveCart(cart);
    Utils.showToast(`${product.name} added to cart!`, 'success');
    this.renderCart();
  },

  removeFromCart(productId, cartIndex) {
    let cart = this.getCart();
    if (cartIndex !== undefined) {
      cart.splice(cartIndex, 1);
    } else {
      cart = cart.filter(item => item.id !== productId);
    }
    this.saveCart(cart);
    Utils.showToast('Item removed from cart', 'info');
    this.renderCart();
  },

  updateQuantity(productId, qty, cartIndex) {
    const cart = this.getCart();
    const item = cartIndex !== undefined ? cart[cartIndex] : cart.find(i => i.id === productId);
    if (!item) return;

    if (qty <= 0) {
      this.removeFromCart(productId, cartIndex);
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
        let itemInclusivePrice = Utils.getInclusivePrice(product.price, product.gst);

        if (Config.data.discountEnabled && Config.data.discountPercentage > 0) {
          const discountAmount = itemInclusivePrice * (Config.data.discountPercentage / 100);
          itemInclusivePrice = Math.round(itemInclusivePrice - discountAmount);
        }

        // Add add-on extras to the unit price
        const addonExtra = item.addonExtra || 0;
        const unitPrice = itemInclusivePrice + addonExtra;
        const itemTotalInclusive = unitPrice * item.qty;

        const itemBasePrice = itemInclusivePrice / (1 + (product.gst / 100));
        const itemTax = (itemInclusivePrice - itemBasePrice) * item.qty;

        subtotal += itemTotalInclusive;
        tax += itemTax;
      }
    });

    tax = Math.round(tax);
    subtotal = Math.round(subtotal);

    // Dynamic delivery and convenience fee
    const { freeDeliveryMin, deliveryCharge, convenienceFeeEnabled, convenienceFeeAmount } = Config.data;
    const delivery = subtotal > 0 ? (subtotal >= freeDeliveryMin ? 0 : deliveryCharge) : 0;
    const convenienceFee = (subtotal > 0 && convenienceFeeEnabled) ? convenienceFeeAmount : 0;

    return {
      subtotal,
      tax,
      delivery,
      convenienceFee,
      total: subtotal + delivery + convenienceFee
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

    container.innerHTML = cart.map((item, idx) => {
      const p = Products.getProductById(item.id);
      if (!p) return '';

      // Add-ons display tags
      const addonsHtml = (item.addons && item.addons.length > 0)
        ? `<div style="margin-top:5px; display:flex; flex-wrap:wrap; gap:4px;">
            ${item.addons.map(a => `
              <span style="font-size:0.72rem; padding:2px 8px; background:rgba(252,225,213,0.08); border:1px solid var(--border-color); border-radius:20px; color:var(--text-muted);">
                ${a.name}${a.price > 0 ? ` +${Utils.formatCurrency(a.price)}` : ''}
              </span>`).join('')}
          </div>`
        : '';
      const cookingHtml = item.cookingRequest
        ? `<div style="margin-top:5px; font-size:0.78rem; color:var(--text-muted); font-style:italic;">📝 ${item.cookingRequest}</div>`
        : '';

      return `
        <div class="cart-item">
          <div class="cart-item-img"><img src="${p.image}" alt="${p.name}"></div>
          <div class="cart-item-info">
            <h4>${p.name}</h4>
            <span class="cart-item-cat">${p.category}</span>
            ${addonsHtml}
            ${cookingHtml}
          </div>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="Cart.updateQuantity('${p.id}', ${item.qty - 1}, ${idx})">−</button>
            <span>${item.qty}</span>
            <button class="qty-btn" onclick="Cart.updateQuantity('${p.id}', ${item.qty + 1}, ${idx})">+</button>
          </div>
          <div class="cart-item-price">
            ${(() => {
              let originalPrice = Utils.getInclusivePrice(p.price, p.gst);
              let finalPrice = originalPrice;
              if (Config.data.discountEnabled && Config.data.discountPercentage > 0) {
                finalPrice = Math.round(originalPrice - (originalPrice * (Config.data.discountPercentage / 100)));
              }
              const unitWithAddons = finalPrice + (item.addonExtra || 0);
              if (Config.data.discountEnabled && Config.data.discountPercentage > 0) {
                return `
                  <div style="display:flex; flex-direction:column; align-items:flex-end;">
                    <del style="font-size:0.75em; color:var(--text-muted); line-height:1;">${Utils.formatCurrency(originalPrice * item.qty)}</del>
                    <span>${Utils.formatCurrency(unitWithAddons * item.qty)}</span>
                  </div>
                `;
              }
              return Utils.formatCurrency(unitWithAddons * item.qty);
            })()}
          </div>
          <button class="cart-item-remove" onclick="Cart.removeFromCart('${p.id}', ${idx})" title="Remove">✕</button>
        </div>`;
    }).join('');


    if (summaryEl) {
      const totals = this.getCartTotal();
      summaryEl.style.display = 'block';
      summaryEl.innerHTML = `
        <div class="cart-summary-row"><span>Subtotal</span><span>${Utils.formatCurrency(totals.subtotal)}</span></div>
        <div class="cart-summary-row" style="font-size:0.85rem; color:var(--text-muted);"><span>Includes GST</span><span>${Utils.formatCurrency(totals.tax)}</span></div>
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
    const cart = [{ id: productId, qty: 1, addons: [], addonExtra: 0, cookingRequest: '' }];
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
