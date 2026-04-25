// ===== YUMEI Bakery — Product Data & Rendering =====

const Products = {
  currentCategory: 'all',
  items: [],
  categories: [],
  categoryEmojis: {
    'cheesecakes': '🧀',
    'cakes': '🎂',
    'cookies': '🍪'
  },

  async loadProducts() {
    try {
      if (!window.FirebaseDB) return false;
      const q = window.FirestoreQuery(window.FirestoreCollection(window.FirebaseDB, "products"));
      const snapshot = await window.FirestoreGetDocs(q);
      this.items = [];
      snapshot.forEach(doc => {
        this.items.push(doc.data());
      });

      // Extract unique categories
      const unique = [...new Set(this.items.map(p => p.category).filter(Boolean))];
      // Ensure defaults are there if they exist in items, or just take all unique
      this.categories = unique.sort();

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

    grid.innerHTML = filtered.map((p, i) => {
      const isOutOfStock = p.outOfStock === true || p.outOfStock === 'true';
      return `
      <div class="product-card animate-in ${isOutOfStock ? 'out-of-stock' : ''}" style="animation-delay: ${i * 0.08}s">
        <div class="product-card-img">
          <img src="${p.image}" alt="${p.name}" loading="lazy"
               onerror="this.src=''; this.onerror=null; this.style.background='var(--surface-2)';">
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
            <span class="product-price">${Utils.formatCurrency(Utils.getInclusivePrice(p.price, p.gst))}</span>
            <div class="product-card-actions">
              <button class="btn btn-sm btn-secondary" onclick="Cart.addToCart('${p.id}')" title="Add to Cart" ${isOutOfStock ? 'disabled' : ''}>🛒</button>
              <button class="btn btn-sm btn-primary" onclick="Cart.buyNow('${p.id}')" ${isOutOfStock ? 'disabled' : ''}>
                ${isOutOfStock ? 'Out of Stock' : 'Buy Now'}
              </button>
            </div>
          </div>
        </div>
      </div>
    `}).join('');

    // Animate in
    requestAnimationFrame(() => {
      grid.querySelectorAll('.animate-in').forEach(el => el.classList.add('visible'));
    });
  },

  // Show skeleton placeholders while Firestore data loads
  showSkeletons() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    grid.innerHTML = Array(6).fill(0).map(() => `
      <div class="product-card" style="pointer-events:none;">
        <div class="product-card-img" style="background: linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3, #2a2a3a) 50%, var(--surface-2) 75%); background-size: 200% 100%; animation: skeleton-shimmer 1.4s infinite;"></div>
        <div class="product-card-body">
          <div style="height:12px; width:50%; border-radius:6px; background:var(--surface-2); margin-bottom:10px; animation: skeleton-shimmer 1.4s infinite;"></div>
          <div style="height:18px; width:80%; border-radius:6px; background:var(--surface-2); margin-bottom:8px; animation: skeleton-shimmer 1.4s infinite;"></div>
          <div style="height:12px; width:90%; border-radius:6px; background:var(--surface-2); margin-bottom:6px; animation: skeleton-shimmer 1.4s infinite;"></div>
          <div style="height:12px; width:60%; border-radius:6px; background:var(--surface-2); animation: skeleton-shimmer 1.4s infinite;"></div>
        </div>
      </div>
    `).join('');
  },

  renderCategoryTabs() {
    const container = document.getElementById('category-tabs-menu');
    if (!container) return;

    const categories = ['all', ...this.categories];
    
    container.innerHTML = categories.map(cat => {
      const isActive = cat === this.currentCategory;
      const emoji = this.categoryEmojis[cat.toLowerCase()] || '🍰';
      const label = cat === 'all' ? 'All' : `${emoji} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`;
      
      return `<button class="category-tab ${isActive ? 'active' : ''}" data-category="${cat}">${label}</button>`;
    }).join('');

    // Also update footer categories if it exists
    const footerContainer = document.getElementById('footer-categories');
    if (footerContainer) {
      footerContainer.innerHTML = this.categories.map(cat => {
        const label = cat.charAt(0).toUpperCase() + cat.slice(1);
        return `<li><a href="#" onclick="Products.filterAndNavigate('${cat}')">${label}</a></li>`;
      }).join('');
    }
  },

  filterAndNavigate(category) {
    this.currentCategory = category;
    App.navigate('menu');
    // The renderProducts call is already triggered by App.navigate('menu') if we set it up right,
    // or we can call it here explicitly to be sure.
    this.renderProducts(category);
    
    // Also update active tab UI in the menu section
    const container = document.getElementById('category-tabs-menu');
    if (container) {
      container.querySelectorAll('.category-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.category === category);
      });
    }
  },

  initCategoryTabs() {
    const container = document.getElementById('category-tabs-menu');
    if (!container) return;

    container.addEventListener('click', (e) => {
      const tab = e.target.closest('.category-tab');
      if (!tab) return;

      container.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      this.renderProducts(tab.dataset.category);
    });
  },

  getProductById(id) {
    return this.items.find(p => p.id === id);
  },

  async init() {
    this.initCategoryTabs();
    this.showSkeletons(); // Show loading skeletons immediately

    // Wait for Firebase module to finish initializing
    // Handles the case where firebase-init.js (type="module") fires after DOMContentLoaded
    await new Promise(resolve => {
      if (window.FirebaseDB) {
        resolve();
      } else {
        window.addEventListener('firebase-ready', resolve, { once: true });
      }
    });

    await this.loadProducts();
    this.renderCategoryTabs(); // Render dynamic tabs
    this.renderProducts('all');
  }
};
