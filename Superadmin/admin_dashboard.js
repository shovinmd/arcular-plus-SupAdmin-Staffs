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

// Enhanced dashboard functions
function updateCurrentDateTime() {
  const dateTimeElement = document.getElementById('current-date-time');
  if (dateTimeElement) {
    const now = new Date();
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    dateTimeElement.textContent = now.toLocaleDateString('en-US', options);
  }
}

function openCreateStaffModal() {
  document.getElementById('staff-modal').style.display = 'block';
  document.getElementById('staff-modal-title').textContent = 'Add New Staff';
  document.getElementById('staff-form').reset();
  document.getElementById('staff-firebaseUid').value = '';
  document.getElementById('password-group').style.display = 'block';
}

function viewSystemStatus() {
  showSuccessMessage('System status monitoring will be available in the next update.');
}

function exportStaffData() {
  showSuccessMessage('Staff data export will be available in the next update.');
}

function generateStaffReport() {
  showSuccessMessage('Staff report generation will be available in the next update.');
}

function viewSystemAnalytics() {
  showSuccessMessage('System analytics dashboard will be available in the next update.');
}

function managePlatformSettings() {
  showSuccessMessage('Platform settings management will be available in the next update.');
}

// Show success message
function showSuccessMessage(message) {
  const successDiv = document.createElement('div');
  successDiv.className = 'success-message';
  successDiv.textContent = message;
  successDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 15px 20px;
    border-radius: 5px;
    z-index: 1000;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  `;
  
  document.body.appendChild(successDiv);
  
  setTimeout(() => {
    successDiv.remove();
  }, 3000);
}

// Show error message
function showErrorMessage(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #f44336;
    color: white;
    padding: 15px 20px;
    border-radius: 5px;
    z-index: 1000;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  `;
  
  document.body.appendChild(errorDiv);
  
  setTimeout(() => {
    errorDiv.remove();
  }, 3000);
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
      await loadPendingProfileChanges(freshToken);
      
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
      document.getElementById('admin-email').textContent = user.email;
    }
    
    // Update current date/time
    updateCurrentDateTime();
    
    // Setup refresh functionality
    setupRefreshButton();
    
    // Hide loading and show dashboard content
    hideLoadingState();
    showDashboardContent();
    console.log('✅ Admin dashboard loaded successfully');
  }

  // Setup refresh button functionality
  function setupRefreshButton() {
    const refreshBtn = document.getElementById('refresh-dashboard');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async function() {
        try {
          refreshBtn.style.transform = 'rotate(360deg)';
          refreshBtn.style.transition = 'transform 0.5s ease';
          
          // Refresh dashboard data
          const freshToken = await firebase.auth().currentUser.getIdToken();
          await fetchAndRenderStaffList(freshToken);
          await loadDashboardStats(freshToken);
          updateCurrentDateTime();
          
          showSuccessMessage('Dashboard refreshed successfully!');
          
          setTimeout(() => {
            refreshBtn.style.transform = 'rotate(0deg)';
          }, 500);
        } catch (error) {
          console.error('Refresh error:', error);
          showSuccessMessage('Failed to refresh dashboard');
        }
      });
    }
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

    // Setup search functionality
    setupStaffSearch();

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
        
        // Calculate unique departments
        const departments = [...new Set(staffList.map(staff => staff.department).filter(Boolean))];
        document.getElementById('total-departments').textContent = departments.length || 0;
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  // Load pending profile changes from staff
  async function loadPendingProfileChanges(token) {
    try {
      console.log('Loading pending profile changes...');
      
      const response = await fetch(`https://arcular-plus-backend.onrender.com/admin/api/admin/profile-changes`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Pending profile changes loaded:', data);
        renderPendingProfileChanges(data.pendingChanges || []);
      } else {
        console.error('Failed to load pending profile changes:', response.status);
        renderPendingProfileChanges([]);
      }
    } catch (error) {
      console.error('Error loading pending profile changes:', error);
      renderPendingProfileChanges([]);
    }
  }

  // Render pending profile changes in the UI
  function renderPendingProfileChanges(changes) {
    const changesContainer = document.querySelector('.changes-list');
    if (!changesContainer) return;

    if (changes.length === 0) {
      changesContainer.innerHTML = `
        <div class="no-changes">
          <p>No pending profile changes at the moment.</p>
        </div>
      `;
      return;
    }

    changesContainer.innerHTML = changes.map(change => `
      <div class="change-item" data-change-id="${change._id}">
        <div class="change-info">
          <div class="change-staff-name">${change.staffName}</div>
          <div class="change-details">
            <strong>Field:</strong> ${change.fieldName}<br>
            <strong>Old Value:</strong> ${change.oldValue || 'N/A'}<br>
            <strong>New Value:</strong> ${change.newValue || 'N/A'}<br>
            <strong>Reason:</strong> ${change.reason || 'No reason provided'}
          </div>
          <div class="change-submitted">
            Submitted: ${new Date(change.submittedAt).toLocaleDateString()}
          </div>
        </div>
        <div class="change-actions">
          <button class="change-approve-btn" onclick="handleApproveProfileChange('${change._id}')">
            Approve
          </button>
          <button class="change-reject-btn" onclick="handleRejectProfileChange('${change._id}')">
            Reject
          </button>
        </div>
      </div>
    `).join('');
  }

  // Handle approving a profile change
  async function handleApproveProfileChange(changeId) {
    try {
      const token = await firebase.auth().currentUser.getIdToken();
      if (!token) {
        showErrorMessage('Authentication required');
        return;
      }

      const response = await fetch(`https://arcular-plus-backend.onrender.com/admin/api/admin/profile-changes/${changeId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        showSuccessMessage('Profile change approved successfully');
        // Refresh the pending changes list
        await loadPendingProfileChanges(token);
        // Also refresh staff list to show updated information
        await fetchAndRenderStaffList(token);
      } else {
        const errorData = await response.json();
        showErrorMessage(`Failed to approve: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error approving profile change:', error);
      showErrorMessage('Failed to approve profile change');
    }
  }

  // Handle rejecting a profile change
  async function handleRejectProfileChange(changeId) {
    try {
      const token = await firebase.auth().currentUser.getIdToken();
      if (!token) {
        showErrorMessage('Authentication required');
        return;
      }

      const reason = prompt('Please provide a reason for rejection:');
      if (!reason) {
        showErrorMessage('Rejection reason is required');
        return;
      }

      const response = await fetch(`https://arcular-plus-backend.onrender.com/admin/api/admin/profile-changes/${changeId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        showSuccessMessage('Profile change rejected successfully');
        // Refresh the pending changes list
        await loadPendingProfileChanges(token);
      } else {
        const errorData = await response.json();
        showErrorMessage(`Failed to reject: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error rejecting profile change:', error);
      showErrorMessage('Failed to reject profile change');
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

// Staff search functionality
function setupStaffSearch() {
  const searchInput = document.getElementById('staff-search');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase();
      const tableRows = document.querySelectorAll('#staff-table tbody tr');
      
      tableRows.forEach(row => {
        const name = row.cells[0]?.textContent?.toLowerCase() || '';
        const email = row.cells[1]?.textContent?.toLowerCase() || '';
        const role = row.cells[2]?.textContent?.toLowerCase() || '';
        const department = row.cells[3]?.textContent?.toLowerCase() || '';
        
        if (name.includes(searchTerm) || email.includes(searchTerm) || 
            role.includes(searchTerm) || department.includes(searchTerm)) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    });
  }
}
