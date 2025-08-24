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
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';
      submitBtn.disabled = true;
      
      // Clear previous errors
      errorDiv.innerHTML = '';
      
      console.log('🔐 Attempting Firebase login for:', email);
      
      // Sign in with Firebase
      const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      console.log('✅ Firebase login successful for:', email);
      
      // Get ID token
      const idToken = await user.getIdToken();
      localStorage.setItem('superadmin_idToken', idToken);
      
      console.log('🔐 Verifying admin access for:', user.email);
      
      // Verify admin access with backend
      const response = await fetch('https://arcular-plus-backend.onrender.com/admin/api/admin/verify', {
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
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Admin verified successfully:', result);
        
        // Check if admin profile is complete
        if (result.data && result.data.profileComplete) {
          // Profile complete, redirect to dashboard
          window.location.href = 'admin_dashboard.html';
        } else {
          // Profile incomplete, redirect to profile page
          window.location.href = 'admin_profile.html';
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to verify admin access');
      }
      
    } catch (error) {
      console.error('❌ Login error:', error);
      
      // Show error message
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      errorDiv.innerHTML = `
        <div class="error-message">
          <i class="fa-solid fa-exclamation-triangle"></i> ${errorMessage}
        </div>
      `;
      
    } finally {
      // Reset button state
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });

  // Check if user is already logged in
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // User is already logged in, check if they have a token
      const idToken = localStorage.getItem('superadmin_idToken');
      if (idToken) {
        // Redirect based on profile completion status
        // This will be handled by the verification endpoint
        console.log('User already logged in, checking profile status...');
      }
    }
  });
});
