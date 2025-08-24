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
  document.getElementById('staff-firebaseUid').value = staff ? staff.firebaseUid : '';
  document.getElementById('staff-name').value = staff ? staff.name : '';
  document.getElementById('staff-email').value = staff ? staff.email : '';
  document.getElementById('staff-password').value = '';
  document.getElementById('staff-role').value = staff ? staff.role : 'arcstaff';
  document.getElementById('staff-email').disabled = !!edit;
  document.getElementById('staff-password').required = !edit;
  document.getElementById('staff-modal').style.display = 'block';
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
  try {
    let res;
    if (firebaseUid) {
      // Edit staff (update name/role)
              res = await fetch(`https://arcular-plus-backend.onrender.com/admin/api/admin/staff/${firebaseUid}`, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + idToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, role })
      });
    } else {
      // Create staff
              res = await fetch('https://arcular-plus-backend.onrender.com/admin/api/admin/staff', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + idToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, role })
      });
    }
    if (!res.ok) throw new Error('Failed to save staff');
    closeStaffModal();
    await fetchAndRenderStaffList();
  } catch (err) {
    alert(err.message);
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
          const res = await fetch(`https://arcular-plus-backend.onrender.com/admin/api/admin/staff/${firebaseUid}`, {
        headers: { 'Authorization': 'Bearer ' + idToken }
      });
      if (!res.ok) throw new Error('Failed to fetch staff');
      const staff = await res.json();
      openStaffModal(true, staff);
  } catch (err) {
    alert(err.message);
  }
}

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

 