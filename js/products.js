// ===== YUMEI Bakery — Product Data & Rendering =====

const PRODUCTS = [
  // Cheesecakes
  { id: 'cc1', name: 'Classic New York Cheesecake', category: 'cheesecakes', price: 749, description: 'Rich, creamy, and velvety smooth. Our signature New York style cheesecake with a buttery graham cracker crust.', image: 'assets/images/cheesecake-classic.png', rating: 4.9, reviews: 142, badge: 'Bestseller' },
  { id: 'cc2', name: 'Mango Bliss Cheesecake', category: 'cheesecakes', price: 849, description: 'Tropical Alphonso mango puree swirled into our silky cheesecake with a mango mirror glaze.', image: 'assets/images/cheesecake-mango.png', rating: 4.7, reviews: 98 },
  { id: 'cc3', name: 'Blueberry Dream Cheesecake', category: 'cheesecakes', price: 799, description: 'Topped with luscious wild blueberry compote and fresh berries on a cinnamon-kissed crust.', image: 'assets/images/cheesecake-blueberry.png', rating: 4.8, reviews: 115 },
  { id: 'cc4', name: 'Chocolate Truffle Cheesecake', category: 'cheesecakes', price: 899, description: 'Decadent Belgian chocolate cheesecake with ganache drizzle and chocolate shavings.', image: 'assets/images/cheesecake-classic.png', rating: 4.8, reviews: 87, badge: 'New' },

  // Cakes
  { id: 'ck1', name: 'Belgian Chocolate Cake', category: 'cakes', price: 699, description: 'Three layers of moist chocolate sponge with rich dark chocolate ganache frosting.', image: 'assets/images/cake-chocolate.png', rating: 4.9, reviews: 203, badge: 'Popular' },
  { id: 'ck2', name: 'Red Velvet Cake', category: 'cakes', price: 749, description: 'Velvety crimson layers paired with our tangy cream cheese frosting.', image: 'assets/images/cake-redvelvet.png', rating: 4.8, reviews: 176 },
  { id: 'ck3', name: 'Vanilla Bean Cake', category: 'cakes', price: 599, description: 'Light and airy vanilla sponge with Madagascar vanilla bean buttercream and edible flowers.', image: 'assets/images/cake-vanilla.png', rating: 4.7, reviews: 134 },
  { id: 'ck4', name: 'Pineapple Upside-Down Cake', category: 'cakes', price: 649, description: 'Caramelized pineapple rings and cherries atop a buttery brown sugar cake.', image: 'assets/images/cake-pineapple.png', rating: 4.6, reviews: 89 },

  // Cookies
  { id: 'co1', name: 'Double Chocolate Chunk Cookies', category: 'cookies', price: 349, description: 'Loaded with premium dark and milk chocolate chunks. Crispy outside, chewy inside.', image: 'assets/images/cookies-chocolate.png', rating: 4.8, reviews: 231, badge: 'Bestseller' },
  { id: 'co2', name: 'Classic Butter Cookies', category: 'cookies', price: 299, description: 'Melt-in-your-mouth Danish style butter cookies in assorted festive shapes.', image: 'assets/images/cookies-butter.png', rating: 4.6, reviews: 167 },
  { id: 'co3', name: 'Fudge Brownie Cookies', category: 'cookies', price: 379, description: 'The ultimate hybrid — fudgy brownie meets chewy cookie with a crinkle top.', image: 'assets/images/cookies-brownie.png', rating: 4.9, reviews: 198, badge: 'New' },
  { id: 'co4', name: 'Oatmeal Raisin Cookies', category: 'cookies', price: 279, description: 'Wholesome oats and plump raisins with a hint of cinnamon and nutmeg.', image: 'assets/images/cookies-butter.png', rating: 4.5, reviews: 112 },
];

const Products = {
  currentCategory: 'all',

  renderStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
  },

  renderProducts(category = 'all') {
    this.currentCategory = category;
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    const filtered = category === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.category === category);

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
            <span class="count">(${p.reviews})</span>
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
    return PRODUCTS.find(p => p.id === id);
  },

  init() {
    this.initCategoryTabs();
    this.renderProducts('all');
  }
};
