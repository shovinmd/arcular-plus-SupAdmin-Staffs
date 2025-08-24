// Arcular+ Staff Control Panel JavaScript

// Global variables
let currentUser = null;
let pendingApprovals = [];
let allUsers = {
    hospitals: [],
    doctors: [],
    nurses: [],
    labs: [],
    pharmacies: []
};

// Mock data for demonstration
const mockData = {
    pendingApprovals: [
        {
            id: '1',
            type: 'hospital',
            name: 'City General Hospital',
            registrationNumber: 'HOSP001',
            contact: '+91-9876543210',
            email: 'admin@cityhospital.com',
            address: '123 Medical Street, City Center',
            submittedAt: '2024-01-15T10:30:00',
            documents: ['license.pdf', 'certificate.pdf'],
            status: 'pending'
        },
        {
            id: '2',
            type: 'doctor',
            name: 'Dr. Sarah Johnson',
            licenseNumber: 'DOC001',
            specialization: 'Cardiology',
            contact: '+91-9876543211',
            email: 'sarah.johnson@email.com',
            experience: '15 years',
            submittedAt: '2024-01-15T11:45:00',
            documents: ['medical_license.pdf', 'certificate.pdf'],
            status: 'pending'
        },
        {
            id: '3',
            type: 'nurse',
            name: 'Nurse Maria Garcia',
            licenseNumber: 'NUR001',
            department: 'Emergency Care',
            contact: '+91-9876543212',
            email: 'maria.garcia@email.com',
            experience: '8 years',
            submittedAt: '2024-01-15T12:15:00',
            documents: ['nursing_license.pdf', 'certificate.pdf'],
            status: 'pending'
        },
        {
            id: '4',
            type: 'lab',
            name: 'Advanced Diagnostics Lab',
            licenseNumber: 'LAB001',
            contact: '+91-9876543213',
            email: 'admin@advancedlab.com',
            address: '456 Lab Street, Medical District',
            submittedAt: '2024-01-15T13:20:00',
            documents: ['lab_license.pdf', 'certificate.pdf'],
            status: 'pending'
        },
        {
            id: '5',
            type: 'pharmacy',
            name: 'MedCare Pharmacy',
            licenseNumber: 'PHAR001',
            contact: '+91-9876543214',
            email: 'admin@medcarepharmacy.com',
            address: '789 Pharmacy Lane, Health Zone',
            submittedAt: '2024-01-15T14:30:00',
            documents: ['pharmacy_license.pdf', 'certificate.pdf'],
            status: 'pending'
        }
    ],
    approvedUsers: [
        {
            id: '6',
            type: 'hospital',
            name: 'Metro Medical Center',
            registrationNumber: 'HOSP002',
            contact: '+91-9876543215',
            status: 'approved',
            approvedAt: '2024-01-14T09:00:00'
        },
        {
            id: '7',
            type: 'doctor',
            name: 'Dr. Michael Chen',
            licenseNumber: 'DOC002',
            specialization: 'Neurology',
            contact: '+91-9876543216',
            status: 'approved',
            approvedAt: '2024-01-14T10:30:00'
        }
    ]
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();

    // --- Super Admin Login Logic ---
    const loginForm = document.getElementById('superadmin-login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('superadmin-email').value;
            const password = document.getElementById('superadmin-password').value;
            const errorDiv = document.getElementById('superadmin-login-error');
            errorDiv.textContent = '';
            try {
                // Firebase Auth sign in
                const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
                const user = userCredential.user;
                if (!user) throw new Error('No user found');
                const idToken = await user.getIdToken();
                // Fetch staff profile from backend
                const res = await fetch('/api/admin/staff/' + user.uid, {
                    headers: { 'Authorization': 'Bearer ' + idToken }
                });
                if (!res.ok) throw new Error('Not a super admin');
                const staff = await res.json();
                if (staff.role !== 'superadmin') {
                    errorDiv.textContent = 'Access denied: not a super admin.';
                    return;
                }
                // Store token and redirect
                localStorage.setItem('superadmin_idToken', idToken);
                window.location.href = '../ARCstuff/index.html';
            } catch (err) {
                errorDiv.textContent = err.message || 'Login failed.';
            }
        });
    }

    // --- Super Admin Dashboard Auth Check ---
    const superadminDashboard = document.getElementById('superadmin-dashboard');
    if (superadminDashboard) {
        (async function() {
            checkSession();
            const idToken = localStorage.getItem('superadmin_idToken');
            if (!idToken) return;
            // Get current user from Firebase
            firebase.auth().onAuthStateChanged(async function(user) {
                if (!user) return;
                const res = await fetch('/api/admin/staff/' + user.uid, {
                    headers: { 'Authorization': 'Bearer ' + idToken }
                });
                if (!res.ok) return;
                const staff = await res.json();
                if (staff.role === 'superadmin') {
                    superadminDashboard.style.display = '';
                    setupStaffManagementUI();
                    setupLogout();
                    await fetchAndRenderStaffList();
                    // TODO: fetch and render staff list, wire up create/edit/delete
                } else {
                    superadminDashboard.style.display = 'none';
                }
            });
        })();
    }

    // --- ARC Staff Dashboard Logic ---
    checkArcStaffSession();
    const arcstaffDashboard = document.getElementById('arcstaff-dashboard');
    if (arcstaffDashboard) {
        const idToken = localStorage.getItem('arcstaff_idToken');
        if (!idToken) return;
        firebase.auth().onAuthStateChanged(async function(user) {
            if (!user) return;
            const res = await fetch('/api/admin/staff/' + user.uid, {
                headers: { 'Authorization': 'Bearer ' + idToken }
            });
            if (!res.ok) return;
            const staff = await res.json();
            if (staff.role === 'arcstaff') {
                arcstaffDashboard.style.display = '';
                setupArcStaffLogout();
                await fetchAndRenderPendingStakeholders();
            } else {
                arcstaffDashboard.style.display = 'none';
            }
        });
    }
});

function initializeApp() {
    // Load mock data
    loadMockData();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize dashboard
    updateDashboard();
    
    // Update current date/time
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Load initial data
    loadPendingApprovals();
    loadAllUsers();
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Modal close
    document.querySelector('.close').addEventListener('click', closeModal);
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('detailModal');
        if (event.target === modal) {
            closeModal();
        }
    });
    
    // Search functionality
    document.getElementById('hospitalSearch').addEventListener('input', filterHospitals);
    document.getElementById('doctorSearch').addEventListener('input', filterDoctors);
    document.getElementById('nurseSearch').addEventListener('input', filterNurses);
    document.getElementById('labSearch').addEventListener('input', filterLabs);
    document.getElementById('pharmacySearch').addEventListener('input', filterPharmacies);
    
    // Filter functionality
    document.getElementById('filterType').addEventListener('change', filterPendingApprovals);
}

function loadMockData() {
    pendingApprovals = [...mockData.pendingApprovals];
    
    // Organize approved users by type
    mockData.approvedUsers.forEach(user => {
        if (!allUsers[user.type + 's']) {
            allUsers[user.type + 's'] = [];
        }
        allUsers[user.type + 's'].push(user);
    });
}

function switchTab(tabName) {
    // Remove active class from all tabs and nav items
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to selected tab and nav item
    document.getElementById(tabName).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Load specific data for the tab
    switch(tabName) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'pending':
            loadPendingApprovals();
            break;
        case 'hospitals':
            loadHospitals();
            break;
        case 'doctors':
            loadDoctors();
            break;
        case 'nurses':
            loadNurses();
            break;
        case 'labs':
            loadLabs();
            break;
        case 'pharmacies':
            loadPharmacies();
            break;
        case 'reports':
            loadReports();
            break;
    }
}

function updateDashboard() {
    // Update statistics
    document.getElementById('pendingStats').textContent = pendingApprovals.length;
    document.getElementById('hospitalStats').textContent = allUsers.hospitals.length;
    document.getElementById('doctorStats').textContent = allUsers.doctors.length;
    document.getElementById('nurseStats').textContent = allUsers.nurses.length;
    
    // Update pending count badge
    document.getElementById('pendingCount').textContent = pendingApprovals.length;
    
    // Load recent activity
    loadRecentActivity();
}

function updateDateTime() {
    const now = new Date();
    const dateTimeString = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) + ' ' + now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('currentDateTime').textContent = dateTimeString;
}

function loadRecentActivity() {
    const activityList = document.getElementById('recentActivity');
    const activities = [
        {
            type: 'approval',
            title: 'Hospital Approved',
            description: 'City General Hospital registration approved',
            time: '2 hours ago'
        },
        {
            type: 'registration',
            title: 'New Doctor Registration',
            description: 'Dr. Sarah Johnson submitted registration',
            time: '3 hours ago'
        },
        {
            type: 'rejection',
            title: 'Lab Registration Rejected',
            description: 'Incomplete documentation for Advanced Diagnostics Lab',
            time: '5 hours ago'
        }
    ];
    
    activityList.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon ${activity.type}">
                <i class="fas fa-${activity.type === 'approval' ? 'check' : activity.type === 'registration' ? 'user-plus' : 'times'}"></i>
            </div>
            <div class="activity-content">
                <h4>${activity.title}</h4>
                <p>${activity.description}</p>
            </div>
            <div class="activity-time">${activity.time}</div>
        </div>
    `).join('');
}

function loadPendingApprovals() {
    const container = document.getElementById('pendingApprovals');
    
    if (pendingApprovals.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No Pending Approvals</h3>
                <p>All registrations have been processed</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = pendingApprovals.map(approval => `
        <div class="approval-card">
            <div class="approval-header">
                <div class="approval-type">
                    <i class="fas fa-${getTypeIcon(approval.type)}"></i>
                    <span>${approval.type.charAt(0).toUpperCase() + approval.type.slice(1)} Registration</span>
                </div>
                <div class="approval-time">${formatDate(approval.submittedAt)}</div>
            </div>
            <div class="approval-details">
                <div class="detail-item">
                    <label>Name</label>
                    <span>${approval.name}</span>
                </div>
                <div class="detail-item">
                    <label>License/Registration</label>
                    <span>${approval.licenseNumber || approval.registrationNumber}</span>
                </div>
                <div class="detail-item">
                    <label>Contact</label>
                    <span>${approval.contact}</span>
                </div>
                <div class="detail-item">
                    <label>Email</label>
                    <span>${approval.email}</span>
                </div>
                ${approval.specialization ? `
                <div class="detail-item">
                    <label>Specialization</label>
                    <span>${approval.specialization}</span>
                </div>
                ` : ''}
                ${approval.department ? `
                <div class="detail-item">
                    <label>Department</label>
                    <span>${approval.department}</span>
                </div>
                ` : ''}
                ${approval.experience ? `
                <div class="detail-item">
                    <label>Experience</label>
                    <span>${approval.experience}</span>
                </div>
                ` : ''}
            </div>
            <div class="approval-actions">
                <button class="action-btn view-btn" onclick="viewDetails('${approval.id}')">
                    <i class="fas fa-eye"></i> View Details
                </button>
                <button class="action-btn approve-btn" onclick="approveUser('${approval.id}')">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button class="action-btn reject-btn" onclick="rejectUser('${approval.id}')">
                    <i class="fas fa-times"></i> Reject
                </button>
            </div>
        </div>
    `).join('');
}

function getTypeIcon(type) {
    const icons = {
        hospital: 'hospital',
        doctor: 'user-md',
        nurse: 'user-nurse',
        lab: 'flask',
        pharmacy: 'pills'
    };
    return icons[type] || 'user';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function viewDetails(userId) {
    const user = pendingApprovals.find(u => u.id === userId);
    if (!user) return;
    
    const modal = document.getElementById('detailModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.textContent = `${user.type.charAt(0).toUpperCase() + user.type.slice(1)} Details`;
    
    modalBody.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item">
                <label>Name</label>
                <span>${user.name}</span>
            </div>
            <div class="detail-item">
                <label>License/Registration Number</label>
                <span>${user.licenseNumber || user.registrationNumber}</span>
            </div>
            <div class="detail-item">
                <label>Contact</label>
                <span>${user.contact}</span>
            </div>
            <div class="detail-item">
                <label>Email</label>
                <span>${user.email}</span>
            </div>
            ${user.address ? `
            <div class="detail-item">
                <label>Address</label>
                <span>${user.address}</span>
            </div>
            ` : ''}
            ${user.specialization ? `
            <div class="detail-item">
                <label>Specialization</label>
                <span>${user.specialization}</span>
            </div>
            ` : ''}
            ${user.department ? `
            <div class="detail-item">
                <label>Department</label>
                <span>${user.department}</span>
            </div>
            ` : ''}
            ${user.experience ? `
            <div class="detail-item">
                <label>Experience</label>
                <span>${user.experience}</span>
            </div>
            ` : ''}
            <div class="detail-item">
                <label>Submitted On</label>
                <span>${formatDate(user.submittedAt)}</span>
            </div>
            <div class="detail-item">
                <label>Documents</label>
                <div class="document-list">
                    ${user.documents.map(doc => `
                        <div class="document-item">
                            <i class="fas fa-file-pdf"></i>
                            <span>${doc}</span>
                            <button class="download-btn" onclick="downloadDocument('${doc}')">
                                <i class="fas fa-download"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    
    // Show/hide action buttons based on user type
    const approveBtn = document.getElementById('approveBtn');
    const rejectBtn = document.getElementById('rejectBtn');
    
    approveBtn.onclick = () => approveUser(userId);
    rejectBtn.onclick = () => rejectUser(userId);
    
    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('detailModal').style.display = 'none';
}

function approveUser(userId) {
    const userIndex = pendingApprovals.findIndex(u => u.id === userId);
    if (userIndex === -1) return;
    
    const user = pendingApprovals[userIndex];
    user.status = 'approved';
    user.approvedAt = new Date().toISOString();
    
    // Move to approved users
    if (!allUsers[user.type + 's']) {
        allUsers[user.type + 's'] = [];
    }
    allUsers[user.type + 's'].push(user);
    
    // Remove from pending
    pendingApprovals.splice(userIndex, 1);
    
    // Update UI
    updateDashboard();
    loadPendingApprovals();
    closeModal();
    
    // Show success message
    showNotification('User approved successfully!', 'success');
}

function rejectUser(userId) {
    const userIndex = pendingApprovals.findIndex(u => u.id === userId);
    if (userIndex === -1) return;
    
    const user = pendingApprovals[userIndex];
    user.status = 'rejected';
    user.rejectedAt = new Date().toISOString();
    
    // Remove from pending
    pendingApprovals.splice(userIndex, 1);
    
    // Update UI
    updateDashboard();
    loadPendingApprovals();
    closeModal();
    
    // Show success message
    showNotification('User rejected successfully!', 'error');
}

function loadHospitals() {
    const tbody = document.getElementById('hospitalsTable');
    const hospitals = allUsers.hospitals;
    
    if (hospitals.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fas fa-hospital"></i>
                    <h3>No Hospitals Found</h3>
                    <p>No hospitals have been approved yet</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = hospitals.map(hospital => `
        <tr>
            <td>${hospital.name}</td>
            <td>${hospital.registrationNumber}</td>
            <td>${hospital.contact}</td>
            <td><span class="status-badge approved">Approved</span></td>
            <td>
                <button class="action-btn view-btn" onclick="viewUserDetails('hospital', '${hospital.id}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function loadDoctors() {
    const tbody = document.getElementById('doctorsTable');
    const doctors = allUsers.doctors;
    
    if (doctors.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fas fa-user-md"></i>
                    <h3>No Doctors Found</h3>
                    <p>No doctors have been approved yet</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = doctors.map(doctor => `
        <tr>
            <td>${doctor.name}</td>
            <td>${doctor.licenseNumber}</td>
            <td>${doctor.specialization}</td>
            <td>${doctor.contact}</td>
            <td><span class="status-badge approved">Approved</span></td>
            <td>
                <button class="action-btn view-btn" onclick="viewUserDetails('doctor', '${doctor.id}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function loadNurses() {
    const tbody = document.getElementById('nursesTable');
    const nurses = allUsers.nurses;
    
    if (nurses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fas fa-user-nurse"></i>
                    <h3>No Nurses Found</h3>
                    <p>No nurses have been approved yet</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = nurses.map(nurse => `
        <tr>
            <td>${nurse.name}</td>
            <td>${nurse.licenseNumber}</td>
            <td>${nurse.department}</td>
            <td>${nurse.contact}</td>
            <td><span class="status-badge approved">Approved</span></td>
            <td>
                <button class="action-btn view-btn" onclick="viewUserDetails('nurse', '${nurse.id}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function loadLabs() {
    const tbody = document.getElementById('labsTable');
    const labs = allUsers.labs;
    
    if (labs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fas fa-flask"></i>
                    <h3>No Labs Found</h3>
                    <p>No labs have been approved yet</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = labs.map(lab => `
        <tr>
            <td>${lab.name}</td>
            <td>${lab.licenseNumber}</td>
            <td>${lab.contact}</td>
            <td><span class="status-badge approved">Approved</span></td>
            <td>
                <button class="action-btn view-btn" onclick="viewUserDetails('lab', '${lab.id}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function loadPharmacies() {
    const tbody = document.getElementById('pharmaciesTable');
    const pharmacies = allUsers.pharmacies;
    
    if (pharmacies.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fas fa-pills"></i>
                    <h3>No Pharmacies Found</h3>
                    <p>No pharmacies have been approved yet</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = pharmacies.map(pharmacy => `
        <tr>
            <td>${pharmacy.name}</td>
            <td>${pharmacy.licenseNumber}</td>
            <td>${pharmacy.contact}</td>
            <td><span class="status-badge approved">Approved</span></td>
            <td>
                <button class="action-btn view-btn" onclick="viewUserDetails('pharmacy', '${pharmacy.id}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function loadAllUsers() {
    loadHospitals();
    loadDoctors();
    loadNurses();
    loadLabs();
    loadPharmacies();
}

function filterPendingApprovals() {
    const filterType = document.getElementById('filterType').value;
    const filteredApprovals = filterType === 'all' 
        ? pendingApprovals 
        : pendingApprovals.filter(approval => approval.type === filterType);
    
    // Re-render the approval list with filtered data
    const container = document.getElementById('pendingApprovals');
    
    if (filteredApprovals.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-filter"></i>
                <h3>No Pending Approvals</h3>
                <p>No ${filterType === 'all' ? '' : filterType} registrations pending approval</p>
            </div>
        `;
        return;
    }
    
    // Re-render with filtered data
    loadPendingApprovals();
}

function filterHospitals() {
    const searchTerm = document.getElementById('hospitalSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#hospitalsTable tr');
    
    rows.forEach(row => {
        const name = row.cells[0]?.textContent.toLowerCase() || '';
        const registration = row.cells[1]?.textContent.toLowerCase() || '';
        const contact = row.cells[2]?.textContent.toLowerCase() || '';
        
        if (name.includes(searchTerm) || registration.includes(searchTerm) || contact.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function filterDoctors() {
    const searchTerm = document.getElementById('doctorSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#doctorsTable tr');
    
    rows.forEach(row => {
        const name = row.cells[0]?.textContent.toLowerCase() || '';
        const license = row.cells[1]?.textContent.toLowerCase() || '';
        const specialization = row.cells[2]?.textContent.toLowerCase() || '';
        const contact = row.cells[3]?.textContent.toLowerCase() || '';
        
        if (name.includes(searchTerm) || license.includes(searchTerm) || specialization.includes(searchTerm) || contact.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function filterNurses() {
    const searchTerm = document.getElementById('nurseSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#nursesTable tr');
    
    rows.forEach(row => {
        const name = row.cells[0]?.textContent.toLowerCase() || '';
        const license = row.cells[1]?.textContent.toLowerCase() || '';
        const department = row.cells[2]?.textContent.toLowerCase() || '';
        const contact = row.cells[3]?.textContent.toLowerCase() || '';
        
        if (name.includes(searchTerm) || license.includes(searchTerm) || department.includes(searchTerm) || contact.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function filterLabs() {
    const searchTerm = document.getElementById('labSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#labsTable tr');
    
    rows.forEach(row => {
        const name = row.cells[0]?.textContent.toLowerCase() || '';
        const license = row.cells[1]?.textContent.toLowerCase() || '';
        const contact = row.cells[2]?.textContent.toLowerCase() || '';
        
        if (name.includes(searchTerm) || license.includes(searchTerm) || contact.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function filterPharmacies() {
    const searchTerm = document.getElementById('pharmacySearch').value.toLowerCase();
    const rows = document.querySelectorAll('#pharmaciesTable tr');
    
    rows.forEach(row => {
        const name = row.cells[0]?.textContent.toLowerCase() || '';
        const license = row.cells[1]?.textContent.toLowerCase() || '';
        const contact = row.cells[2]?.textContent.toLowerCase() || '';
        
        if (name.includes(searchTerm) || license.includes(searchTerm) || contact.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function loadReports() {
    const reportContent = document.getElementById('reportContent');
    const reportType = document.getElementById('reportType').value;
    
    let reportData = '';
    
    switch(reportType) {
        case 'registration':
            reportData = generateRegistrationReport();
            break;
        case 'approval':
            reportData = generateApprovalReport();
            break;
        case 'activity':
            reportData = generateActivityReport();
            break;
    }
    
    reportContent.innerHTML = reportData;
}

function generateRegistrationReport() {
    const totalPending = pendingApprovals.length;
    const totalApproved = Object.values(allUsers).flat().length;
    
    return `
        <div class="report-section">
            <h3>Registration Report</h3>
            <div class="report-stats">
                <div class="stat-item">
                    <h4>Total Pending</h4>
                    <p>${totalPending}</p>
                </div>
                <div class="stat-item">
                    <h4>Total Approved</h4>
                    <p>${totalApproved}</p>
                </div>
                <div class="stat-item">
                    <h4>Approval Rate</h4>
                    <p>${totalApproved + totalPending > 0 ? Math.round((totalApproved / (totalApproved + totalPending)) * 100) : 0}%</p>
                </div>
            </div>
            <div class="report-breakdown">
                <h4>Breakdown by Type</h4>
                <ul>
                    <li>Hospitals: ${allUsers.hospitals.length} approved, ${pendingApprovals.filter(p => p.type === 'hospital').length} pending</li>
                    <li>Doctors: ${allUsers.doctors.length} approved, ${pendingApprovals.filter(p => p.type === 'doctor').length} pending</li>
                    <li>Nurses: ${allUsers.nurses.length} approved, ${pendingApprovals.filter(p => p.type === 'nurse').length} pending</li>
                    <li>Labs: ${allUsers.labs.length} approved, ${pendingApprovals.filter(p => p.type === 'lab').length} pending</li>
                    <li>Pharmacies: ${allUsers.pharmacies.length} approved, ${pendingApprovals.filter(p => p.type === 'pharmacy').length} pending</li>
                </ul>
            </div>
        </div>
    `;
}

function generateApprovalReport() {
    return `
        <div class="report-section">
            <h3>Approval Report</h3>
            <div class="approval-timeline">
                <h4>Recent Approvals</h4>
                <div class="timeline">
                    ${mockData.approvedUsers.map(user => `
                        <div class="timeline-item">
                            <div class="timeline-icon approved">
                                <i class="fas fa-check"></i>
                            </div>
                            <div class="timeline-content">
                                <h5>${user.name}</h5>
                                <p>${user.type.charAt(0).toUpperCase() + user.type.slice(1)} - Approved on ${formatDate(user.approvedAt)}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function generateActivityReport() {
    return `
        <div class="report-section">
            <h3>Activity Report</h3>
            <div class="activity-summary">
                <h4>Today's Activity</h4>
                <ul>
                    <li>5 new registrations received</li>
                    <li>3 approvals processed</li>
                    <li>2 rejections issued</li>
                    <li>Average processing time: 2.5 hours</li>
                </ul>
            </div>
        </div>
    `;
}

function generateReport() {
    const reportType = document.getElementById('reportType').value;
    const reportName = `${reportType}_report_${new Date().toISOString().split('T')[0]}.pdf`;
    
    // Simulate report generation
    showNotification(`Generating ${reportType} report...`, 'info');
    
    setTimeout(() => {
        showNotification(`${reportName} generated successfully!`, 'success');
    }, 2000);
}

function downloadDocument(filename) {
    // Simulate document download
    showNotification(`Downloading ${filename}...`, 'info');
    
    setTimeout(() => {
        showNotification(`${filename} downloaded successfully!`, 'success');
    }, 1000);
}

function viewUserDetails(type, userId) {
    // Implementation for viewing approved user details
    showNotification(`Viewing ${type} details...`, 'info');
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear authentication data
        localStorage.removeItem('adminLoggedIn');
        localStorage.removeItem('adminEmail');
        sessionStorage.removeItem('adminLoggedIn');
        sessionStorage.removeItem('adminEmail');
        
        // Show logout message
        showNotification('Logging out...', 'info');
        
        // Redirect to login page
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    }
}

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
            document.body.removeChild(notification);
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
    }
    
    .notification.show {
        transform: translateX(0);
    }
    
    .notification.success {
        border-left: 4px solid #27ae60;
    }
    
    .notification.error {
        border-left: 4px solid #e74c3c;
    }
    
    .notification.info {
        border-left: 4px solid #3498db;
    }
    
    .notification i {
        font-size: 1.2rem;
    }
    
    .notification.success i {
        color: #27ae60;
    }
    
    .notification.error i {
        color: #e74c3c;
    }
    
    .notification.info i {
        color: #3498db;
    }
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet); 

// --- Super Admin Staff Management Logic ---
async function fetchAndRenderStaffList() {
  const idToken = localStorage.getItem('superadmin_idToken');
  if (!idToken) return;
  const tableBody = document.querySelector('#staff-table tbody');
  tableBody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
  try {
    const res = await fetch('/api/admin/staff', {
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
      res = await fetch(`/api/admin/staff/${firebaseUid}`, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + idToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, role })
      });
    } else {
      // Create staff
      res = await fetch('/api/admin/staff', {
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
    const res = await fetch(`/api/admin/staff/${firebaseUid}`, {
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
    const res = await fetch(`/api/admin/staff/${firebaseUid}`, {
      headers: { 'Authorization': 'Bearer ' + idToken }
    });
    if (!res.ok) throw new Error('Failed to fetch staff');
    const staff = await res.json();
    openStaffModal(true, staff);
  } catch (err) {
    alert(err.message);
  }
}

// --- Logout and Session Expiration ---
function setupLogout() {
  const logoutBtn = document.getElementById('superadmin-logout-btn');
  if (logoutBtn) {
    logoutBtn.onclick = async function() {
      await firebase.auth().signOut();
      localStorage.removeItem('superadmin_idToken');
      window.location.href = '../Superadmin/superadmin_login.html';
    };
  }
}

function checkSession() {
  const idToken = localStorage.getItem('superadmin_idToken');
  if (!idToken) {
    window.location.href = '../Superadmin/superadmin_login.html';
  }
} 

// --- ARC Staff Dashboard Logic ---
function checkArcStaffSession() {
  const idToken = localStorage.getItem('arcstaff_idToken');
  if (!idToken) {
    window.location.href = 'arcstaff_login.html';
  }
}

function setupArcStaffLogout() {
  const logoutBtn = document.getElementById('arcstaff-logout-btn');
  if (logoutBtn) {
    logoutBtn.onclick = async function() {
      await firebase.auth().signOut();
      localStorage.removeItem('arcstaff_idToken');
      window.location.href = 'arcstaff_login.html';
    };
  }
}

async function fetchAndRenderPendingStakeholders() {
  const idToken = localStorage.getItem('arcstaff_idToken');
  if (!idToken) return;
  const tableBody = document.querySelector('#pending-table tbody');
  tableBody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
  try {
    const res = await fetch('/api/stakeholders/pending', {
      headers: { 'Authorization': 'Bearer ' + idToken }
    });
    if (!res.ok) throw new Error('Failed to fetch pending stakeholders');
    const pendingList = await res.json();
    if (!Array.isArray(pendingList)) throw new Error('Invalid stakeholder list');
    tableBody.innerHTML = '';
    pendingList.forEach(stakeholder => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${stakeholder.name || stakeholder.fullName || '-'}</td>
        <td>${stakeholder.email || '-'}</td>
        <td>${stakeholder.type || '-'}</td>
        <td>${renderDocuments(stakeholder.documents)}</td>
        <td>${stakeholder.status || 'pending'}</td>
        <td>
          <button class="approve-btn" data-id="${stakeholder._id}">Approve</button>
          <button class="reject-btn" data-id="${stakeholder._id}">Reject</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="6" style="color:red;">${err.message}</td></tr>`;
  }
}

function renderDocuments(documents) {
  if (!documents || !Array.isArray(documents) || documents.length === 0) return '-';
  return documents.map(doc => `<a href="${doc.url}" target="_blank">${doc.name || 'Document'}</a>`).join('<br>');
}

document.addEventListener('click', async function(e) {
  if (e.target.classList.contains('approve-btn')) {
    const id = e.target.getAttribute('data-id');
    await handleApproveStakeholder(id);
  } else if (e.target.classList.contains('reject-btn')) {
    const id = e.target.getAttribute('data-id');
    await handleRejectStakeholder(id);
  }
});

async function handleApproveStakeholder(id) {
  const idToken = localStorage.getItem('arcstaff_idToken');
  if (!idToken) return;
  try {
    const res = await fetch(`/api/stakeholders/${id}/approve`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + idToken }
    });
    if (!res.ok) throw new Error('Failed to approve stakeholder');
    await fetchAndRenderPendingStakeholders();
  } catch (err) {
    alert(err.message);
  }
}

async function handleRejectStakeholder(id) {
  const idToken = localStorage.getItem('arcstaff_idToken');
  if (!idToken) return;
  try {
    const res = await fetch(`/api/stakeholders/${id}/reject`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + idToken }
    });
    if (!res.ok) throw new Error('Failed to reject stakeholder');
    await fetchAndRenderPendingStakeholders();
  } catch (err) {
    alert(err.message);
  }
} 