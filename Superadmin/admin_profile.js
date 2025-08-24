// --- Admin Profile Setup Logic ---
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

  // Check if user is authenticated
  const idToken = localStorage.getItem('superadmin_idToken');
  if (!idToken) {
    // No token, redirect to login
    window.location.href = 'superadmin_login.html';
    return;
  }

  // Check Firebase auth state
  firebase.auth().onAuthStateChanged(function(user) {
    if (!user) {
      // User not authenticated, redirect to login
      localStorage.removeItem('superadmin_idToken');
      window.location.href = 'superadmin_login.html';
      return;
    }
    
    // User is authenticated, load existing profile data if available
    loadExistingProfile();
  });

  const profileForm = document.getElementById('admin-profile-form');
  const errorDiv = document.getElementById('admin-profile-error');
  const successDiv = document.getElementById('admin-profile-success');

  // Handle profile form submission
  profileForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = {
      fullName: document.getElementById('admin-fullName').value,
      phone: document.getElementById('admin-phone').value,
      department: document.getElementById('admin-department').value,
      designation: document.getElementById('admin-designation').value,
      address: document.getElementById('admin-address').value
    };
    
    try {
      // Show loading state
      const submitBtn = profileForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Saving Profile...';
      submitBtn.disabled = true;
      
      // Get current user
      const user = firebase.auth().currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Update admin profile in backend
      const response = await fetch('https://arcular-plus-backend.onrender.com/admin/api/admin/profile', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          ...formData
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Profile updated successfully:', result);
        
        // Show success message
        successDiv.innerHTML = `
          <div class="success-message" style="color: green; background: #e6ffe6; padding: 10px; border-radius: 5px; margin: 10px 0;">
            Profile completed successfully! Redirecting to dashboard...
          </div>
        `;
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 2000);
        
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }
      
    } catch (error) {
      console.error('Profile update error:', error);
      
      // Show error message
      errorDiv.innerHTML = `
        <div class="error-message" style="color: red; background: #ffe6e6; padding: 10px; border-radius: 5px; margin: 10px 0;">
          ${error.message}
        </div>
      `;
      
    } finally {
      // Reset button state
      const submitBtn = profileForm.querySelector('button[type="submit"]');
      submitBtn.textContent = 'Complete Profile';
      submitBtn.disabled = false;
    }
  });

  // Load existing profile data if available
  async function loadExistingProfile() {
    try {
      const user = firebase.auth().currentUser;
      if (!user) return;
      
      const response = await fetch(`https://arcular-plus-backend.onrender.com/admin/api/admin/profile/${user.uid}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (response.ok) {
        const profile = await response.json();
        
        // Pre-fill form with existing data
        if (profile.data) {
          document.getElementById('admin-fullName').value = profile.data.fullName || '';
          document.getElementById('admin-phone').value = profile.data.mobileNumber || '';
          document.getElementById('admin-department').value = profile.data.department || '';
          document.getElementById('admin-designation').value = profile.data.designation || '';
          document.getElementById('admin-address').value = profile.data.address || '';
        }
      }
    } catch (error) {
      console.log('No existing profile found, starting fresh');
    }
  }
});
