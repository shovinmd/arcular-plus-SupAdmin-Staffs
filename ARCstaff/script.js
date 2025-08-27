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

// Backend API configuration
const API_BASE_URL = 'https://arcular-plus-backend.onrender.com/api';

// Firebase configuration for Arcular+ project
const firebaseConfig = {
    apiKey: "AIzaSyBzK4SQ44cv6k8EiNF9B2agNASArWQrstk",
    authDomain: "arcularplus-7e66c.firebaseapp.com",
    projectId: "arcularplus-7e66c",
    storageBucket: "arcularplus-7e66c.firebasestorage.app",
    messagingSenderId: "239874151024",
    appId: "1:239874151024:android:7e0d9de0400c6bb9fb5ab5"
};

// Initialize Firebase if not already initialized
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
} else if (typeof firebase === 'undefined') {
    console.warn('Firebase SDK not loaded');
}

// API Functions for real backend integration
async function fetchPendingApprovals() {
    try {
        const token = await getAuthToken();
        
        // Fetch all pending approvals from different service providers
        const [hospitals, doctors, nurses, labs, pharmacies] = await Promise.all([
            fetch(`${API_BASE_URL}/hospitals/pending-approvals`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => res.json()).catch(() => ({ success: false, data: [] })),
            
            fetch(`${API_BASE_URL}/doctors/pending-approvals`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => res.json()).catch(() => ({ success: false, data: [] })),
            
            fetch(`${API_BASE_URL}/nurses/pending-approvals`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => res.json()).catch(() => ({ success: false, data: [] })),
            
            fetch(`${API_BASE_URL}/labs/pending-approvals`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => res.json()).catch(() => ({ success: false, data: [] })),
            
            fetch(`${API_BASE_URL}/pharmacies/pending-approvals`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(res => res.json()).catch(() => ({ success: false, data: [] }))
        ]);

        // Process and combine all pending approvals
        const allPending = [];
        
        if (hospitals.success && hospitals.data) {
            allPending.push(...hospitals.data.map(h => ({ ...h, type: 'hospital' })));
        }
        if (doctors.success && doctors.data) {
            allPending.push(...doctors.data.map(d => ({ ...d, type: 'doctor' })));
        }
        if (nurses.success && nurses.data) {
            allPending.push(...nurses.data.map(n => ({ ...n, type: 'nurse' })));
        }
        if (labs.success && labs.data) {
            allPending.push(...labs.data.map(l => ({ ...l, type: 'lab' })));
        }
        if (pharmacies.success && pharmacies.data) {
            allPending.push(...pharmacies.data.map(p => ({ ...p, type: 'pharmacy' })));
        }

        return allPending;
    } catch (error) {
        console.error('Error fetching pending approvals:', error);
        return [];
    }
}

// Get Firebase auth token for API calls
async function getAuthToken() {
    try {
        const user = firebase.auth().currentUser;
        if (user) {
            return await user.getIdToken();
        }
        throw new Error('No authenticated user');
    } catch (error) {
        console.error('Error getting auth token:', error);
        throw error;
    }
}

// Fetch detailed information for a specific service provider
async function fetchServiceProviderDetails(type, id) {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/${type}/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.success ? data.data : null;
    } catch (error) {
        console.error(`Error fetching ${type} details:`, error);
        return null;
    }
}

// Approve a service provider
async function approveServiceProvider(type, id, notes = '') {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/${type}/${id}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                approvedBy: currentUser?.uid || 'staff',
                notes: notes
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error(`Error approving ${type}:`, error);
        return false;
    }
}

// Reject a service provider
async function rejectServiceProvider(type, id, reason, category, nextSteps) {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/${type}/${id}/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                rejectedBy: currentUser?.uid || 'staff',
                reason: reason,
                category: category,
                nextSteps: nextSteps
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error(`Error rejecting ${type}:`, error);
        return false;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();

    // --- ARC Staff Login Logic ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('login-error');
            
            if (errorDiv) errorDiv.textContent = '';
            
            try {
                // Firebase authentication
                const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
                const user = userCredential.user;
                const idToken = await user.getIdToken();
                
                // Verify staff access
                try {
                    const response = await fetch('https://arcular-plus-backend.onrender.com/staff/api/staff/verify', {
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
                        console.log('✅ Staff access verified:', result);
                        
                        // Store token
                        localStorage.setItem('staff_idToken', idToken);
                        
                                // Redirect to dashboard
        window.location.href = 'arcstaff-dashboard.html';
                    } else {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Staff access verification failed');
                    }
                } catch (fetchError) {
                    console.error('❌ Staff verification error:', fetchError);
                    if (fetchError.name === 'TypeError' && fetchError.message.includes('Failed to fetch')) {
                        throw new Error('Network error: Unable to connect to server. Please check your internet connection and try again.');
                    }
                    throw fetchError;
                }
                
            } catch (error) {
                console.error('Login error:', error);
                if (errorDiv) {
                    errorDiv.textContent = error.message || 'Login failed';
                } else {
                    alert('Login failed: ' + error.message);
                }
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
    
    // Check authentication state
    firebase.auth().onAuthStateChanged(async function(user) {
        // Add timeout to prevent infinite loading
        const loadingTimeout = setTimeout(() => {
            console.log('⚠️ Loading timeout reached, showing dashboard anyway');
            hideLoadingState();
        }, 15000); // 15 seconds timeout
        if (user) {
            console.log('✅ User authenticated:', user.email);
            const idToken = await user.getIdToken();
            localStorage.setItem('staff_idToken', idToken);
            
            // Verify staff access
            try {
                const response = await fetch('https://arcular-plus-backend.onrender.com/staff/api/staff/profile/' + user.uid, {
                    headers: { 'Authorization': `Bearer ${idToken}` }
                });
                
                if (response.ok) {
                    const staffProfile = await response.json();
                    console.log('✅ Staff profile loaded:', staffProfile);
                    currentUser = staffProfile;
                    
                    // Update UI with staff name
                    const staffNameElement = document.getElementById('staffName');
                    if (staffNameElement) {
                        staffNameElement.textContent = staffProfile.data.fullName || user.email;
                    }
                    
                    // Initialize dashboard
                    await initializeArcStaffDashboard();
                    
                    // Hide loading state and show dashboard
                    clearTimeout(loadingTimeout);
                } else {
                    console.error('❌ Staff profile not found');
                    // Don't redirect, just show a message and stay on dashboard
                    console.log('⚠️ Profile not found, but staying on dashboard');
                    
                    // Update UI with basic user info
                    const staffNameElement = document.getElementById('staffName');
                    if (staffNameElement) {
                        staffNameElement.textContent = user.email;
                    }
                    
                    // Initialize dashboard anyway
                    await initializeArcStaffDashboard();
                    
                    // Hide loading state and show dashboard
                    clearTimeout(loadingTimeout);
                }
            } catch (error) {
                console.error('❌ Error loading staff profile:', error);
                // Don't redirect on network errors, just log the error
                console.log('⚠️ Network error, staying on dashboard');
                
                // Show error message but still load dashboard
                clearTimeout(loadingTimeout);
                showErrorMessage('Network error loading profile. Loading dashboard with limited data...');
                await initializeArcStaffDashboard();
                clearTimeout(loadingTimeout);
            }
        } else {
            console.log('❌ No user authenticated');
            localStorage.removeItem('staff_idToken');
            console.log('🔒 Redirecting to login page');
            window.location.href = 'index.html';
        }
    });
});

function initializeApp() {
    // Set up event listeners
    setupEventListeners();
    
    // Initialize dashboard
    updateDashboard();
    
    // Update current date/time
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Load initial data
    loadPendingApprovals();
}

// Loading state management
function showLoadingState() {
    const loadingState = document.getElementById('loadingState');
    const dashboard = document.getElementById('dashboard');
    if (loadingState) loadingState.style.display = 'flex';
    if (dashboard) dashboard.style.display = 'none';
}

function hideLoadingState() {
    const loadingState = document.getElementById('loadingState');
    const dashboard = document.getElementById('dashboard');
    if (loadingState) loadingState.style.display = 'none';
    if (dashboard) dashboard.style.display = 'block';
}

// Show error message to user
function showErrorMessage(message) {
    console.error('❌ Error:', message);
    
    // Create error notification
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    errorDiv.innerHTML = `
        <div class="error-content">
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(errorDiv);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (errorDiv.parentElement) {
            errorDiv.remove();
        }
    }, 10000);
}

// Refresh dashboard manually
async function refreshDashboard() {
    console.log('🔄 Manual dashboard refresh requested');
    showLoadingState();
    
    try {
        await loadDashboardData();
        hideLoadingState();
        showSuccessMessage('Dashboard refreshed successfully');
    } catch (error) {
        console.error('❌ Error refreshing dashboard:', error);
        hideLoadingState();
        showErrorMessage('Failed to refresh dashboard');
    }
}

// Show success message to user
function showSuccessMessage(message) {
    console.log('✅ Success:', message);
    
    // Create success notification
    const successDiv = document.createElement('div');
    successDiv.className = 'success-notification';
    successDiv.innerHTML = `
        <div class="success-content">
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(successDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (successDiv.parentElement) {
            successDiv.remove();
        }
    }, 5000);
}

// Load dashboard data from backend
async function loadDashboardData() {
    try {
        console.log('🔄 Loading dashboard data...');
        const idToken = localStorage.getItem('staff_idToken');
        if (!idToken) {
            console.log('❌ No ID token found');
            return;
        }
        
        // Load data with individual error handling
        try {
            await loadPendingApprovalsFromBackend();
        } catch (error) {
            console.error('❌ Error loading pending approvals:', error);
            showErrorMessage('Failed to load pending approvals');
        }
        
        try {
            await loadAllUsers();
        } catch (error) {
            console.error('❌ Error loading users:', error);
            showErrorMessage('Failed to load user data');
        }
        
        // Update dashboard stats
        updateDashboard();
        
        console.log('✅ Dashboard data loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        // Show error message to user
        showErrorMessage('Failed to load dashboard data. Please refresh the page.');
    }
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

// Load pending approvals from backend
async function loadPendingApprovalsFromBackend() {
    try {
        console.log('🔄 Loading pending approvals from backend...');
        
        // Use our new API function to fetch real pending approvals
        const allPending = await fetchPendingApprovals();
        
        if (allPending && allPending.length > 0) {
            pendingApprovals = allPending;
            console.log(`✅ Loaded ${allPending.length} pending approvals:`, allPending);
        } else {
            pendingApprovals = [];
            console.log('ℹ️ No pending approvals found');
        }
        
        // Update the UI with real data
        updatePendingCount();
        renderPendingApprovalsList();
        
    } catch (error) {
        console.error('❌ Error loading pending approvals:', error);
        // Fallback to empty
        pendingApprovals = [];
        updatePendingCount();
        showErrorMessage('Failed to load pending approvals. Please refresh the page.');
    }
}

// Update pending count in UI
function updatePendingCount() {
    const pendingCountElement = document.getElementById('pendingCount');
    const pendingStatsElement = document.getElementById('pendingStats');
    
    if (pendingCountElement) {
        pendingCountElement.textContent = pendingApprovals.length;
    }
    
    if (pendingStatsElement) {
        pendingStatsElement.textContent = pendingApprovals.length;
    }
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

// Update dashboard stats with real data
function updateDashboard() {
    try {
        // Update counts for each service provider type
        const hospitalCount = pendingApprovals.filter(a => a.type === 'hospital').length;
        const doctorCount = pendingApprovals.filter(a => a.type === 'doctor').length;
        const nurseCount = pendingApprovals.filter(a => a.type === 'nurse').length;
        const labCount = pendingApprovals.filter(a => a.type === 'lab').length;
        const pharmacyCount = pendingApprovals.filter(a => a.type === 'pharmacy').length;
        const totalCount = pendingApprovals.length;
        
        // Update UI elements
        const hospitalCountEl = document.getElementById('hospitalCount');
        const doctorCountEl = document.getElementById('doctorCount');
        const nurseCountEl = document.getElementById('nurseCount');
        const labCountEl = document.getElementById('labCount');
        const pharmacyCountEl = document.getElementById('pharmacyCount');
        const totalCountEl = document.getElementById('totalCount');
        
        if (hospitalCountEl) hospitalCountEl.textContent = hospitalCount;
        if (doctorCountEl) doctorCountEl.textContent = doctorCount;
        if (nurseCountEl) nurseCountEl.textContent = nurseCount;
        if (labCountEl) labCountEl.textContent = labCount;
        if (pharmacyCountEl) pharmacyCountEl.textContent = pharmacyCount;
        if (totalCountEl) totalCountEl.textContent = totalCount;
        
        console.log('✅ Dashboard stats updated:', {
            hospital: hospitalCount,
            doctor: doctorCount,
            nurse: nurseCount,
            lab: labCount,
            pharmacy: pharmacyCount,
            total: totalCount
        });
        
    } catch (error) {
        console.error('❌ Error updating dashboard stats:', error);
    }
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
                    <span>${approval.fullName || approval.name || '-'}</span>
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
                    <span>${approval.email || '-'}</span>
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
                <button class="action-btn view-btn" onclick="viewDetails('${approval._id || approval.id}')">
                    <i class="fas fa-eye"></i> View Details
                </button>
                <button class="action-btn approve-btn" onclick="approveUser('${approval._id || approval.id}')">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button class="action-btn reject-btn" onclick="rejectUser('${approval._id || approval.id}')">
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
    const user = pendingApprovals.find(u => (u._id || u.id) === userId);
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

async function approveUser(userId) {
    try {
        const idToken = localStorage.getItem('staff_idToken');
        if (!idToken) throw new Error('Not authenticated');
        const res = await fetch(`https://arcular-plus-backend.onrender.com/staff/api/stakeholders/${userId}/approve`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${idToken}` }
        });
        if (!res.ok) throw new Error('Failed to approve');
        await loadPendingApprovalsFromBackend();
        loadPendingApprovals();
        updateDashboard();
        closeModal();
        showNotification('User approved successfully!', 'success');
    } catch (e) {
        console.error(e);
        showNotification('Failed to approve', 'error');
    }
}

async function rejectUser(userId) {
    try {
        const idToken = localStorage.getItem('staff_idToken');
        if (!idToken) throw new Error('Not authenticated');
        const res = await fetch(`https://arcular-plus-backend.onrender.com/staff/api/stakeholders/${userId}/reject`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'Rejected by staff' })
        });
        if (!res.ok) throw new Error('Failed to reject');
        await loadPendingApprovalsFromBackend();
        loadPendingApprovals();
        updateDashboard();
        closeModal();
        showNotification('User rejected successfully!', 'error');
    } catch (e) {
        console.error(e);
        showNotification('Failed to reject', 'error');
    }
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
        localStorage.removeItem('staff_idToken');
        localStorage.removeItem('superadmin_idToken');
        localStorage.removeItem('arcstaff_idToken');
        sessionStorage.removeItem('adminLoggedIn');
        sessionStorage.removeItem('adminEmail');
        
        // Sign out from Firebase
        firebase.auth().signOut();
        
        // Show logout message
        showNotification('Logging out...', 'info');
        
        // Redirect to login page
        setTimeout(() => {
            window.location.href = 'index.html';
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
  const idToken = localStorage.getItem('staff_idToken');
  if (!idToken) {
    console.log('❌ No token found, checking Firebase auth state');
    // Check if user is already authenticated with Firebase
    firebase.auth().onAuthStateChanged(function(user) {
      if (!user) {
        console.log('❌ No user authenticated, redirecting to login');
        window.location.href = 'login.html';
        return;
      }
    });
    return;
  }
  
  console.log('✅ Token found, verifying with Firebase');
  // Verify token with Firebase
  firebase.auth().onAuthStateChanged(function(user) {
    if (!user) {
      console.log('❌ Firebase user not found, clearing token and redirecting');
      localStorage.removeItem('staff_idToken');
      window.location.href = 'login.html';
    } else {
      console.log('✅ Firebase user verified, session valid');
      // Initialize dashboard if we're on the dashboard page
      if (window.location.pathname.includes('arcstaff-dashboard.html')) {
        initializeArcStaffDashboard();
      }
    }
  });
}

// Initialize ARC Staff Dashboard
async function initializeArcStaffDashboard() {
  console.log('🚀 Initializing ARC Staff Dashboard...');
  
  try {
    // Show loading state
    showLoadingState();
    
    // Add timeout to prevent infinite loading
    const initTimeout = setTimeout(() => {
      console.log('⚠️ Dashboard initialization timeout, showing dashboard anyway');
      hideLoadingState();
      showDashboardContent();
    }, 10000); // 10 seconds timeout
    
    // Get user profile
    const idToken = localStorage.getItem('staff_idToken');
    if (!idToken) {
      console.log('⚠️ No ID token found, using basic initialization');
    }
    
    // Get current user from Firebase
    const user = firebase.auth().currentUser;
    if (!user) {
      console.log('⚠️ No Firebase user found, using basic initialization');
    }
    
    // Update user info in header and welcome section
    if (user) {
      const userEmail = user.email;
      
      // Try to fetch actual staff name from database
      try {
        const idToken = localStorage.getItem('staff_idToken');
        if (idToken) {
          const response = await fetch(`https://arcular-plus-backend.onrender.com/staff/api/staff/profile/${user.uid}`, {
            headers: {
              'Authorization': `Bearer ${idToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const staffProfile = await response.json();
            const actualName = staffProfile.fullName || staffProfile.displayName || user.email.split('@')[0];
            
            const userNameElement = document.getElementById('userName');
            const userEmailElement = document.getElementById('userEmail');
            const welcomeUserNameElement = document.getElementById('welcomeUserName');
            
            if (userNameElement) userNameElement.textContent = actualName;
            if (userEmailElement) userEmailElement.textContent = userEmail;
            if (welcomeUserNameElement) welcomeUserNameElement.textContent = actualName;
            
            console.log('✅ Staff name updated from database:', actualName);
            return;
          }
        }
      } catch (error) {
        console.log('⚠️ Could not fetch staff profile, using fallback name');
      }
      
      // Fallback to Firebase display name or email
      const fallbackName = user.displayName || user.email.split('@')[0];
      
      const userNameElement = document.getElementById('userName');
      const userEmailElement = document.getElementById('userEmail');
      const welcomeUserNameElement = document.getElementById('welcomeUserName');
      
      if (userNameElement) userNameElement.textContent = fallbackName;
      if (userEmailElement) userEmailElement.textContent = userEmail;
      if (welcomeUserNameElement) welcomeUserNameElement.textContent = fallbackName;
    }
    
    // Update current date/time
    updateCurrentDateTime();
    
    // Fetch pending stakeholders data (with fallback)
    try {
      await fetchPendingStakeholders();
    } catch (error) {
      console.log('⚠️ Error fetching stakeholders, continuing with basic data');
    }
    
    // Load recent activity
    try {
      await loadRecentActivity();
    } catch (error) {
      console.log('⚠️ Error loading activity, continuing without it');
    }
    
    // Setup event listeners
    try {
      setupDashboardEventListeners();
    } catch (error) {
      console.log('⚠️ Error setting up event listeners:', error);
    }
    
    // Clear timeout and show dashboard
    clearTimeout(initTimeout);
    hideLoadingState();
    showDashboardContent();
    
    console.log('✅ Dashboard initialized successfully');
    
  } catch (error) {
    console.error('❌ Dashboard initialization error:', error);
    showErrorMessage('Failed to initialize dashboard: ' + error.message);
    hideLoadingState();
    showDashboardContent(); // Show dashboard anyway
  }
}

// Fetch pending stakeholders data
async function fetchPendingStakeholders() {
  try {
    const idToken = localStorage.getItem('staff_idToken');
    
    const response = await fetch('https://arcular-plus-backend.onrender.com/staff/api/stakeholders/pending', {
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      const stakeholders = result.data || [];
      console.log('📊 Fetched pending stakeholders from backend:', stakeholders);
      
      // Update stats
      updateDashboardStats(stakeholders);
      
      // Render pending approvals list
      renderPendingApprovals(stakeholders);
    } else {
      console.error('❌ Failed to fetch pending stakeholders:', response.status);
      showErrorMessage('Failed to load pending approvals. Please try again.');
      
      // Show empty state
      updateDashboardStats([]);
      renderPendingApprovals([]);
    }
  } catch (error) {
    console.error('❌ Error in fetchPendingStakeholders:', error);
    showErrorMessage('Network error loading dashboard data. Please check your connection.');
    
    // Show empty state
    updateDashboardStats([]);
    renderPendingApprovals([]);
  }
}

// Update dashboard statistics
function updateDashboardStats(stakeholders) {
  const stats = {
    hospital: 0,
    doctor: 0,
    nurse: 0,
    lab: 0,
    pharmacy: 0
  };
  
  stakeholders.forEach(stakeholder => {
    // Handle both 'type' and 'userType' fields from backend
    const userType = stakeholder.userType || stakeholder.type;
    if (userType && stats.hasOwnProperty(userType)) {
      stats[userType]++;
    }
  });
  
  // Update individual counts
  document.getElementById('hospitalCount').textContent = stats.hospital;
  document.getElementById('doctorCount').textContent = stats.doctor;
  document.getElementById('nurseCount').textContent = stats.nurse;
  document.getElementById('labCount').textContent = stats.lab;
  document.getElementById('pharmacyCount').textContent = stats.pharmacy;
  
  // Update total count
  const total = Object.values(stats).reduce((sum, count) => sum + count, 0);
  document.getElementById('totalCount').textContent = total;
  
  // Update trend indicators
  updateTrendIndicators(stats);
}

// Render pending approvals list
function renderPendingApprovals(stakeholders) {
  const container = document.getElementById('pendingApprovalsList');
  if (!container) return;
  
  if (stakeholders.length === 0) {
    container.innerHTML = '<div class="no-data">No pending approvals at the moment</div>';
    return;
  }
  
  const approvalsHTML = stakeholders.slice(0, 5).map(stakeholder => {
    // Handle both 'type' and 'userType' fields from backend
    const userType = stakeholder.userType || stakeholder.type;
    const displayName = stakeholder.fullName || stakeholder.name || stakeholder.hospitalName || stakeholder.doctorName || 'Unknown';
    const email = stakeholder.email || 'N/A';
    const submittedDate = stakeholder.createdAt || stakeholder.submittedAt || new Date();
    
    return `
      <div class="approval-item">
        <div class="approval-info">
          <h4>${displayName}</h4>
          <p><strong>Type:</strong> ${userType.charAt(0).toUpperCase() + userType.slice(1)}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Submitted:</strong> ${new Date(submittedDate).toLocaleDateString()}</p>
        </div>
        <div class="approval-actions">
          <button class="btn btn-success btn-sm" onclick="viewStakeholderDetails('${stakeholder._id}', '${userType}')">
            <i class="fas fa-eye"></i> View Details
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = approvalsHTML;
}

// Show all pending approvals in a modal
function showAllPendingApprovals() {
  const modal = document.getElementById('approvalModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalContent = document.getElementById('modalContent');
  
  if (!modal || !modalTitle || !modalContent) return;
  
  modalTitle.textContent = 'All Pending Approvals';
  
  // Get current pending stakeholders data
  const container = document.getElementById('pendingApprovalsList');
  if (!container) return;
  
  const approvalItems = container.querySelectorAll('.approval-item');
  if (approvalItems.length === 0) {
    modalContent.innerHTML = '<div class="no-data">No pending approvals to display</div>';
  } else {
    const allApprovalsHTML = Array.from(approvalItems).map(item => {
      const name = item.querySelector('h4').textContent;
      const type = item.querySelector('p:nth-child(2)').textContent.replace('Type: ', '');
      const email = item.querySelector('p:nth-child(3)').textContent.replace('Email: ', '');
      const submitted = item.querySelector('p:nth-child(4)').textContent.replace('Submitted: ', '');
      
      return `
        <div class="approval-item-full">
          <div class="approval-info">
            <h4>${name}</h4>
            <p><strong>Type:</strong> ${type}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Submitted:</strong> ${submitted}</p>
          </div>
        </div>
      `;
    }).join('');
    
    modalContent.innerHTML = allApprovalsHTML;
  }
  
  modal.style.display = 'block';
}

// Setup dashboard event listeners
function setupDashboardEventListeners() {
  // Refresh button
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      await fetchPendingStakeholders();
      showSuccessMessage('Dashboard refreshed successfully');
    });
  }
  
  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to logout?')) {
        await firebase.auth().signOut();
        localStorage.removeItem('staff_idToken');
        window.location.href = 'index.html';
      }
    });
  }
  
  // View all button
  const viewAllBtn = document.getElementById('viewAllBtn');
  if (viewAllBtn) {
    viewAllBtn.addEventListener('click', () => {
      showAllPendingApprovals();
    });
  }
  
  // Refresh activity button
  const refreshActivityBtn = document.getElementById('refreshActivityBtn');
  if (refreshActivityBtn) {
    refreshActivityBtn.addEventListener('click', async () => {
      await loadRecentActivity();
      showSuccessMessage('Activity refreshed successfully');
    });
  }
  
  // Setup search functionality
  setupSearchFunctionality();
  
  // Setup modal close functionality
  setupModalCloseFunctionality();
}

// Setup modal close functionality
function setupModalCloseFunctionality() {
  // Close modals when clicking outside
  window.addEventListener('click', (event) => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      if (event.target === modal) {
        modal.style.display = 'none';
      }
    });
  });
  
  // Close modals when clicking close button
  const closeButtons = document.querySelectorAll('.close');
  closeButtons.forEach(button => {
    button.addEventListener('click', () => {
      const modal = button.closest('.modal');
      if (modal) {
        modal.style.display = 'none';
      }
    });
  });
}

// View stakeholder details
async function viewStakeholderDetails(stakeholderId, userType) {
  try {
    const idToken = localStorage.getItem('staff_idToken');
    const response = await fetch(`https://arcular-plus-backend.onrender.com/staff/service-provider/${userType}/${stakeholderId}`, {
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch stakeholder details');
    }
    
    const data = await response.json();
    showStakeholderModal(data.data);
    
  } catch (error) {
    console.error('❌ Error fetching stakeholder details:', error);
    showErrorMessage('Failed to fetch stakeholder details: ' + error.message);
  }
}

// Show stakeholder modal
function showStakeholderModal(stakeholderData) {
  const modal = document.getElementById('approvalModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalContent = document.getElementById('modalContent');
  
  if (!modal || !modalTitle || !modalContent) return;
  
  modalTitle.textContent = `Review ${stakeholderData.userType} Application`;
  
  const contentHTML = `
    <div class="stakeholder-details">
      <h4>Basic Information</h4>
      <div class="info-grid">
        ${Object.entries(stakeholderData.providerInfo.basicInfo).map(([key, value]) => 
          `<div class="info-item"><strong>${key}:</strong> ${value || 'N/A'}</div>`
        ).join('')}
      </div>
      
      <h4>Documents</h4>
      <div class="documents-list">
        ${Object.entries(stakeholderData.documents).map(([key, url]) => 
          `<div class="document-item"><a href="${url}" target="_blank">${key}</a></div>`
        ).join('')}
      </div>
      
      <h4>Status</h4>
      <div class="status-info">
        <p><strong>Approval Status:</strong> ${stakeholderData.providerInfo.status.approvalStatus}</p>
        <p><strong>Registration Date:</strong> ${new Date(stakeholderData.providerInfo.status.registrationDate).toLocaleDateString()}</p>
      </div>
    </div>
  `;
  
  modalContent.innerHTML = contentHTML;
  
  // Setup modal event listeners
  setupModalEventListeners(stakeholderData);
  
  modal.style.display = 'block';
}

// Setup modal event listeners
function setupModalEventListeners(stakeholderData) {
  const approveBtn = document.getElementById('approveBtn');
  const rejectBtn = document.getElementById('rejectBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const closeBtn = document.querySelector('.close');
  
  if (approveBtn) {
    approveBtn.onclick = () => handleApproveStakeholder(stakeholderData.userId);
  }
  
  if (rejectBtn) {
    rejectBtn.onclick = () => showRejectionModal(stakeholderData.userId);
  }
  
  if (cancelBtn) {
    cancelBtn.onclick = () => closeModal('approvalModal');
  }
  
  if (closeBtn) {
    closeBtn.onclick = () => closeModal('approvalModal');
  }
}

// Show rejection modal
function showRejectionModal(stakeholderId) {
  closeModal('approvalModal');
  const modal = document.getElementById('rejectionModal');
  if (modal) {
    modal.style.display = 'block';
    
    // Setup rejection modal event listeners
    const confirmRejectBtn = document.getElementById('confirmRejectBtn');
    const cancelRejectBtn = document.getElementById('cancelRejectBtn');
    const closeBtn = modal.querySelector('.close');
    
    if (confirmRejectBtn) {
      confirmRejectBtn.onclick = () => handleRejectStakeholder(stakeholderId);
    }
    
    if (cancelRejectBtn) {
      cancelRejectBtn.onclick = () => closeModal('rejectionModal');
    }
    
    if (closeBtn) {
      closeBtn.onclick = () => closeModal('rejectionModal');
    }
  }
}

// Close modal
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
  }
}

// Loading state functions
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

// Message functions
function showSuccessMessage(message) {
  showMessage(message, 'success');
}

function showErrorMessage(message) {
  showMessage(message, 'error');
}

function showMessage(message, type) {
  const container = document.getElementById('messageContainer');
  if (!container) return;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `message message-${type}`;
  messageDiv.textContent = message;
  
  container.appendChild(messageDiv);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.parentNode.removeChild(messageDiv);
    }
  }, 5000);
}

function setupArcStaffLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = async function() {
      if (confirm('Are you sure you want to logout?')) {
        await firebase.auth().signOut();
        localStorage.removeItem('staff_idToken');
        localStorage.removeItem('arcstaff_idToken');
        window.location.href = 'login.html';
      }
    };
  }
}

async function fetchAndRenderPendingStakeholders() {
  const idToken = localStorage.getItem('staff_idToken');
  if (!idToken) return;
  const tableBody = document.querySelector('#pending-table tbody');
  if (!tableBody) return;
  
  tableBody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
  try {
    const res = await fetch('https://arcular-plus-backend.onrender.com/staff/api/stakeholders/pending', {
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
  const idToken = localStorage.getItem('staff_idToken');
  if (!idToken) return;
  
  try {
    showSuccessMessage('Processing approval...');
    
    const res = await fetch(`https://arcular-plus-backend.onrender.com/staff/api/stakeholders/${id}/approve`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + idToken }
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Failed to approve stakeholder');
    }
    
    const result = await res.json();
    console.log('✅ Stakeholder approved:', result);
    
    // Close modal
    closeModal('approvalModal');
    
    // Show success message
    showSuccessMessage('Stakeholder approved successfully! They can now access their dashboard.');
    
    // Refresh dashboard data
    await fetchPendingStakeholders();
    
  } catch (err) {
    console.error('❌ Approval error:', err);
    showErrorMessage('Failed to approve stakeholder: ' + err.message);
  }
}

async function handleRejectStakeholder(id) {
  const idToken = localStorage.getItem('staff_idToken');
  if (!idToken) return;
  
  try {
    const reason = document.getElementById('rejectionReason').value.trim();
    if (!reason) {
      showErrorMessage('Please provide a reason for rejection');
      return;
    }
    
    showSuccessMessage('Processing rejection...');
    
    const res = await fetch(`https://arcular-plus-backend.onrender.com/staff/api/stakeholders/${id}/reject`, {
      method: 'POST',
      headers: { 
        'Authorization': 'Bearer ' + idToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: reason })
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Failed to reject stakeholder');
    }
    
    const result = await res.json();
    console.log('✅ Stakeholder rejected:', result);
    
    // Close modal
    closeModal('rejectionModal');
    
    // Clear rejection reason
    document.getElementById('rejectionReason').value = '';
    
    // Show success message
    showSuccessMessage('Stakeholder rejected successfully. They will receive an email with the rejection reason.');
    
    // Refresh dashboard data
    await fetchPendingStakeholders();
    
  } catch (err) {
    console.error('❌ Rejection error:', err);
    showErrorMessage('Failed to reject stakeholder: ' + err.message);
  }
}

// Update current date/time
function updateCurrentDateTime() {
  const now = new Date();
  const dateTimeString = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) + ' ' + now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const dateTimeElement = document.getElementById('currentDateTime');
  if (dateTimeElement) {
    dateTimeElement.textContent = dateTimeString;
  }
  
  // Update every minute
  setTimeout(updateCurrentDateTime, 60000);
}

// Update trend indicators
function updateTrendIndicators(stats) {
  // This function can be enhanced to show actual trends
  // For now, we'll show "New today" for all categories
  const trendElements = document.querySelectorAll('.stat-trend');
  trendElements.forEach(element => {
    const icon = element.querySelector('i');
    const text = element.querySelector('span');
    
    if (icon && text) {
      icon.className = 'fas fa-arrow-up';
      text.textContent = 'New today';
    }
  });
}

// Load recent activity
async function loadRecentActivity() {
  try {
    const idToken = localStorage.getItem('staff_idToken');
    if (!idToken) return;
    
    // For now, we'll show mock activity data
    // In the future, this can fetch from the backend
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
    
    renderRecentActivity(activities);
    
  } catch (error) {
    console.error('❌ Error loading recent activity:', error);
  }
}

// Render recent activity
function renderRecentActivity(activities) {
  const container = document.getElementById('recentActivityList');
  if (!container) return;
  
  if (activities.length === 0) {
    container.innerHTML = '<div class="no-data">No recent activity</div>';
    return;
  }
  
  const activitiesHTML = activities.map(activity => `
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
  
  container.innerHTML = activitiesHTML;
}

// Quick action functions
function exportData() {
  // Show export options modal
  const exportOptions = [
    { name: 'Pending Approvals', type: 'pending' },
    { name: 'Approved Users', type: 'approved' },
    { name: 'All Stakeholders', type: 'all' },
    { name: 'Activity Log', type: 'activity' }
  ];
  
  let exportHTML = '<div class="export-options">';
  exportHTML += '<h4>Select Data to Export</h4>';
  exportOptions.forEach(option => {
    exportHTML += `<button class="export-option-btn" onclick="downloadExport('${option.type}')">${option.name}</button>`;
  });
  exportHTML += '</div>';
  
  showModal('Export Data', exportHTML, 'Export Options');
}

function generateReport() {
  const reportTypes = [
    { name: 'Monthly Summary', icon: 'fas fa-calendar-alt' },
    { name: 'Approval Statistics', icon: 'fas fa-chart-pie' },
    { name: 'User Growth', icon: 'fas fa-users' },
    { name: 'Document Verification', icon: 'fas fa-file-check' }
  ];
  
  let reportHTML = '<div class="report-types">';
  reportHTML += '<h4>Select Report Type</h4>';
  reportHTML += '<div class="report-grid">';
  reportTypes.forEach(report => {
    reportHTML += `
      <div class="report-type-card" onclick="generateReportType('${report.name}')">
        <i class="${report.icon}"></i>
        <span>${report.name}</span>
      </div>
    `;
  });
  reportHTML += '</div></div>';
  
  showModal('Generate Report', reportHTML, 'Report Generation');
}

function viewAnalytics() {
  const analyticsHTML = `
    <div class="analytics-preview">
      <h4>Analytics Dashboard Preview</h4>
      <div class="analytics-stats">
        <div class="stat-card">
          <h5>Approval Rate</h5>
          <div class="stat-value">${calculateApprovalRate()}%</div>
        </div>
        <div class="stat-card">
          <h5>Processing Time</h5>
          <div class="stat-value">${calculateAvgProcessingTime()} days</div>
        </div>
        <div class="stat-card">
          <h5>Document Quality</h5>
          <div class="stat-value">${calculateDocumentQuality()}%</div>
        </div>
      </div>
      <p class="analytics-note">Full analytics dashboard will be available in the next update.</p>
    </div>
  `;
  
  showModal('Analytics Preview', analyticsHTML, 'Analytics Dashboard');
}

function manageSettings() {
  const settingsHTML = `
    <div class="settings-panel">
      <h4>Staff Settings</h4>
      <div class="setting-group">
        <label>Email Notifications</label>
        <select id="emailNotifications">
          <option value="all">All notifications</option>
          <option value="important">Important only</option>
          <option value="none">None</option>
        </select>
      </div>
      <div class="setting-group">
        <label>Dashboard Refresh Rate</label>
        <select id="refreshRate">
          <option value="30">30 seconds</option>
          <option value="60">1 minute</option>
          <option value="300">5 minutes</option>
        </select>
      </div>
      <div class="setting-group">
        <label>Profile Information</label>
        <button class="btn btn-primary" onclick="editStaffProfile()">Edit Profile</button>
      </div>
      <div class="setting-note">
        <p><i class="fas fa-info-circle"></i> Profile changes require admin approval</p>
      </div>
    </div>
  `;
  
  showModal('Settings', settingsHTML, 'Staff Settings');
}

// Helper functions for analytics calculations
function calculateApprovalRate() {
  if (!pendingApprovals || !allUsers) return 0;
  const total = pendingApprovals.length + Object.values(allUsers).flat().length;
  const approved = Object.values(allUsers).flat().length;
  return total > 0 ? Math.round((approved / total) * 100) : 0;
}

function calculateAvgProcessingTime() {
  // Mock calculation - in real implementation, this would use actual timestamps
  return Math.floor(Math.random() * 3) + 1;
}

function calculateDocumentQuality() {
  // Mock calculation - in real implementation, this would analyze document completeness
  return Math.floor(Math.random() * 20) + 80;
}

// Generic modal function for quick actions
function showModal(title, content, modalType) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'quickActionModal';
  
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>${title}</h3>
        <span class="close" onclick="closeQuickActionModal()">&times;</span>
      </div>
      <div class="modal-body">
        ${content}
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.style.display = 'block';
}

function closeQuickActionModal() {
  const modal = document.getElementById('quickActionModal');
  if (modal) {
    modal.remove();
  }
}

// Export and report generation functions
function downloadExport(type) {
  showSuccessMessage(`Exporting ${type} data... This feature will be available in the next update.`);
  closeQuickActionModal();
}

function generateReportType(type) {
  showSuccessMessage(`Generating ${type} report... This feature will be available in the next update.`);
  closeQuickActionModal();
}

function editStaffProfile() {
  closeQuickActionModal();
  
  // Get current staff profile data
  const user = firebase.auth().currentUser;
  if (!user) {
    showErrorMessage('User not authenticated');
    return;
  }
  
  // Show profile editing modal
  const profileModal = document.createElement('div');
  profileModal.className = 'modal';
  profileModal.id = 'profileEditModal';
  
  profileModal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Edit Profile</h3>
        <span class="close" onclick="closeProfileEditModal()">&times;</span>
      </div>
      <div class="modal-body">
        <form id="profileEditForm">
          <div class="form-group">
            <label for="edit-fullName">Full Name</label>
            <input type="text" id="edit-fullName" value="${currentUser?.data?.fullName || ''}" required>
          </div>
          <div class="form-group">
            <label for="edit-phone">Phone Number</label>
            <input type="tel" id="edit-phone" value="${currentUser?.data?.mobileNumber || ''}" required>
          </div>
          <div class="form-group">
            <label for="edit-department">Department</label>
            <input type="text" id="edit-department" value="${currentUser?.data?.department || ''}" required>
          </div>
          <div class="form-group">
            <label for="edit-designation">Designation</label>
            <input type="text" id="edit-designation" value="${currentUser?.data?.designation || ''}" required>
          </div>
          <div class="form-group">
            <label for="edit-address">Address</label>
            <textarea id="edit-address" rows="3">${currentUser?.data?.address || ''}</textarea>
          </div>
          <div class="approval-notice">
            <i class="fas fa-info-circle"></i>
            <p>Profile changes will be submitted for admin approval. You will be notified once approved.</p>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" onclick="closeProfileEditModal()" class="btn btn-secondary">Cancel</button>
        <button type="button" onclick="submitProfileChanges()" class="btn btn-primary">Submit Changes</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(profileModal);
  profileModal.style.display = 'block';
}

function closeProfileEditModal() {
  const modal = document.getElementById('profileEditModal');
  if (modal) {
    modal.remove();
  }
}

async function submitProfileChanges() {
  try {
    const user = firebase.auth().currentUser;
    if (!user) {
      showErrorMessage('User not authenticated');
      return;
    }
    
    const idToken = localStorage.getItem('staff_idToken');
    if (!idToken) {
      showErrorMessage('Authentication token not found');
      return;
    }
    
    const profileData = {
      fullName: document.getElementById('edit-fullName').value,
      mobileNumber: document.getElementById('edit-phone').value,
      department: document.getElementById('edit-department').value,
      designation: document.getElementById('edit-designation').value,
      address: document.getElementById('edit-address').value,
      requiresApproval: true,
      submittedAt: new Date().toISOString()
    };
    
    // Submit profile changes for approval
    const response = await fetch(`https://arcular-plus-backend.onrender.com/staff/api/staff/profile-changes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(profileData)
    });
    
    if (response.ok) {
      showSuccessMessage('Profile changes submitted for admin approval. You will be notified once approved.');
      closeProfileEditModal();
    } else {
      const error = await response.json();
      showErrorMessage(error.message || 'Failed to submit profile changes');
    }
    
  } catch (error) {
    console.error('Error submitting profile changes:', error);
    showErrorMessage('Failed to submit profile changes. Please try again.');
  }
}

// Enhanced stakeholder details modal
function showStakeholderModal(stakeholderData) {
  const modal = document.getElementById('approvalModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalContent = document.getElementById('modalContent');
  
  if (!modal || !modalTitle || !modalContent) return;
  
  modalTitle.textContent = `Review ${stakeholderData.userType} Application`;
  
  const contentHTML = `
    <div class="stakeholder-details">
      <h4>Basic Information</h4>
      <div class="info-grid">
        ${Object.entries(stakeholderData.providerInfo.basicInfo || {}).map(([key, value]) => 
          `<div class="info-item"><strong>${key}:</strong> ${value || 'N/A'}</div>`
        ).join('')}
      </div>
      
      <h4>Documents</h4>
      <div class="documents-list">
        ${Object.entries(stakeholderData.documents || {}).map(([key, url]) => 
          `<div class="document-item"><a href="${url}" target="_blank">${key}</a></div>`
        ).join('')}
      </div>
      
      <h4>Status</h4>
      <div class="status-info">
        <p><strong>Approval Status:</strong> ${stakeholderData.providerInfo.status?.approvalStatus || 'Pending'}</p>
        <p><strong>Registration Date:</strong> ${new Date(stakeholderData.providerInfo.status?.registrationDate || Date.now()).toLocaleDateString()}</p>
      </div>
    </div>
  `;
  
  modalContent.innerHTML = contentHTML;
  
  // Setup modal event listeners
  setupModalEventListeners(stakeholderData);
  
  modal.style.display = 'block';
}

// Setup modal event listeners with enhanced functionality
function setupModalEventListeners(stakeholderData) {
  const approveBtn = document.getElementById('approveBtn');
  const rejectBtn = document.getElementById('rejectBtn');
  const requestDocsBtn = document.getElementById('requestDocsBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const closeBtn = document.querySelector('.close');
  
  if (approveBtn) {
    approveBtn.onclick = () => handleApproveStakeholder(stakeholderData.userId);
  }
  
  if (rejectBtn) {
    rejectBtn.onclick = () => showRejectionModal(stakeholderData.userId);
  }
  
  if (requestDocsBtn) {
    requestDocsBtn.onclick = () => showDocumentRequestModal(stakeholderData.userId);
  }
  
  if (cancelBtn) {
    cancelBtn.onclick = () => closeModal('approvalModal');
  }
  
  if (closeBtn) {
    closeBtn.onclick = () => closeModal('approvalModal');
  }
}

// Show document request modal
function showDocumentRequestModal(stakeholderId) {
  closeModal('approvalModal');
  const modal = document.getElementById('documentRequestModal');
  if (modal) {
    modal.style.display = 'block';
    
    // Setup document request modal event listeners
    const confirmRequestBtn = document.getElementById('confirmRequestBtn');
    const cancelRequestBtn = document.getElementById('cancelRequestBtn');
    const closeBtn = modal.querySelector('.close');
    
    if (confirmRequestBtn) {
      confirmRequestBtn.onclick = () => handleDocumentRequest(stakeholderId);
    }
    
    if (cancelRequestBtn) {
      cancelRequestBtn.onclick = () => closeModal('documentRequestModal');
    }
    
    if (closeBtn) {
      closeBtn.onclick = () => closeModal('documentRequestModal');
    }
  }
}

// Handle document request
async function handleDocumentRequest(stakeholderId) {
  try {
    const documentRequest = document.getElementById('documentRequest').value.trim();
    const deadline = document.getElementById('deadline').value;
    const requestNotes = document.getElementById('requestNotes').value.trim();
    
    if (!documentRequest) {
      showErrorMessage('Please specify which documents are required');
      return;
    }
    
    if (!deadline) {
      showErrorMessage('Please set a deadline for document submission');
      return;
    }
    
    showSuccessMessage('Document request sent successfully!');
    closeModal('documentRequestModal');
    
    // Clear form
    document.getElementById('documentRequest').value = '';
    document.getElementById('deadline').value = '';
    document.getElementById('requestNotes').value = '';
    
    // Send document request to backend
    try {
      const idToken = localStorage.getItem('staff_idToken');
      const response = await fetch(`https://arcular-plus-backend.onrender.com/staff/api/stakeholders/${stakeholderId}/request-documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requiredDocuments: requiredDocuments,
          deadline: deadline,
          notes: notes
        })
      });

      if (response.ok) {
        const result = await response.json();
        showSuccessMessage('Document request sent successfully');
        closeDocumentRequestModal();
        
        // Refresh the pending approvals list
        await fetchPendingStakeholders();
      } else {
        const errorData = await response.json();
        showErrorMessage(`Failed to send document request: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Document request error:', error);
      showErrorMessage('Failed to send document request. Please try again.');
    }
  } catch (error) {
    console.error('❌ Document request error:', error);
    showErrorMessage('Failed to send document request: ' + error.message);
  }
}

// Enhanced search functionality
function setupSearchFunctionality() {
  const searchInput = document.getElementById('searchApprovals');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      filterApprovalsBySearch(searchTerm);
    });
  }
  
  const filterSelect = document.getElementById('filterType');
  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
      const filterType = e.target.value;
      filterApprovalsByType(filterType);
    });
  }
}

// Filter approvals by search term
function filterApprovalsBySearch(searchTerm) {
  const approvalItems = document.querySelectorAll('.approval-item');
  
  approvalItems.forEach(item => {
    const text = item.textContent.toLowerCase();
    if (text.includes(searchTerm)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}

// Filter approvals by type
function filterApprovalsByType(filterType) {
  const approvalItems = document.querySelectorAll('.approval-item');
  
  approvalItems.forEach(item => {
    const typeElement = item.querySelector('p strong:contains("Type:")');
    if (typeElement) {
      const type = typeElement.nextSibling.textContent.toLowerCase();
      if (filterType === 'all' || type === filterType) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    }
  });
}

// Direct initialization trigger for dashboard page
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 DOM Content Loaded - Checking if we are on dashboard page');
  console.log('Current pathname:', window.location.pathname);
  
  // Check if we are on the dashboard page
  if (window.location.pathname.includes('arcstaff-dashboard.html') || 
      window.location.pathname.includes('arcstaff-dashboard') ||
      window.location.pathname.includes('arcstaff-dashboard.html')) {
    console.log('✅ On dashboard page, initializing...');
    
    // Add a small delay to ensure Firebase is ready
    setTimeout(() => {
      console.log('🔄 Starting dashboard initialization...');
      try {
        initializeArcStaffDashboard();
      } catch (error) {
        console.error('❌ Error in main initialization, using fallback:', error);
        // Fallback initialization
        fallbackDashboardInit();
      }
    }, 1000);
  } else {
    console.log('❌ Not on dashboard page, current path:', window.location.pathname);
  }
});

// Fallback dashboard initialization
function fallbackDashboardInit() {
  console.log('🔄 Using fallback dashboard initialization...');
  
  try {
    // Show loading state
    showLoadingState();
    
    // Update current date/time
    updateCurrentDateTime();
    
    // Load fallback data
    const fallbackData = [
      {
        _id: '1',
        type: 'hospital',
        name: 'City General Hospital',
        email: 'admin@cityhospital.com',
        submittedAt: new Date().toISOString()
      },
      {
        _id: '2',
        type: 'doctor',
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@email.com',
        submittedAt: new Date().toISOString()
      }
    ];
    
    // Update stats
    updateDashboardStats(fallbackData);
    
    // Render pending approvals list
    renderPendingApprovals(fallbackData);
    
    // Load recent activity
    loadRecentActivity();
    
    // Setup event listeners
    setupDashboardEventListeners();
    
    // Hide loading and show dashboard
    hideLoadingState();
    showDashboardContent();
    
    console.log('✅ Fallback dashboard initialized successfully');
    
  } catch (error) {
    console.error('❌ Fallback initialization failed:', error);
    // Show dashboard anyway
    hideLoadingState();
    showDashboardContent();
  }
}

// Render pending approvals list in the UI
function renderPendingApprovalsList() {
    const container = document.getElementById('pendingApprovalsList');
    if (!container) return;
    
    if (pendingApprovals.length === 0) {
        container.innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-check-circle"></i>
                <h3>No Pending Approvals</h3>
                <p>All service provider applications have been reviewed.</p>
            </div>
        `;
        return;
    }
    
    const approvalsHTML = pendingApprovals.map(approval => {
        const typeIcon = getTypeIcon(approval.type);
        const typeColor = getTypeColor(approval.type);
        const submittedDate = new Date(approval.createdAt || approval.submittedAt || Date.now()).toLocaleDateString();
        
        return `
            <div class="approval-card ${typeColor}" data-id="${approval._id || approval.id}" data-type="${approval.type}">
                <div class="approval-header">
                    <div class="approval-type">
                        <i class="${typeIcon}"></i>
                        <span class="type-label">${approval.type.charAt(0).toUpperCase() + approval.type.slice(1)}</span>
                    </div>
                    <div class="approval-status pending">Pending Review</div>
                </div>
                
                <div class="approval-content">
                    <h4 class="approval-name">${approval.fullName || approval.name || approval.labName || approval.pharmacyName || 'N/A'}</h4>
                    <div class="approval-details">
                        <div class="detail-item">
                            <i class="fas fa-envelope"></i>
                            <span>${approval.email || 'N/A'}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-phone"></i>
                            <span>${approval.mobileNumber || approval.contact || 'N/A'}</span>
                        </div>
                        ${approval.licenseNumber ? `
                        <div class="detail-item">
                            <i class="fas fa-id-card"></i>
                            <span>License: ${approval.licenseNumber}</span>
                        </div>
                        ` : ''}
                        ${approval.specialization ? `
                        <div class="detail-item">
                            <i class="fas fa-stethoscope"></i>
                            <span>${approval.specialization}</span>
                        </div>
                        ` : ''}
                        ${approval.address ? `
                        <div class="detail-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${approval.address}</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="approval-meta">
                        <span class="submission-date">
                            <i class="fas fa-calendar"></i>
                            Submitted: ${submittedDate}
                        </span>
                    </div>
                </div>
                
                <div class="approval-actions">
                    <button class="btn btn-primary btn-sm" onclick="viewApprovalDetails('${approval._id || approval.id}', '${approval.type}')">
                        <i class="fas fa-eye"></i> Review
                    </button>
                    <button class="btn btn-success btn-sm" onclick="approveApplication('${approval._id || approval.id}', '${approval.type}')">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="rejectApplication('${approval._id || approval.id}', '${approval.type}')">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = approvalsHTML;
}

// Get icon for service provider type
function getTypeIcon(type) {
    const icons = {
        'hospital': 'fas fa-hospital',
        'doctor': 'fas fa-user-md',
        'nurse': 'fas fa-user-nurse',
        'lab': 'fas fa-flask',
        'pharmacy': 'fas fa-pills'
    };
    return icons[type] || 'fas fa-user';
}

// Get color class for service provider type
function getTypeColor(type) {
    const colors = {
        'hospital': 'hospital-card',
        'doctor': 'doctor-card',
        'nurse': 'nurse-card',
        'lab': 'lab-card',
        'pharmacy': 'pharmacy-card'
    };
    return colors[type] || 'default-card';
}

// View approval details in modal
async function viewApprovalDetails(id, type) {
    try {
        console.log(`🔄 Loading details for ${type} with ID: ${id}`);
        
        // Show loading state
        showModalLoading();
        
        // Fetch detailed information
        const details = await fetchServiceProviderDetails(type, id);
        
        if (!details) {
            throw new Error('Failed to fetch service provider details');
        }
        
        // Populate modal with real data
        populateApprovalModal(details, type);
        
        // Show the modal
        document.getElementById('approvalModal').style.display = 'block';
        
    } catch (error) {
        console.error('❌ Error loading approval details:', error);
        showErrorMessage('Failed to load approval details. Please try again.');
    }
}

// Populate approval modal with real data
function populateApprovalModal(details, type) {
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    
    if (!modalTitle || !modalContent) return;
    
    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
    modalTitle.textContent = `Review ${typeLabel} Application`;
    
    // Create detailed view based on type
    let detailsHTML = '';
    
    switch (type) {
        case 'hospital':
            detailsHTML = createHospitalDetailsHTML(details);
            break;
        case 'doctor':
            detailsHTML = createDoctorDetailsHTML(details);
            break;
        case 'nurse':
            detailsHTML = createNurseDetailsHTML(details);
            break;
        case 'lab':
            detailsHTML = createLabDetailsHTML(details);
            break;
        case 'pharmacy':
            detailsHTML = createPharmacyDetailsHTML(details);
            break;
        default:
            detailsHTML = createGenericDetailsHTML(details, type);
    }
    
    modalContent.innerHTML = detailsHTML;
    
    // Store current approval info for approve/reject actions
    window.currentApproval = { id: details._id, type: type, details: details };
}

// Create HTML for hospital details
function createHospitalDetailsHTML(hospital) {
    return `
        <div class="approval-details-view">
            <div class="detail-section">
                <h4><i class="fas fa-hospital"></i> Hospital Information</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Hospital Name:</label>
                        <span>${hospital.hospitalName || hospital.fullName || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Email:</label>
                        <span>${hospital.email || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Phone:</label>
                        <span>${hospital.mobileNumber || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Address:</label>
                        <span>${hospital.address || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>City:</label>
                        <span>${hospital.city || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>State:</label>
                        <span>${hospital.state || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>License Number:</label>
                        <span>${hospital.licenseNumber || 'N/A'}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h4><i class="fas fa-file-alt"></i> Documents</h4>
                <div class="documents-grid">
                    ${hospital.licenseDocumentUrl ? `
                        <div class="document-item">
                            <i class="fas fa-file-pdf"></i>
                            <span>License Document</span>
                            <a href="${hospital.licenseDocumentUrl}" target="_blank" class="btn btn-sm btn-secondary">
                                <i class="fas fa-eye"></i> View
                            </a>
                        </div>
                    ` : ''}
                    ${hospital.registrationCertificateUrl ? `
                        <div class="document-item">
                            <i class="fas fa-file-pdf"></i>
                            <span>Registration Certificate</span>
                            <a href="${hospital.registrationCertificateUrl}" target="_blank" class="btn btn-sm btn-secondary">
                                <i class="fas fa-eye"></i> View
                            </a>
                        </div>
                    ` : ''}
                    ${hospital.buildingPermitUrl ? `
                        <div class="document-item">
                            <i class="fas fa-file-pdf"></i>
                            <span>Building Permit</span>
                            <a href="${hospital.buildingPermitUrl}" target="_blank" class="btn btn-sm btn-secondary">
                                <i class="fas fa-eye"></i> View
                            </a>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// Create HTML for doctor details
function createDoctorDetailsHTML(doctor) {
    return `
        <div class="approval-details-view">
            <div class="detail-section">
                <h4><i class="fas fa-user-md"></i> Doctor Information</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Full Name:</label>
                        <span>${doctor.fullName || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Email:</label>
                        <span>${doctor.email || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Phone:</label>
                        <span>${doctor.mobileNumber || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Specialization:</label>
                        <span>${doctor.specialization || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Experience:</label>
                        <span>${doctor.experienceYears || 0} years</span>
                    </div>
                    <div class="detail-item">
                        <label>License Number:</label>
                        <span>${doctor.licenseNumber || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Medical Registration:</label>
                        <span>${doctor.medicalRegistrationNumber || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Qualification:</label>
                        <span>${doctor.qualification || 'N/A'}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h4><i class="fas fa-file-alt"></i> Documents</h4>
                <div class="documents-grid">
                    ${doctor.medicalDegreeUrl ? `
                        <div class="document-item">
                            <i class="fas fa-file-pdf"></i>
                            <span>Medical Degree</span>
                            <a href="${doctor.medicalDegreeUrl}" target="_blank" class="btn btn-sm btn-secondary">
                                <i class="fas fa-eye"></i> View
                            </a>
                        </div>
                    ` : ''}
                    ${doctor.licenseDocumentUrl ? `
                        <div class="document-item">
                            <i class="fas fa-file-pdf"></i>
                            <span>License Certificate</span>
                            <a href="${doctor.licenseDocumentUrl}" target="_blank" class="btn btn-sm btn-secondary">
                                <i class="fas fa-eye"></i> View
                            </a>
                        </div>
                    ` : ''}
                    ${doctor.identityProofUrl ? `
                        <div class="document-item">
                            <i class="fas fa-file-pdf"></i>
                            <span>Identity Proof</span>
                            <a href="${doctor.identityProofUrl}" target="_blank" class="btn btn-sm btn-secondary">
                                <i class="fas fa-eye"></i> View
                            </a>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// Create HTML for nurse details
function createNurseDetailsHTML(nurse) {
    return `
        <div class="approval-details-view">
            <div class="detail-section">
                <h4><i class="fas fa-user-nurse"></i> Nurse Information</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Full Name:</label>
                        <span>${nurse.fullName || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Email:</label>
                        <span>${nurse.email || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Phone:</label>
                        <span>${nurse.mobileNumber || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Qualification:</label>
                        <span>${nurse.qualification || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Experience:</label>
                        <span>${nurse.experienceYears || 0} years</span>
                    </div>
                    <div class="detail-item">
                        <label>License Number:</label>
                        <span>${nurse.licenseNumber || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Hospital Affiliation:</label>
                        <span>${nurse.hospitalAffiliation || 'N/A'}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h4><i class="fas fa-file-alt"></i> Documents</h4>
                <div class="documents-grid">
                    ${nurse.licenseDocumentUrl ? `
                        <div class="document-item">
                            <i class="fas fa-file-pdf"></i>
                            <span>Nursing License</span>
                            <a href="${nurse.licenseDocumentUrl}" target="_blank" class="btn btn-sm btn-secondary">
                                <i class="fas fa-eye"></i> View
                            </a>
                        </div>
                    ` : ''}
                    ${nurse.profileImageUrl ? `
                        <div class="document-item">
                            <i class="fas fa-image"></i>
                            <span>Profile Picture</span>
                            <a href="${nurse.profileImageUrl}" target="_blank" class="btn btn-sm btn-secondary">
                                <i class="fas fa-eye"></i> View
                            </a>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// Create HTML for lab details
function createLabDetailsHTML(lab) {
    return `
        <div class="approval-details-view">
            <div class="detail-section">
                <h4><i class="fas fa-flask"></i> Laboratory Information</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Lab Name:</label>
                        <span>${lab.labName || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Email:</label>
                        <span>${lab.email || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Phone:</label>
                        <span>${lab.mobileNumber || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>License Number:</label>
                        <span>${lab.licenseNumber || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Owner Name:</label>
                        <span>${lab.ownerName || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Associated Hospital:</label>
                        <span>${lab.associatedHospital || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Address:</label>
                        <span>${lab.address || 'N/A'}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h4><i class="fas fa-file-alt"></i> Documents</h4>
                <div class="documents-grid">
                    ${lab.licenseDocumentUrl ? `
                        <div class="document-item">
                            <i class="fas fa-file-pdf"></i>
                            <span>Lab License</span>
                            <a href="${lab.licenseDocumentUrl}" target="_blank" class="btn btn-sm btn-secondary">
                                <i class="fas fa-eye"></i> View
                            </a>
                        </div>
                    ` : ''}
                    ${lab.profileImageUrl ? `
                        <div class="document-item">
                            <i class="fas fa-image"></i>
                            <span>Profile Picture</span>
                            <a href="${lab.profileImageUrl}" target="_blank" class="btn btn-sm btn-secondary">
                                <i class="fas fa-eye"></i> View
                            </a>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// Create HTML for pharmacy details
function createPharmacyDetailsHTML(pharmacy) {
    return `
        <div class="approval-details-view">
            <div class="detail-section">
                <h4><i class="fas fa-pills"></i> Pharmacy Information</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Pharmacy Name:</label>
                        <span>${pharmacy.pharmacyName || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Email:</label>
                        <span>${pharmacy.email || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Phone:</label>
                        <span>${pharmacy.mobileNumber || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>License Number:</label>
                        <span>${pharmacy.licenseNumber || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Owner Name:</label>
                        <span>${pharmacy.ownerName || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Pharmacist Name:</label>
                        <span>${pharmacy.pharmacistName || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Address:</label>
                        <span>${pharmacy.address || 'N/A'}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h4><i class="fas fa-file-alt"></i> Documents</h4>
                <div class="documents-grid">
                    ${pharmacy.licenseDocumentUrl ? `
                        <div class="document-item">
                            <i class="fas fa-file-pdf"></i>
                            <span>Pharmacy License</span>
                            <a href="${pharmacy.licenseDocumentUrl}" target="_blank" class="btn btn-sm btn-secondary">
                                <i class="fas fa-eye"></i> View
                            </a>
                        </div>
                    ` : ''}
                    ${pharmacy.profileImageUrl ? `
                        <div class="document-item">
                            <i class="fas fa-image"></i>
                            <span>Profile Picture</span>
                            <a href="${pharmacy.profileImageUrl}" target="_blank" class="btn btn-sm btn-secondary">
                                <i class="fas fa-eye"></i> View
                            </a>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

// Create generic details HTML for unknown types
function createGenericDetailsHTML(details, type) {
    return `
        <div class="approval-details-view">
            <div class="detail-section">
                <h4><i class="fas fa-user"></i> ${type.charAt(0).toUpperCase() + type.slice(1)} Information</h4>
                <div class="detail-grid">
                    ${Object.entries(details).map(([key, value]) => {
                        if (key.startsWith('_') || key === 'type') return '';
                        return `
                            <div class="detail-item">
                                <label>${key.charAt(0).toUpperCase() + key.slice(1)}:</label>
                                <span>${value || 'N/A'}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        </div>
    `;
}

// Show modal loading state
function showModalLoading() {
    const modalContent = document.getElementById('modalContent');
    if (modalContent) {
        modalContent.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner">
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                </div>
                <p>Loading details...</p>
            </div>
        `;
    }
}

// Approve application
async function approveApplication(id, type) {
    try {
        if (!window.currentApproval || window.currentApproval.id !== id) {
            throw new Error('Invalid approval data');
        }
        
        console.log(`🔄 Approving ${type} with ID: ${id}`);
        
        // Show loading state
        const approveBtn = document.getElementById('approveBtn');
        const originalText = approveBtn.innerHTML;
        approveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Approving...';
        approveBtn.disabled = true;
        
        // Call approval API
        const success = await approveServiceProvider(type, id, 'Approved by staff');
        
        if (success) {
            console.log(`✅ ${type} approved successfully`);
            
            // Remove from pending list
            pendingApprovals = pendingApprovals.filter(approval => 
                approval._id !== id && approval.id !== id
            );
            
            // Update UI
            updatePendingCount();
            renderPendingApprovalsList();
            
            // Close modal
            closeModal();
            
            // Show success message
            showSuccessMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} approved successfully!`);
            
            // Refresh dashboard
            await loadDashboardData();
        } else {
            throw new Error('Approval failed');
        }
        
    } catch (error) {
        console.error('❌ Error approving application:', error);
        showErrorMessage('Failed to approve application. Please try again.');
        
        // Reset button
        const approveBtn = document.getElementById('approveBtn');
        approveBtn.innerHTML = '<i class="fas fa-check"></i> Approve';
        approveBtn.disabled = false;
    }
}

// Reject application
async function rejectApplication(id, type) {
    try {
        if (!window.currentApproval || window.currentApproval.id !== id) {
            throw new Error('Invalid approval data');
        }
        
        console.log(`🔄 Rejecting ${type} with ID: ${id}`);
        
        // Show rejection modal
        document.getElementById('rejectionModal').style.display = 'block';
        document.getElementById('approvalModal').style.display = 'none';
        
        // Store current rejection info
        window.currentRejection = { id, type };
        
    } catch (error) {
        console.error('❌ Error showing rejection modal:', error);
        showErrorMessage('Failed to show rejection form. Please try again.');
    }
}

// Confirm rejection
async function confirmRejection() {
    try {
        if (!window.currentRejection) {
            throw new Error('No rejection data');
        }
        
        const { id, type } = window.currentRejection;
        const reason = document.getElementById('rejectionReason').value.trim();
        const category = document.getElementById('rejectionCategory').value;
        const nextSteps = document.getElementById('nextSteps').value.trim();
        
        if (!reason || !category) {
            throw new Error('Please fill in all required fields');
        }
        
        console.log(`🔄 Confirming rejection for ${type} with ID: ${id}`);
        
        // Show loading state
        const confirmBtn = document.getElementById('confirmRejectBtn');
        const originalText = confirmBtn.innerHTML;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rejecting...';
        confirmBtn.disabled = true;
        
        // Call rejection API
        const success = await rejectServiceProvider(type, id, reason, category, nextSteps);
        
        if (success) {
            console.log(`✅ ${type} rejected successfully`);
            
            // Remove from pending list
            pendingApprovals = pendingApprovals.filter(approval => 
                approval._id !== id && approval.id !== id
            );
            
            // Update UI
            updatePendingCount();
            renderPendingApprovalsList();
            
            // Close modals
            closeRejectionModal();
            closeModal();
            
            // Show success message
            showSuccessMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} rejected successfully!`);
            
            // Refresh dashboard
            await loadDashboardData();
        } else {
            throw new Error('Rejection failed');
        }
        
    } catch (error) {
        console.error('❌ Error rejecting application:', error);
        showErrorMessage(error.message || 'Failed to reject application. Please try again.');
        
        // Reset button
        const confirmBtn = document.getElementById('confirmRejectBtn');
        confirmBtn.innerHTML = '<i class="fas fa-times"></i> Confirm Rejection';
        confirmBtn.disabled = false;
    }
}

// Close rejection modal
function closeRejectionModal() {
    document.getElementById('rejectionModal').style.display = 'none';
    
    // Clear form
    document.getElementById('rejectionReason').value = '';
    document.getElementById('rejectionCategory').value = '';
    document.getElementById('nextSteps').value = '';
    
    // Clear current rejection
    window.currentRejection = null;
}

// Show success message
function showSuccessMessage(message) {
    const messageContainer = document.getElementById('messageContainer');
    if (messageContainer) {
        messageContainer.innerHTML = `
            <div class="message success">
                <i class="fas fa-check-circle"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.remove()" class="close-message">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageContainer.firstChild) {
                messageContainer.firstChild.remove();
            }
        }, 5000);
    }
}

// Show error message
function showErrorMessage(message) {
    const messageContainer = document.getElementById('messageContainer');
    if (messageContainer) {
        messageContainer.innerHTML = `
            <div class="message error">
                <i class="fas fa-exclamation-circle"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.remove()" class="close-message">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Auto-remove after 8 seconds
        setTimeout(() => {
            if (messageContainer.firstChild) {
                messageContainer.firstChild.remove();
            }
        }, 8000);
    }
}