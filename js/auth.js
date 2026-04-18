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

  updateNavUI() {
    const user = this.getCurrentUser();
    const profileIcon = document.getElementById('nav-profile-icon');
    if (profileIcon) {
      if (user) {
        const initial = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
        profileIcon.innerHTML = initial;
        profileIcon.style.background = 'linear-gradient(135deg, var(--accent-gold), var(--accent-rose))';
        profileIcon.style.color = '#fff';
        profileIcon.style.fontSize = '0.85rem';
        profileIcon.style.fontWeight = '700';
      } else {
        profileIcon.innerHTML = '👤';
        profileIcon.style.background = '';
        profileIcon.style.color = '';
        profileIcon.style.fontSize = '';
        profileIcon.style.fontWeight = '';
      }
    }
  },

  renderProfileSection() {
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
      section.innerHTML = `
        <div class="profile-container">
          <div class="profile-header">
            <div class="profile-avatar">${initial}</div>
            <div class="profile-info">
              <h2>${user.displayName || 'User'}</h2>
              <p>${user.email}</p>
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
