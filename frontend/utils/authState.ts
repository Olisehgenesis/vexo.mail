// utils/authState.js
// This is a simple global state manager for auth - no hooks required

/**
 * Global auth state that can be accessed and modified from anywhere
 */
const authState = {
  user: null,
  isLoggedIn: false,
  
  // Initialize from localStorage
  init: function() {
    if (typeof window === 'undefined') return false;
    
    try {
      // Try to get user from localStorage
      const savedUser = localStorage.getItem('vexo_user_data');
      if (savedUser) {
        this.user = JSON.parse(savedUser);
        this.isLoggedIn = true;
        console.log('Auth state initialized from localStorage:', this.user);
        return true;
      }
    } catch (e) {
      console.error('Error initializing auth state:', e);
    }
    return false;
  },
  
  // Set user data and update localStorage
  setUser: function(userData) {
    if (typeof window === 'undefined') return false;
    
    if (userData) {
      this.user = userData;
      this.isLoggedIn = true;
      
      try {
        localStorage.setItem('vexo_user_data', JSON.stringify(userData));
        console.log('Auth state updated:', userData);
        
        // Dispatch an event that components can listen for
        window.dispatchEvent(new CustomEvent('auth-state-change', { 
          detail: { user: userData, isLoggedIn: true } 
        }));
      } catch (e) {
        console.error('Error saving user data to localStorage:', e);
      }
      
      return true;
    }
    return false;
  },
  
  // Clear user data
  clearUser: function() {
    if (typeof window === 'undefined') return false;
    
    this.user = null;
    this.isLoggedIn = false;
    
    try {
      localStorage.removeItem('vexo_user_data');
      console.log('Auth state cleared');
      
      // Dispatch an event that components can listen for
      window.dispatchEvent(new CustomEvent('auth-state-change', { 
        detail: { user: null, isLoggedIn: false } 
      }));
    } catch (e) {
      console.error('Error clearing user data from localStorage:', e);
    }
    
    return true;
  },
  
  // Check if a token exists and not expired
  hasValidToken: function() {
    if (typeof window === 'undefined') return false;
    
    try {
      const token = localStorage.getItem('vexo_token');
      if (!token) return false;
      
      // Parse token to check expiration
      const parts = token.split('.');
      if (parts.length !== 3) return false;
      
      const payload = JSON.parse(atob(parts[1]));
      if (!payload.exp) return false;
      
      // Check if token is expired
      return payload.exp * 1000 > Date.now();
    } catch (e) {
      console.error('Error checking token validity:', e);
      return false;
    }
  },
  
  // Auto initialize on import
  initialize: function() {
    if (typeof window !== 'undefined') {
      // Only run in browser
      this.init();
      
      // If we have a valid token but no user, try to force login
      if (this.hasValidToken() && !this.isLoggedIn) {
        console.log('Valid token found but no user data. You might need to force login.');
      }
    }
  }
};

// Initialize on import if in browser
authState.initialize();

export default authState;