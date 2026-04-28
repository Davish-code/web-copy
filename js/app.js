// ===== YUMEI Bakery — Main App Controller =====

const App = {
  currentSection: 'hero',

  sections: ['hero', 'menu', 'gallery', 'cart', 'checkout', 'profile'],

  navigate(sectionId) {
    // Hide all page sections
    document.querySelectorAll('.page-section').forEach(s => s.classList.add('section-hidden'));
    
    // Show hero always or specific section
    const heroEl = document.getElementById('hero');
    if (sectionId === 'hero') {
      if (heroEl) heroEl.style.display = '';
      document.getElementById('carousel-section')?.classList.remove('section-hidden');
      document.getElementById('menu')?.classList.remove('section-hidden');
      document.getElementById('gallery-section')?.classList.remove('section-hidden');
      document.getElementById('outlet-map')?.classList.remove('section-hidden');
    } else {
      if (heroEl) heroEl.style.display = 'none';
      const target = document.getElementById(sectionId);
      if (target) target.classList.remove('section-hidden');
    }

    // Update active nav link
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-links a[data-section="${sectionId}"]`);
    if (activeLink) activeLink.classList.add('active');

    // Trigger renders
    if (sectionId === 'cart') Cart.renderCart();
    if (sectionId === 'checkout') Checkout.renderCheckout();  // async, pre-fills saved address
    if (sectionId === 'profile') Auth.renderProfileSection();
    if (sectionId === 'menu') Products.renderProducts(Products.currentCategory);

    this.currentSection = sectionId;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Close mobile menu
    document.querySelector('.nav-links')?.classList.remove('open');
    document.querySelector('.hamburger')?.classList.remove('active');
  },

  initNavigation() {
    // Nav link clicks
    document.querySelectorAll('.nav-links a[data-section]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigate(link.dataset.section);
      });
    });

    // Logo click -> home
    document.querySelector('.nav-logo')?.addEventListener('click', () => this.navigate('hero'));

    // Cart icon
    document.getElementById('nav-cart-btn')?.addEventListener('click', () => this.navigate('cart'));

    // Profile icon
    document.getElementById('nav-profile-btn')?.addEventListener('click', () => this.navigate('profile'));

    // Hamburger toggle
    document.querySelector('.hamburger')?.addEventListener('click', function() {
      this.classList.toggle('active');
      document.querySelector('.nav-links').classList.toggle('open');
    });

    // Scroll effect for navbar
    window.addEventListener('scroll', () => {
      const navbar = document.querySelector('.navbar');
      if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
  },

  initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.animate-in').forEach(el => observer.observe(el));
  },

  async init() {
    this.initNavigation();
    
    // Load dynamic store configuration first
    await Config.load();
    this.updateInfoPlaceholders();

    Products.init();
    Cart.init();
    Auth.init();
    Gallery.init();
    Reviews.init();
    this.initScrollAnimations();

    // Show home by default
    this.navigate('hero');
  },

  updateInfoPlaceholders() {
    const freeLimit = document.getElementById('info-free-limit');
    const delCharge = document.getElementById('info-delivery-charge');
    if (freeLimit) freeLimit.innerText = `₹${Config.data.freeDeliveryMin.toLocaleString('en-IN')}`;
    if (delCharge) delCharge.innerText = `₹${Config.data.deliveryCharge.toLocaleString('en-IN')}`;
  }
};

// Start the app
document.addEventListener('DOMContentLoaded', () => App.init());
