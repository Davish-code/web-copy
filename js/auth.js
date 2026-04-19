// ===== YUMEI Bakery — Auth Module =====

const Auth = {
  currentUser: null,

  getCurrentUser() {
    return this.currentUser;
  },

  async signInWithGoogle() {
    if (!window.FirebaseAuth || !window.FirebaseSignIn) {
      Utils.showToast('Firebase not initialized yet. Please wait.', 'error');
      return;
    }
    try {
      const result = await window.FirebaseSignIn(window.FirebaseAuth, window.FirebaseGoogleProvider);
      Utils.showToast(`Welcome, ${result.user.displayName || 'Guest'}!`, 'success');
    } catch (error) {
      console.error("Auth error:", error);
      Utils.showToast('Authentication failed', 'error');
    }
  },

  async logout() {
    if (window.FirebaseSignOut && window.FirebaseAuth) {
      try {
        await window.FirebaseSignOut(window.FirebaseAuth);
        Utils.showToast('Logged out successfully', 'info');
      } catch (error) {
        console.error("Logout error:", error);
      }
    }
  },

  async updateNavUI() {
    const user = this.getCurrentUser();
    const profileIcon = document.getElementById('nav-profile-icon');
    const navAddress = document.getElementById('nav-address-text');
    
    if (profileIcon) {
      if (user) {
        const initial = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
        profileIcon.innerHTML = initial;
        profileIcon.classList.add('logged-in');
        
        // Load and show address in navbar
        if (navAddress) {
          const profile = await Checkout.loadSavedProfile(user.uid);
          if (profile && profile.address) {
            // Extract a short version of the address (e.g., city or first part)
            const parts = profile.address.split(',');
            navAddress.innerHTML = parts[0]; 
          } else {
            navAddress.innerHTML = '';
          }
        }
      } else {
        profileIcon.innerHTML = '👤';
        profileIcon.classList.remove('logged-in');
        if (navAddress) navAddress.innerHTML = '';
      }
    }
  },

  async renderProfileSection() {
    const section = document.getElementById('profile-content');
    if (!section) return;

    const user = this.getCurrentUser();

    if (!user) {
      section.innerHTML = `
        <div class="auth-container" style="text-align:center; padding: 40px 20px;">
          <h2 style="margin-bottom:8px;">Welcome to YUMEI</h2>
          <p style="color:var(--text-muted);margin-bottom:24px;">Sign in to manage your orders</p>
          <button class="btn btn-primary" onclick="Auth.signInWithGoogle()" style="display:inline-flex;align-items:center;gap:10px;">
            <svg style="width:20px;height:20px;background:white;border-radius:50%;padding:2px;" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
        </div>`;
    } else {
      const initial = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
      
      // Load saved address
      let savedAddress = 'Loading address...';
      const saved = await Checkout.loadSavedProfile(user.uid);
      if (saved && saved.address) {
        savedAddress = saved.address;
      } else {
        savedAddress = 'No address set yet';
      }

      section.innerHTML = `
        <div class="profile-container">
          <div class="profile-header">
            <div class="profile-avatar">${initial}</div>
            <div class="profile-info">
              <h2>${user.displayName || 'User'}</h2>
              <p>${user.email}</p>
              <div class="profile-location" id="profile-location-box">
                <i class="location-icon">📍</i>
                <div class="location-details">
                  <span id="location-address">${savedAddress}</span>
                  <button class="location-btn" onclick="Auth.fetchCurrentLocation()">
                    <span class="btn-text">Update Location via GPS</span>
                    <span class="btn-loader" style="display:none">📍 Fetching...</span>
                  </button>
                  <span style="color:var(--text-muted); font-size: 0.7rem; margin: 0 4px;">or</span>
                  <button class="location-btn" onclick="Auth.showManualAddressInput()">
                    <span>Enter manually</span>
                  </button>
                </div>
              </div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="Auth.logout()" style="margin-left:auto">Logout</button>
          </div>
          <h3 style="margin-bottom:20px;color:var(--text-secondary)">Your Orders</h3>
          <div id="profile-orders">
            <div style="padding: 20px; text-align: center; color: var(--text-muted);">Loading orders...</div>
          </div>
        </div>`;
      Orders.renderOrderHistory('profile-orders');
    }
  },

  async fetchCurrentLocation() {
    if (!navigator.geolocation) {
      Utils.showToast("Geolocation is not supported by your browser", "error");
      return;
    }

    const user = this.getCurrentUser();
    if (!user) return;

    const btn = document.querySelector('.location-btn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    const addressSpan = document.getElementById('location-address');

    btn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline';

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      
      try {
        // Reverse Geocoding using Nominatim (OpenStreetMap)
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
        const data = await response.json();
        
        if (data && data.display_name) {
          const address = data.display_name;
          addressSpan.innerText = address;
          
          // Save to profile
          const currentProfile = await Checkout.loadSavedProfile(user.uid) || {};
          await Checkout.saveProfileDetails(user.uid, {
            ...currentProfile,
            address: address
          });
          
          // Sync navbar
          this.updateNavUI();
          
          Utils.showToast("Location updated successfully!", "success");
        } else {
          Utils.showToast("Could not determine address from coordinates", "error");
        }
      } catch (error) {
        console.error("Geocoding error:", error);
        Utils.showToast("Failed to fetch address details", "error");
      } finally {
        btn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
      }
    }, (error) => {
      console.error("Geolocation error:", error);
      let msg = "Could not get your location";
      
      switch(error.code) {
        case 1: // PERMISSION_DENIED
          msg = "Permission denied. Please enable location in your browser settings.";
          break;
        case 2: // POSITION_UNAVAILABLE
          msg = "Location unavailable. Check your device GPS/Wi-Fi.";
          break;
        case 3: // TIMEOUT
          msg = "Request timed out. Please try again.";
          break;
      }
      
      // Special check for file:// protocol
      if (window.location.protocol === 'file:') {
        msg = "GPS requires a server (http/https). It won't work opening the file directly.";
      }

      Utils.showToast(msg, "error");
      
      btn.disabled = false;
      btnText.style.display = 'inline';
      btnLoader.style.display = 'none';
    }, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });
  },
  
  showManualAddressInput() {
    const detailsContainer = document.querySelector('.location-details');
    if (!detailsContainer) return;
    
    const currentAddress = document.getElementById('location-address').innerText;
    const isPlaceholder = currentAddress === 'No address set yet' || currentAddress === 'Loading address...';
    
    detailsContainer.innerHTML = `
      <div class="manual-address-form">
        <textarea id="manual-address-input" class="manual-address-input" rows="2" placeholder="Enter your full address">${isPlaceholder ? '' : currentAddress}</textarea>
        <div class="manual-address-actions">
          <button class="manual-address-btn save" onclick="Auth.saveManualAddress()">Save Address</button>
          <button class="manual-address-btn cancel" onclick="Auth.cancelManualAddress()">Cancel</button>
        </div>
      </div>
    `;
    
    // Auto focus and place cursor at end
    const input = document.getElementById('manual-address-input');
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  },

  async saveManualAddress() {
    const input = document.getElementById('manual-address-input');
    const address = input.value.trim();
    const user = this.getCurrentUser();
    
    if (!user) return;
    if (!address) {
      Utils.showToast("Please enter an address", "error");
      return;
    }
    
    const saveBtn = document.querySelector('.manual-address-btn.save');
    saveBtn.disabled = true;
    saveBtn.innerText = 'Saving...';
    
    try {
      const currentProfile = await Checkout.loadSavedProfile(user.uid) || {};
      await Checkout.saveProfileDetails(user.uid, {
        ...currentProfile,
        address: address
      });
      
      Utils.showToast("Address saved successfully!", "success");
      this.updateNavUI();
      this.renderProfileSection(); // Refresh the whole section to show the updated address normally
    } catch (error) {
      console.error("Save address error:", error);
      Utils.showToast("Failed to save address", "error");
      saveBtn.disabled = false;
      saveBtn.innerText = 'Save Address';
    }
  },

  cancelManualAddress() {
    this.renderProfileSection(); // Just re-render to go back to original state
  },

  init() {
    this.updateNavUI();
    this.renderProfileSection();
    
    // Poll for Firebase initialization (since it loads async as module)
    const checkFirebase = setInterval(() => {
      if (window.FirebaseOnAuthStateChanged && window.FirebaseAuth) {
        clearInterval(checkFirebase);
        window.FirebaseOnAuthStateChanged(window.FirebaseAuth, (user) => {
          this.currentUser = user;
          this.updateNavUI();
          // Re-render profile if currently on profile page
          if (App.currentSection === 'profile') {
            this.renderProfileSection();
          }
        });
      }
    }, 100);
  }
};
