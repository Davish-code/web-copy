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
  }
};
