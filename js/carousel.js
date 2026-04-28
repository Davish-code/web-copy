const Carousel = (function() {
  let currentIndex = 0;
  let slides = [];
  let timer = null;

  async function init() {
    // Wait for Firebase if needed
    if (!window.FirebaseDB) {
      window.addEventListener('firebase-ready', loadData);
    } else {
      loadData();
    }
  }

  async function loadData() {
    try {
      const q = FirestoreQuery(FirestoreCollection(FirebaseDB, "carousel"));
      const snapshot = await FirestoreGetDocs(q);
      slides = [];
      snapshot.forEach(doc => slides.push({ id: doc.id, ...doc.data() }));

      if (slides.length === 0) {
        document.getElementById('carousel-section').style.display = 'none';
        return;
      }

      slides.sort((a, b) => parseInt(a.id) - parseInt(b.id));
      render();
      startAutoPlay();
    } catch (err) {
      console.error("Carousel error:", err);
      document.getElementById('carousel-section').style.display = 'none';
    }
  }

  function render() {
    const container = document.getElementById('carousel-container');
    const dotsContainer = document.getElementById('carousel-dots');
    if (!container || !dotsContainer) return;
    
    container.innerHTML = slides.map((slide, index) => `
      <div class="carousel-slide ${index === 0 ? 'active' : ''}" style="background-image: linear-gradient(rgba(15, 12, 8, 0.4), rgba(15, 12, 8, 0.6)), url('${slide.image}')">
        <div class="carousel-content">
          <h2 class="carousel-title">${slide.title}</h2>
          <p class="carousel-subtitle">${slide.subtitle}</p>
        </div>
      </div>
    `).join('');

    dotsContainer.innerHTML = slides.map((_, index) => `
      <span class="carousel-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></span>
    `).join('');

    // Attach listeners
    document.querySelectorAll('.carousel-dot').forEach(dot => {
      dot.addEventListener('click', (e) => {
        goToSlide(parseInt(e.target.dataset.index));
      });
    });

    document.getElementById('carousel-prev')?.addEventListener('click', prevSlide);
    document.getElementById('carousel-next')?.addEventListener('click', nextSlide);
  }

  function goToSlide(index) {
    const allSlides = document.querySelectorAll('.carousel-slide');
    const allDots = document.querySelectorAll('.carousel-dot');
    
    if (allSlides.length === 0) return;

    // Handle wrap around
    let nextIndex = (index + slides.length) % slides.length;
    
    if (nextIndex === currentIndex) return;

    // Remove active classes
    if (allSlides[currentIndex]) allSlides[currentIndex].classList.remove('active');
    if (allDots[currentIndex]) allDots[currentIndex].classList.remove('active');

    // Update current index
    currentIndex = nextIndex;

    // Add active classes
    if (allSlides[currentIndex]) allSlides[currentIndex].classList.add('active');
    if (allDots[currentIndex]) allDots[currentIndex].classList.add('active');

    resetAutoPlay();
  }

  function nextSlide() {
    goToSlide(currentIndex + 1);
  }

  function prevSlide() {
    goToSlide(currentIndex - 1);
  }

  function startAutoPlay() {
    if (slides.length <= 1) return;
    timer = setInterval(nextSlide, 5000);
  }

  function resetAutoPlay() {
    clearInterval(timer);
    startAutoPlay();
  }

  return {
    init
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  Carousel.init();
});
