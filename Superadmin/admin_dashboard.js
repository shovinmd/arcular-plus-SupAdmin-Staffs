// --- Admin Dashboard Logic ---

// Loading state management functions
function showLoadingState() {
  const loadingState = document.getElementById('loadingState');
  const dashboardContent = document.getElementById('dashboardContent');
  if (loadingState) loadingState.style.display = 'flex';
  if (dashboardContent) dashboardContent.style.display = 'none';
}

function hideLoadingState() {
  const loadingState = document.getElementById('loadingState');
  if (loadingState) loadingState.style.display = 'none';
}

function showDashboardContent() {
  const dashboardContent = document.getElementById('dashboardContent');
  if (dashboardContent) dashboardContent.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', function() {
  // Show loading state initially
  showLoadingState();
  
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
  firebase.auth().onAuthStateChanged(async function(user) {
    if (!user) {
      // User not authenticated, redirect to login
      localStorage.removeItem('superadmin_idToken');
      window.location.href = 'superadmin_login.html';
      return;
    }
    
    // Add timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      console.log('⚠️ Loading timeout reached, showing dashboard anyway');
      hideLoadingState();
      showDashboardContent();
    }, 15000); // 15 seconds timeout
    
    try {
      // Get fresh ID token
      const freshToken = await user.getIdToken();
      
      // Check if user has admin profile
      const profileRes = await fetch(`https://arcular-plus-backend.onrender.com/admin/api/admin/profile/${user.uid}`, {
        headers: { 'Authorization': 'Bearer ' + freshToken }
      });
      
      if (!profileRes.ok || profileRes.status === 404) {
        // No admin profile, redirect to profile page
        console.log('No admin profile found, redirecting to profile page...');
        clearTimeout(loadingTimeout);
        window.location.href = 'admin_profile.html';
        return;
      }
      
      const profileData = await profileRes.json();
      if (!profileData.data || !profileData.data.profileComplete) {
        // Profile incomplete, redirect to profile page
        console.log('Profile incomplete, redirecting to profile page...');
        clearTimeout(loadingTimeout);
        window.location.href = 'admin_profile.html';
        return;
      }
      
      // User is authenticated and profile is complete, show dashboard
      clearTimeout(loadingTimeout);
      setupDashboard();
      setupStaffManagementUI();
      setupLogout();
      await fetchAndRenderStaffList(freshToken);
      await loadDashboardStats(freshToken);
      
    } catch (error) {
      console.error('Authorization error:', error);
      clearTimeout(loadingTimeout);
      // User not authorized, redirect to login
      await firebase.auth().signOut();
      localStorage.removeItem('superadmin_idToken');
      window.location.href = 'superadmin_login.html';
    }
  });

  // Setup dashboard
  function setupDashboard() {
    const user = firebase.auth().currentUser;
    if (user) {
      document.getElementById('admin-name').textContent = user.displayName || user.email;
      document.getElementById('welcome-admin-name').textContent = user.displayName || user.email.split('@')[0];
    }
    
    // Hide loading and show dashboard content
    hideLoadingState();
    showDashboardContent();
    console.log('✅ Admin dashboard loaded successfully');
  }

  // Setup logout
  function setupLogout() {
    document.getElementById('superadmin-logout-btn').addEventListener('click', async function() {
      try {
        await firebase.auth().signOut();
        localStorage.removeItem('superadmin_idToken');
        window.location.href = 'superadmin_login.html';
      } catch (error) {
        console.error('Logout error:', error);
      }
    });
  }

  // Setup staff management UI
  function setupStaffManagementUI() {
    const openModalBtn = document.getElementById('open-create-staff-modal');
    const closeModalBtn = document.getElementById('close-staff-modal');
    const cancelBtn = document.getElementById('cancel-staff-btn');
    const staffForm = document.getElementById('staff-form');
    const modal = document.getElementById('staff-modal');

    // Open modal
    openModalBtn.addEventListener('click', function() {
      openStaffModal();
    });

    // Close modal
    closeModalBtn.addEventListener('click', function() {
      closeStaffModal();
    });

    // Cancel button
    cancelBtn.addEventListener('click', function() {
      closeStaffModal();
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
      if (event.target === modal) {
        closeStaffModal();
      }
    });

    // Handle form submission
    staffForm.addEventListener('submit', handleStaffFormSubmit);
  }

  // Open staff modal
  function openStaffModal(edit = false, staff = null) {
    const modal = document.getElementById('staff-modal');
    const title = document.getElementById('staff-modal-title');
    const form = document.getElementById('staff-form');
    const passwordGroup = document.getElementById('password-group');
    const firebaseUidInput = document.getElementById('staff-firebaseUid');

    if (edit && staff) {
      title.textContent = 'Edit Staff Member';
      firebaseUidInput.value = staff.uid;
      document.getElementById('staff-name').value = staff.fullName || '';
      document.getElementById('staff-email').value = staff.email || '';
      document.getElementById('staff-phone').value = staff.mobileNumber || '';
      document.getElementById('staff-role').value = staff.role || 'arcstaff';
      document.getElementById('staff-department').value = staff.department || '';
      document.getElementById('staff-designation').value = staff.designation || '';
      document.getElementById('staff-address').value = staff.address || '';
      passwordGroup.style.display = 'none'; // Hide password for edit
    } else {
      title.textContent = 'Add New Staff';
      form.reset();
      firebaseUidInput.value = '';
      passwordGroup.style.display = 'block'; // Show password for new staff
    }

    modal.style.display = 'block';
  }

  // Close staff modal
  function closeStaffModal() {
    const modal = document.getElementById('staff-modal');
    modal.style.display = 'none';
  }

  // Handle staff form submission
  async function handleStaffFormSubmit(e) {
    e.preventDefault();
    
    const formData = {
      fullName: document.getElementById('staff-name').value,
      email: document.getElementById('staff-email').value,
      phone: document.getElementById('staff-phone').value,
      role: document.getElementById('staff-role').value,
      department: document.getElementById('staff-department').value,
      designation: document.getElementById('staff-designation').value,
      address: document.getElementById('staff-address').value,
      password: document.getElementById('staff-password').value
    };

    console.log('📝 Form data to submit:', formData);

    const firebaseUid = document.getElementById('staff-firebaseUid').value;
    const isEdit = !!firebaseUid;

    try {
      const submitBtn = document.getElementById('save-staff-btn');
      submitBtn.textContent = 'Saving...';
      submitBtn.disabled = true;

      // Get fresh token for the request
      const user = firebase.auth().currentUser;
      const freshToken = await user.getIdToken();
      
      console.log('🔐 Fresh token obtained, length:', freshToken.length);

      let response;
      if (isEdit) {
        // Update existing staff
        console.log('📝 Updating existing staff...');
        response = await fetch(`https://arcular-plus-backend.onrender.com/admin/api/admin/staff/${firebaseUid}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${freshToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });
      } else {
        // Create new staff
        console.log('📝 Creating new staff...');
        console.log('🌐 Sending request to:', 'https://arcular-plus-backend.onrender.com/admin/api/admin/staff');
        
        response = await fetch('https://arcular-plus-backend.onrender.com/admin/api/admin/staff', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${freshToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });
      }

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', response.headers);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Staff saved successfully:', result);
        
        // Close modal and refresh list
        closeStaffModal();
        await fetchAndRenderStaffList(freshToken);
        await loadDashboardStats(freshToken);
        
        // Show success message
        alert(isEdit ? 'Staff updated successfully!' : 'Staff created successfully!');
      } else {
        const errorData = await response.json();
        console.error('❌ Server error response:', errorData);
        throw new Error(errorData.message || 'Failed to save staff');
      }

    } catch (error) {
      console.error('❌ Staff save error:', error);
      alert('Error: ' + error.message);
    } finally {
      const submitBtn = document.getElementById('save-staff-btn');
      submitBtn.textContent = isEdit ? 'Update Staff' : 'Save Staff';
      submitBtn.disabled = false;
    }
  }

  // Fetch and render staff list
  async function fetchAndRenderStaffList(token = idToken) {
    const tableBody = document.querySelector('#staff-table tbody');
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Loading...</td></tr>';
    
    try {
      const res = await fetch('https://arcular-plus-backend.onrender.com/admin/api/admin/staff', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      
      if (!res.ok) throw new Error('Failed to fetch staff');
      
      const staffList = await res.json();
      if (!Array.isArray(staffList)) throw new Error('Invalid staff list');
      
      tableBody.innerHTML = '';
      
      if (staffList.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No staff members found</td></tr>';
        return;
      }
      
      staffList.forEach(staff => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${staff.fullName || 'N/A'}</td>
          <td>${staff.email || 'N/A'}</td>
          <td>${staff.role || 'N/A'}</td>
          <td>${staff.department || 'N/A'}</td>
          <td><span class="status-badge ${staff.status || 'active'}">${staff.status || 'Active'}</span></td>
          <td>${staff.createdAt ? new Date(staff.createdAt).toLocaleDateString() : 'N/A'}</td>
          <td>
            <button class="edit-staff-btn" data-uid="${staff.uid}" onclick="editStaff('${staff.uid}')">Edit</button>
            <button class="delete-staff-btn" data-uid="${staff.uid}" onclick="deleteStaff('${staff.uid}')">Delete</button>
          </td>
        `;
        tableBody.appendChild(tr);
      });
      
      // Add event listeners for edit/delete buttons
      setupStaffActionButtons();
      
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="7" style="color:red; text-align: center;">${err.message}</td></tr>`;
    }
  }

  // Setup staff action buttons
  function setupStaffActionButtons() {
    // Edit buttons
    document.querySelectorAll('.edit-staff-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const firebaseUid = this.getAttribute('data-uid');
        await editStaff(firebaseUid);
      });
    });

    // Delete buttons
    document.querySelectorAll('.delete-staff-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const firebaseUid = this.getAttribute('data-uid');
        await deleteStaff(firebaseUid);
      });
    });
  }

  // Edit staff member
  async function editStaff(firebaseUid) {
    try {
      // Get fresh token
      const user = firebase.auth().currentUser;
      const freshToken = await user.getIdToken();
      
      const res = await fetch(`https://arcular-plus-backend.onrender.com/admin/api/admin/staff/${firebaseUid}`, {
        headers: { 'Authorization': 'Bearer ' + freshToken }
      });
      
      if (!res.ok) throw new Error('Failed to fetch staff');
      
      const staff = await res.json();
      openStaffModal(true, staff);
      
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  // Delete staff member
  async function deleteStaff(firebaseUid) {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    
    try {
      // Get fresh token
      const user = firebase.auth().currentUser;
      const freshToken = await user.getIdToken();
      
      const res = await fetch(`https://arcular-plus-backend.onrender.com/admin/api/admin/staff/${firebaseUid}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + freshToken }
      });
      
      if (!res.ok) throw new Error('Failed to delete staff');
      
      await fetchAndRenderStaffList(freshToken);
      await loadDashboardStats(freshToken);
      alert('Staff deleted successfully!');
      
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  // Load dashboard statistics
  async function loadDashboardStats(token = idToken) {
    try {
      const res = await fetch('https://arcular-plus-backend.onrender.com/admin/api/admin/staff', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      
      if (res.ok) {
        const staffList = await res.json();
        
        document.getElementById('total-staff-count').textContent = staffList.length || 0;
        document.getElementById('active-staff-count').textContent = 
          staffList.filter(staff => staff.status === 'active').length || 0;
        document.getElementById('pending-approvals-count').textContent = 
          staffList.filter(staff => staff.status === 'pending').length || 0;
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }
});

// Global functions for onclick handlers
window.editStaff = async function(firebaseUid) {
  // This will be handled by the event listener setup
};

window.deleteStaff = async function(firebaseUid) {
  // This will be handled by the event listener setup
};
