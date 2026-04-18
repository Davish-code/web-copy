// ===== YUMEI Bakery — Product Data & Rendering =====

const Products = {
  currentCategory: 'all',
  items: [],

  async loadProducts() {
    try {
      if (!window.FirebaseDB) return false;
      const q = window.FirestoreQuery(window.FirestoreCollection(window.FirebaseDB, "products"));
      const snapshot = await window.FirestoreGetDocs(q);
      this.items = [];
      snapshot.forEach(doc => {
        this.items.push(doc.data());
      });
      return true;
    } catch (err) {
      console.error("Failed to load products: ", err);
      return false;
    }
  },

  renderStars(rating) {
    if (rating === undefined) rating = 0;
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
  },

  renderProducts(category = 'all') {
    this.currentCategory = category;
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    const filtered = category === 'all' ? this.items : this.items.filter(p => p.category === category);

    if (filtered.length === 0) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">No products found in this category.</div>';
      return;
    }

    grid.innerHTML = filtered.map((p, i) => `
      <div class="product-card animate-in" style="animation-delay: ${i * 0.08}s">
        <div class="product-card-img">
          <img src="${p.image}" alt="${p.name}" loading="lazy">
          ${p.badge ? `<span class="product-card-badge">${p.badge}</span>` : ''}
        </div>
        <div class="product-card-body">
          <div class="product-card-category">${p.category}</div>
          <h3>${p.name}</h3>
          <p class="description">${p.description}</p>
          <div class="product-card-rating">
            <span class="stars">${this.renderStars(p.rating)}</span>
            <span class="count">(${p.reviews || 0})</span>
          </div>
          <div class="product-card-footer">
            <span class="product-price">${Utils.formatCurrency(p.price)}</span>
            <div class="product-card-actions">
              <button class="btn btn-sm btn-secondary" onclick="Cart.addToCart('${p.id}')" title="Add to Cart">🛒</button>
              <button class="btn btn-sm btn-primary" onclick="Cart.buyNow('${p.id}')">Buy Now</button>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    // Animate in
    requestAnimationFrame(() => {
      grid.querySelectorAll('.animate-in').forEach(el => el.classList.add('visible'));
    });
  },

  initCategoryTabs() {
    document.querySelectorAll('.category-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.renderProducts(tab.dataset.category);
      });
    });
  },

  getProductById(id) {
    return this.items.find(p => p.id === id);
  },

  async init() {
    this.initCategoryTabs();
    await this.loadProducts();
    this.renderProducts('all');
  }
};
