// ===== YUMEI Bakery — Config Module =====

const Config = {
  data: {
    deliveryCharge: 49,
    freeDeliveryMin: 1000,
    convenienceFeeEnabled: false,
    convenienceFeeAmount: 0,
    discountEnabled: false,
    discountPercentage: 0
  },

  async load() {
    try {
      // Wait for Firebase to be ready
      if (!window.FirebaseDB) {
        await new Promise(resolve => {
          window.addEventListener('firebase-ready', resolve, { once: true });
          // Fallback timeout in case event already fired
          setTimeout(resolve, 2000);
        });
      }

      if (!window.FirebaseDB || !window.FirestoreDoc || !window.FirestoreGetDoc) {
         console.warn("Firebase not initialized for config loading");
         return;
      }

      const ref = window.FirestoreDoc(window.FirebaseDB, "settings", "store_config");
      const snap = await window.FirestoreGetDoc(ref);
      
      if (snap.exists()) {
        this.data = { ...this.data, ...snap.data() };
        console.log("Store config loaded:", this.data);
      }
    } catch (err) {
      console.warn("Could not load store config, using defaults:", err);
    }
  }
};
