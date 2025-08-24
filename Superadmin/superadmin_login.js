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
    
    // Show loading state
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    try {
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
      
      // Check if admin profile already exists in MongoDB
      try {
        const profileResponse = await fetch(`https://arcular-plus-backend.onrender.com/admin/api/admin/profile/${user.uid}`, {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });
        
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          console.log('✅ Admin profile found:', profileData);
          
          // Profile exists, redirect directly to dashboard
          window.location.href = 'admin_dashboard.html';
        } else if (profileResponse.status === 404) {
          // Profile doesn't exist, create admin record first
          console.log('🔐 Creating new admin record...');
          
          const verifyResponse = await fetch('https://arcular-plus-backend.onrender.com/admin/api/admin/verify', {
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
          
          if (verifyResponse.ok) {
            const result = await verifyResponse.json();
            console.log('✅ Admin record created successfully:', result);
            
            // New admin, redirect to profile page
            window.location.href = 'admin_profile.html';
          } else {
            const errorData = await verifyResponse.json();
            throw new Error(errorData.message || 'Failed to create admin record');
          }
        } else {
          throw new Error('Failed to check admin profile');
        }
      } catch (fetchError) {
        console.error('❌ Fetch error:', fetchError);
        if (fetchError.name === 'TypeError' && fetchError.message.includes('Failed to fetch')) {
          throw new Error('Network error: Unable to connect to server. Please check your internet connection and try again.');
        }
        throw fetchError;
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
        // User is already authenticated, redirect to dashboard
        console.log('User already logged in, redirecting to dashboard...');
        window.location.href = 'admin_dashboard.html';
      }
    }
  });
});
