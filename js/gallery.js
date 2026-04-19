// ===== YUMEI Bakery — Gallery & Lightbox =====

const Gallery = {
  images: [], // Now populated from Firestore

  currentIndex: 0,
  currentFilter: 'all',

  async fetchGallery() {
    if (!window.FirebaseDB) return;
    try {
      const q = window.FirestoreQuery(
        window.FirestoreCollection(window.FirebaseDB, "gallery"),
        window.FirestoreOrderBy("uploadedAt", "desc")
      );
      const snapshot = await window.FirestoreGetDocs(q);
      this.images = [];
      snapshot.forEach(doc => this.images.push(doc.data()));
      
      this.renderGallery(this.currentFilter);
    } catch (err) {
      console.error("Error fetching gallery:", err);
    }
  },

  renderGallery(filter = 'all') {
    this.currentFilter = filter;
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;

    if (this.images.length === 0) {
      grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted);">No gallery photos available yet.</div>`;
      return;
    }

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
    if (!current) return;
    img.src = current.src;
    img.alt = current.title;
    if (caption) caption.textContent = current.title;
  },

  prevImage() {
    if (this.images.length === 0) return;
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
    this.updateLightboxImage();
  },

  nextImage() {
    if (this.images.length === 0) return;
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
    
    // Check if Firebase is already ready, otherwise wait for event
    if (window.FirebaseDB) {
      this.fetchGallery();
    } else {
      window.addEventListener('firebase-ready', () => {
        this.fetchGallery();
      });
    }

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

// Initialize Gallery
Gallery.init();
