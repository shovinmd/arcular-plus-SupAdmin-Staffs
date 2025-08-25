// --- Super Admin Dashboard Logic ---
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

  const superadminDashboard = document.getElementById('superadmin-dashboard');
  if (superadminDashboard) {
    firebase.auth().onAuthStateChanged(async function(user) {
      if (!user) {
        // User not authenticated, redirect to login
        localStorage.removeItem('superadmin_idToken');
        window.location.href = 'superadmin_login.html';
        return;
      }
      
      try {
        // Verify user is admin
        const res = await fetch('https://arcular-plus-backend.onrender.com/admin/api/admin/staff', {
          headers: { 'Authorization': 'Bearer ' + idToken }
        });
        
        if (!res.ok) {
          throw new Error('Unauthorized access');
        }
        
        // User is authenticated and authorized, show dashboard
        superadminDashboard.style.display = '';
        setupStaffManagementUI();
        setupLogout();
        await fetchAndRenderStaffList();
        
      } catch (error) {
        console.error('Authorization error:', error);
        // User not authorized, redirect to login
        await firebase.auth().signOut();
        localStorage.removeItem('superadmin_idToken');
        window.location.href = 'superadmin_login.html';
      }
    });
  }
});

async function fetchAndRenderStaffList() {
  const idToken = localStorage.getItem('superadmin_idToken');
  if (!idToken) return;
  const tableBody = document.querySelector('#staff-table tbody');
  tableBody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
  try {
    const res = await fetch('https://arcular-plus-backend.onrender.com/admin/api/admin/staff', {
      headers: { 'Authorization': 'Bearer ' + idToken }
    });
    if (!res.ok) throw new Error('Failed to fetch staff');
    const staffList = await res.json();
    if (!Array.isArray(staffList)) throw new Error('Invalid staff list');
    tableBody.innerHTML = '';
    staffList.forEach(staff => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${staff.name}</td>
        <td>${staff.email}</td>
        <td>${staff.role}</td>
        <td>${new Date(staff.createdAt).toLocaleString()}</td>
        <td>
          <button class="edit-staff-btn" data-uid="${staff.firebaseUid}">Edit</button>
          <button class="delete-staff-btn" data-uid="${staff.firebaseUid}">Delete</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="5" style="color:red;">${err.message}</td></tr>`;
  }
}

function openStaffModal(edit = false, staff = null) {
  document.getElementById('staff-modal-title').textContent = edit ? 'Edit Staff' : 'Add New Staff';
  
  // Set form values
  document.getElementById('staff-firebaseUid').value = staff ? staff.uid : '';
  document.getElementById('staff-name').value = staff ? (staff.fullName || staff.name) : '';
  document.getElementById('staff-email').value = staff ? staff.email : '';
  document.getElementById('staff-password').value = '';
  document.getElementById('staff-role').value = staff ? staff.role : 'arc_staff';
  
  // Set additional fields if they exist
  if (document.getElementById('staff-department')) {
    document.getElementById('staff-department').value = staff ? (staff.department || '') : '';
  }
  if (document.getElementById('staff-designation')) {
    document.getElementById('staff-designation').value = staff ? (staff.designation || '') : '';
  }
  if (document.getElementById('staff-phone')) {
    document.getElementById('staff-phone').value = staff ? (staff.mobileNumber || staff.phone || '') : '';
  }
  if (document.getElementById('staff-address')) {
    document.getElementById('staff-address').value = staff ? (staff.address || '') : '';
  }
  
  // Handle form requirements
  document.getElementById('staff-email').disabled = !!edit;
  document.getElementById('staff-password').required = !edit;
  
  // Show modal
  document.getElementById('staff-modal').style.display = 'block';
  
  console.log('🔧 Staff modal opened:', { edit, staff });
}

function closeStaffModal() {
  document.getElementById('staff-modal').style.display = 'none';
}

async function handleStaffFormSubmit(e) {
  e.preventDefault();
  const idToken = localStorage.getItem('superadmin_idToken');
  if (!idToken) return;
  const firebaseUid = document.getElementById('staff-firebaseUid').value;
  const name = document.getElementById('staff-name').value;
  const email = document.getElementById('staff-email').value;
  const password = document.getElementById('staff-password').value;
  const role = document.getElementById('staff-role').value;
  const department = document.getElementById('staff-department')?.value || '';
  const designation = document.getElementById('staff-designation')?.value || '';
  const phone = document.getElementById('staff-phone')?.value || '';
  const address = document.getElementById('staff-address')?.value || '';
  
  try {
    let res;
    if (firebaseUid) {
      // Edit staff (update all fields)
      console.log('🔧 Editing staff with data:', { name, role, department, designation, phone, address });
      res = await fetch(`https://arcular-plus-backend.onrender.com/admin/api/admin/staff/${firebaseUid}`, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + idToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          fullName: name, 
          role, 
          department, 
          designation, 
          mobileNumber: phone, 
          address 
        })
      });
    } else {
      // Create staff
      console.log('➕ Creating new staff with data:', { name, email, password, role, department, designation, phone, address });
      res = await fetch('https://arcular-plus-backend.onrender.com/admin/api/admin/staff', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + idToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          fullName: name, 
          email, 
          password, 
          role, 
          department, 
          designation, 
          phone, 
          address 
        })
      });
    }
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Failed to save staff');
    }
    closeStaffModal();
    await fetchAndRenderStaffList();
    showNotification('Staff saved successfully!', 'success');
  } catch (err) {
    console.error('❌ Staff save error:', err);
    showNotification('Error: ' + err.message, 'error');
  }
}

async function handleDeleteStaff(firebaseUid) {
  const idToken = localStorage.getItem('superadmin_idToken');
  if (!idToken) return;
  if (!confirm('Are you sure you want to delete this staff member?')) return;
  try {
          const res = await fetch(`https://arcular-plus-backend.onrender.com/admin/api/admin/staff/${firebaseUid}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + idToken }
      });
    if (!res.ok) throw new Error('Failed to delete staff');
    await fetchAndRenderStaffList();
  } catch (err) {
    alert(err.message);
  }
}

function setupStaffManagementUI() {
  document.getElementById('open-create-staff-modal').onclick = () => openStaffModal(false);
  document.getElementById('close-staff-modal').onclick = closeStaffModal;
  document.getElementById('staff-form').onsubmit = handleStaffFormSubmit;
  document.querySelector('#staff-table tbody').onclick = function(e) {
    if (e.target.classList.contains('edit-staff-btn')) {
      const uid = e.target.getAttribute('data-uid');
      fetchStaffAndOpenEdit(uid);
    } else if (e.target.classList.contains('delete-staff-btn')) {
      const uid = e.target.getAttribute('data-uid');
      handleDeleteStaff(uid);
    }
  };
}

async function fetchStaffAndOpenEdit(firebaseUid) {
  const idToken = localStorage.getItem('superadmin_idToken');
  if (!idToken) return;
  try {
    console.log('🔍 Fetching staff details for UID:', firebaseUid);
    const res = await fetch(`https://arcular-plus-backend.onrender.com/admin/api/admin/staff/${firebaseUid}`, {
      headers: { 'Authorization': 'Bearer ' + idToken }
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Failed to fetch staff');
    }
    const staffData = await res.json();
    console.log('✅ Staff data fetched:', staffData);
    openStaffModal(true, staffData.data);
  } catch (err) {
    console.error('❌ Error fetching staff:', err);
    showNotification('Error: ' + err.message, 'error');
  }
}

// Admin profile management functions
async function loadAdminProfile() {
  try {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    const idToken = await user.getIdToken();
    const res = await fetch(`https://arcular-plus-backend.onrender.com/admin/api/admin/profile/${user.uid}`, {
      headers: { 'Authorization': `Bearer ${idToken}` }
    });
    
    if (res.ok) {
      const profileData = await res.json();
      console.log('✅ Admin profile loaded:', profileData);
      return profileData.data;
    } else {
      console.log('⚠️ Admin profile not found, will create new one');
      return null;
    }
  } catch (error) {
    console.error('❌ Error loading admin profile:', error);
    return null;
  }
}

async function updateAdminProfile(profileData) {
  try {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('No user authenticated');
    
    const idToken = await user.getIdToken();
    const res = await fetch('https://arcular-plus-backend.onrender.com/admin/api/admin/profile', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uid: user.uid,
        email: user.email,
        ...profileData
      })
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Failed to update profile');
    }
    
    const result = await res.json();
    console.log('✅ Admin profile updated:', result);
    showNotification('Profile updated successfully!', 'success');
    return result;
  } catch (error) {
    console.error('❌ Error updating admin profile:', error);
    showNotification('Error: ' + error.message, 'error');
    throw error;
  }
}

function openAdminProfileModal() {
  // This function should open a modal for editing admin profile
  // You can implement this based on your UI design
  console.log('🔧 Opening admin profile modal');
  showNotification('Admin profile editing feature coming soon!', 'info');
}

// Notification system
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}"></i>
    <span>${message}</span>
  `;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Show notification
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  // Remove notification after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Add notification styles
const notificationStyles = `
  .notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 3000;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    font-family: Arial, sans-serif;
  }
  
  .notification.show {
    transform: translateX(0);
  }
  
  .notification.success {
    border-left: 4px solid #27ae60;
    color: #27ae60;
  }
  
  .notification.error {
    border-left: 4px solid #e74c3c;
    color: #e74c3c;
  }
  
  .notification.info {
    border-left: 4px solid #3498db;
    color: #3498db;
  }
  
  .notification i {
    font-size: 1.2rem;
  }
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

function setupLogout() {
  const logoutBtn = document.getElementById('superadmin-logout-btn');
  if (logoutBtn) {
    logoutBtn.onclick = async function() {
      await firebase.auth().signOut();
      localStorage.removeItem('superadmin_idToken');
      window.location.href = 'superadmin_login.html';
    };
  }
}

 