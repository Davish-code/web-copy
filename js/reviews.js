// ===== YUMEI Bakery — Reviews & Ratings Module =====

const Reviews = {
  selectedRating: 0,
  currentProductId: null,
  currentOrderId: null,
  userReviews: [], // Cache for user's existing reviews to prevent duplicates

  openModal(productId, orderId) {
    this.currentProductId = productId;
    this.currentOrderId = orderId;
    this.selectedRating = 0;
    
    const product = Products.getProductById(productId);
    if (!product) return;

    const modal = document.getElementById('review-modal-overlay');
    if (!modal) return;

    // Reset UI
    document.getElementById('review-product-name').textContent = product.name;
    document.getElementById('review-comment').value = '';
    this.updateStars(0);

    modal.classList.add('active');
  },

  async loadUserReviews() {
    const user = Auth.getCurrentUser();
    if (!user || !window.FirebaseDB) return;

    try {
      const q = window.FirestoreQuery(
        window.FirestoreCollection(window.FirebaseDB, "reviews"),
        window.FirestoreWhere("userId", "==", user.uid)
      );
      const snapshot = await window.FirestoreGetDocs(q);
      this.userReviews = [];
      snapshot.forEach(doc => {
        this.userReviews.push(doc.data());
      });
    } catch (error) {
      console.error("Error loading user reviews:", error);
    }
  },

  hasUserReviewed(productId) {
    return this.userReviews.some(r => r.productId === productId);
  },

  closeModal() {
    const modal = document.getElementById('review-modal-overlay');
    if (modal) modal.classList.remove('active');
    this.currentProductId = null;
    this.currentOrderId = null;
  },

  updateStars(rating) {
    const stars = document.querySelectorAll('.review-star');
    stars.forEach((star, index) => {
      if (index < rating) {
        star.classList.add('selected');
        star.textContent = '★';
      } else {
        star.classList.remove('selected');
        star.textContent = '☆';
      }
    });
    this.selectedRating = rating;
  },

  async submitReview() {
    if (this.selectedRating === 0) {
      Utils.showToast('Please select a rating', 'error');
      return;
    }

    const comment = document.getElementById('review-comment').value.trim();
    const user = Auth.getCurrentUser();
    if (!user) return;

    const submitBtn = document.querySelector('.btn-submit-review');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
      // 1. Save review to Firestore
      const reviewData = {
        productId: this.currentProductId,
        orderId: this.currentOrderId,
        userId: user.uid,
        userName: user.displayName || 'Customer',
        rating: this.selectedRating,
        comment: comment,
        date: new Date().toISOString()
      };

      await window.FirestoreAddDoc(window.FirestoreCollection(window.FirebaseDB, "reviews"), reviewData);

      // 2. Update product stats (Get current stats first)
      const productRef = window.FirestoreDoc(window.FirebaseDB, "products", this.currentProductId);
      const productSnap = await window.FirestoreGetDoc(productRef);
      
      if (productSnap.exists()) {
        const pData = productSnap.data();
        const currentTotalReviews = pData.reviews || 0;
        const currentRating = pData.rating || 0;
        
        // Calculate new average
        const newTotalReviews = currentTotalReviews + 1;
        const newRating = ((currentRating * currentTotalReviews) + this.selectedRating) / newTotalReviews;

        await window.FirestoreUpdateDoc(productRef, {
          rating: Number(newRating.toFixed(1)),
          reviews: newTotalReviews
        });
      }

      Utils.showToast('Thank you for your review!', 'success');
      this.closeModal();
      
      // Refresh products data and UI
      await Products.loadProducts();
      Products.renderProducts(Products.currentCategory);
      
    } catch (error) {
      console.error("Error submitting review:", error);
      Utils.showToast('Failed to submit review', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  },

  init() {
    // Add event listeners for stars
    const stars = document.querySelectorAll('.review-star');
    stars.forEach((star, index) => {
      star.addEventListener('mouseover', () => {
        // Temporary highlight on hover
        const rating = index + 1;
        stars.forEach((s, i) => {
          s.textContent = i < rating ? '★' : '☆';
        });
      });
      
      star.addEventListener('mouseout', () => {
        // Restore selected rating
        this.updateStars(this.selectedRating);
      });

      star.addEventListener('click', () => {
        this.updateStars(index + 1);
      });
    });
  },

  async showReviewsModal(productId) {
    const product = Products.getProductById(productId);
    if (!product) return;

    const modal = document.getElementById('view-reviews-modal-overlay');
    const container = document.getElementById('reviews-list-container');
    const nameEl = document.getElementById('view-reviews-product-name');
    const statsEl = document.getElementById('view-reviews-stats');

    if (!modal || !container) return;

    // Set UI to loading state
    nameEl.textContent = product.name;
    statsEl.innerHTML = `<span>${Products.renderStars(product.rating)}</span> <span>(${product.reviews || 0} reviews)</span>`;
    container.innerHTML = '<div class="reviews-empty">Loading reviews...</div>';
    modal.classList.add('active');

    try {
      if (!window.FirebaseDB) throw new Error("Firebase not ready");

      const q = window.FirestoreQuery(
        window.FirestoreCollection(window.FirebaseDB, "reviews"),
        window.FirestoreWhere("productId", "==", productId)
      );

      const snapshot = await window.FirestoreGetDocs(q);
      const reviews = [];
      snapshot.forEach(doc => reviews.push(doc.data()));

      // Sort by date (descending) in JS to avoid Firestore composite index requirement
      reviews.sort((a, b) => new Date(b.date) - new Date(a.date));

      this.renderReviewsList(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      container.innerHTML = '<div class="reviews-empty">Could not load reviews. Please try again.</div>';
    }
  },

  renderReviewsList(reviews) {
    const container = document.getElementById('reviews-list-container');
    if (!container) return;

    if (reviews.length === 0) {
      container.innerHTML = `
        <div class="reviews-empty">
          <i>💬</i>
          <p>No reviews yet for this product.<br>Be the first to share your experience!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = reviews.map(r => {
      const date = new Date(r.date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      return `
        <div class="review-item">
          <div class="review-item-header">
            <span class="review-item-user">${r.userName}</span>
            <span class="review-item-rating">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
          </div>
          <p class="review-item-comment">${r.comment || 'No comment provided.'}</p>
          <div class="review-item-date">${date}</div>
        </div>
      `;
    }).join('');
  },

  closeViewModal() {
    const modal = document.getElementById('view-reviews-modal-overlay');
    if (modal) modal.classList.remove('active');
  }
};
