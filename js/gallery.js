// ===== YUMEI Bakery — Gallery & Lightbox =====

const Gallery = {
  images: [
    { src: 'assets/images/cheesecake-classic.png', title: 'Classic New York Cheesecake', category: 'cheesecakes' },
    { src: 'assets/images/cheesecake-mango.png', title: 'Mango Bliss Cheesecake', category: 'cheesecakes' },
    { src: 'assets/images/cheesecake-blueberry.png', title: 'Blueberry Dream', category: 'cheesecakes' },
    { src: 'assets/images/cake-chocolate.png', title: 'Belgian Chocolate Cake', category: 'cakes' },
    { src: 'assets/images/cake-redvelvet.png', title: 'Red Velvet Cake', category: 'cakes' },
    { src: 'assets/images/cake-vanilla.png', title: 'Vanilla Bean Cake', category: 'cakes' },
    { src: 'assets/images/cake-pineapple.png', title: 'Pineapple Upside-Down', category: 'cakes' },
    { src: 'assets/images/cookies-chocolate.png', title: 'Chocolate Chunk Cookies', category: 'cookies' },
    { src: 'assets/images/cookies-butter.png', title: 'Butter Cookies', category: 'cookies' },
    { src: 'assets/images/cookies-brownie.png', title: 'Fudge Brownie Cookies', category: 'cookies' },
    { src: 'assets/images/hero-banner.png', title: 'Our Bakery', category: 'bakery' },
  ],

  currentIndex: 0,
  currentFilter: 'all',

  renderGallery(filter = 'all') {
    this.currentFilter = filter;
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;

    const filtered = filter === 'all' ? this.images : this.images.filter(img => img.category === filter);

    grid.innerHTML = filtered.map((img, i) => `
      <div class="gallery-item animate-in" style="animation-delay:${i * 0.06}s" onclick="Gallery.openLightbox(${this.images.indexOf(img)})">
        <img src="${img.src}" alt="${img.title}" loading="lazy">
        <div class="gallery-item-overlay">
          <span>${img.title}</span>
        </div>
      </div>
    `).join('');

    requestAnimationFrame(() => {
      grid.querySelectorAll('.animate-in').forEach(el => el.classList.add('visible'));
    });
  },

  openLightbox(index) {
    this.currentIndex = index;
    const lb = document.getElementById('lightbox');
    if (!lb) return;
    lb.classList.add('active');
    this.updateLightboxImage();
    document.body.style.overflow = 'hidden';
  },

  closeLightbox() {
    const lb = document.getElementById('lightbox');
    if (lb) lb.classList.remove('active');
    document.body.style.overflow = '';
  },

  updateLightboxImage() {
    const img = document.getElementById('lightbox-img');
    const caption = document.getElementById('lightbox-caption');
    if (!img) return;
    const current = this.images[this.currentIndex];
    img.src = current.src;
    img.alt = current.title;
    if (caption) caption.textContent = current.title;
  },

  prevImage() {
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
    this.updateLightboxImage();
  },

  nextImage() {
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
    this.updateLightboxImage();
  },

  initGalleryTabs() {
    document.querySelectorAll('.gallery-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.gallery-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.renderGallery(tab.dataset.category);
      });
    });
  },

  init() {
    this.initGalleryTabs();
    this.renderGallery('all');

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      const lb = document.getElementById('lightbox');
      if (!lb || !lb.classList.contains('active')) return;
      if (e.key === 'Escape') this.closeLightbox();
      if (e.key === 'ArrowLeft') this.prevImage();
      if (e.key === 'ArrowRight') this.nextImage();
    });
  }
};
