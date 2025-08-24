// --- Super Admin Login Logic ---
document.addEventListener('DOMContentLoaded', function() {
  // Initialize Firebase with Arcular+ config
  const firebaseConfig = {
    apiKey: "AIzaSyBzK4SQ44cv6k8EiNF9B2agNASArWQrstk",
    authDomain: "arcularplus-7e66c.firebaseapp.com",
    projectId: "arcularplus-7e66c",
    storageBucket: "arcularplus-7e66c.firebasestorage.app",
    messagingSenderId: "239874151024",
    appId: "1:239874151024:android:7e0d9de0400c6bb9fb5ab5"
  };

  // Initialize Firebase if not already initialized
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const loginForm = document.getElementById('superadmin-login-form');
  const errorDiv = document.getElementById('superadmin-login-error');

  // Handle login form submission
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('superadmin-email').value;
    const password = document.getElementById('superadmin-password').value;
    
    try {
      // Show loading state
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Logging in...';
      submitBtn.disabled = true;
      
      // Sign in with Firebase
      const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      // Get ID token
      const idToken = await user.getIdToken();
      
      // Store token
      localStorage.setItem('superadmin_idToken', idToken);
      
      // Check if user is admin and create admin record if needed
      try {
        console.log('🔐 Verifying admin access for:', user.email);
        
        const response = await fetch('https://your-render-backend-url.onrender.com/admin/api/admin/verify', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: user.email,
            uid: user.uid,
            displayName: user.displayName || user.email.split('@')[0]
          })
        });
        
        console.log('📡 Response status:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Admin verified successfully:', result);
          // User is authenticated and authorized, redirect to dashboard
          window.location.href = 'index.html';
        } else {
          const errorData = await response.json();
          console.error('❌ Admin verification failed:', errorData);
          throw new Error(errorData.message || 'Unauthorized access');
        }
      } catch (error) {
        console.error('❌ Admin verification error:', error);
        // User is not admin, sign out and show error
        await firebase.auth().signOut();
        localStorage.removeItem('superadmin_idToken');
        throw new Error('Access denied. You are not authorized as a super admin.');
      }
      
    } catch (error) {
      console.error('Login error:', error);
      
      // Show error message
      errorDiv.innerHTML = `
        <div class="error-message" style="color: red; background: #ffe6e6; padding: 10px; border-radius: 5px; margin: 10px 0;">
          ${error.message}
        </div>
      `;
      
      // Reset form
      document.getElementById('superadmin-password').value = '';
    } finally {
      // Reset button state
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      submitBtn.textContent = 'Login';
      submitBtn.disabled = false;
    }
  });

  // Check if user is already logged in
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // User is signed in, check if they have a valid token
      const idToken = localStorage.getItem('superadmin_idToken');
      if (idToken) {
        // Redirect to dashboard if already authenticated
        window.location.href = 'index.html';
      }
    }
  });
});
