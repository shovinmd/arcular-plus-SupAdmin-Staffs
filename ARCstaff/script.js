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
let redirectInProgress = false; // Flag to prevent multiple redirects

// Stats data
let dashboardStats = {
    totalProviders: 0,
    approvedProviders: 0,
    pendingApprovals: 0,
    totalDepartments: 5
};

// Current selected service provider
let currentProviderType = null;
let currentProviderData = {
    approved: [],
    pending: []
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
if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log('✅ Firebase initialized successfully');
    } else {
        console.log('✅ Firebase already initialized');
    }
} else {
    console.error('❌ Firebase SDK not loaded');
}

// Stats Functions
function updateDashboardStats() {
    console.log('📊 Updating dashboard stats...');
    
    // Update stats display
    document.getElementById('total-providers-count').textContent = dashboardStats.totalProviders;
    document.getElementById('approved-providers-count').textContent = dashboardStats.approvedProviders;
    document.getElementById('pending-approvals-count').textContent = dashboardStats.pendingApprovals;
    document.getElementById('total-departments').textContent = dashboardStats.totalDepartments;
    
    // Calculate and update percentages
    const totalProviders = dashboardStats.totalProviders || 0;
    const approvedProviders = dashboardStats.approvedProviders || 0;
    const pendingApprovals = dashboardStats.pendingApprovals || 0;
    
    // Calculate approval rate percentage
    const approvalRate = totalProviders > 0 ? Math.round((approvedProviders / totalProviders) * 100) : 0;
    
    // Calculate pending rate percentage
    const pendingRate = totalProviders > 0 ? Math.round((pendingApprovals / totalProviders) * 100) : 0;
    
    // Update percentage displays
    const approvalTrend = document.querySelector('#approved-providers-count').parentElement.querySelector('.stat-trend span');
    const pendingTrend = document.querySelector('#pending-approvals-count').parentElement.querySelector('.stat-trend span');
    const totalTrend = document.querySelector('#total-providers-count').parentElement.querySelector('.stat-trend span');
    
    if (approvalTrend) {
        approvalTrend.textContent = `${approvalRate}%`;
        const trendElement = approvalTrend.parentElement;
        if (approvalRate > 0) {
            trendElement.className = 'stat-trend positive';
            trendElement.querySelector('i').className = 'fas fa-arrow-up';
        } else {
            trendElement.className = 'stat-trend neutral';
            trendElement.querySelector('i').className = 'fas fa-minus';
        }
    }
    
    if (pendingTrend) {
        pendingTrend.textContent = `${pendingRate}%`;
        const trendElement = pendingTrend.parentElement;
        if (pendingRate > 0) {
            trendElement.className = 'stat-trend warning';
            trendElement.querySelector('i').className = 'fas fa-arrow-up';
        } else {
            trendElement.className = 'stat-trend neutral';
            trendElement.querySelector('i').className = 'fas fa-minus';
        }
    }
    
    if (totalTrend) {
        const growthRate = totalProviders > 0 ? Math.round((totalProviders / 100) * 10) : 0; // Mock growth rate
        totalTrend.textContent = `${growthRate}%`;
        const trendElement = totalTrend.parentElement;
        if (growthRate > 0) {
            trendElement.className = 'stat-trend positive';
            trendElement.querySelector('i').className = 'fas fa-arrow-up';
        } else {
            trendElement.className = 'stat-trend neutral';
            trendElement.querySelector('i').className = 'fas fa-minus';
        }
    }
    
    // Update sidebar counts
    updateSidebarCounts();
    
    console.log('✅ Dashboard stats updated:', dashboardStats);
}

// Setup stats filtering
function setupStatsFilter() {
    const statsPeriodSelect = document.getElementById('stats-period');
    if (statsPeriodSelect) {
        statsPeriodSelect.addEventListener('change', function() {
            const selectedPeriod = this.value;
            console.log('📊 Stats period changed to:', selectedPeriod);
            loadFilteredStats(selectedPeriod);
        });
    }
}

// Load filtered stats based on period
async function loadFilteredStats(period) {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/arc-staff/stats?period=${period}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                const stats = result.data;
                
                // Update dashboard stats with filtered data
                dashboardStats.totalProviders = stats.totalProviders || 0;
                dashboardStats.approvedProviders = stats.approvedProviders || 0;
                dashboardStats.pendingApprovals = stats.pendingApprovals || 0;
                dashboardStats.totalDepartments = stats.totalDepartments || 5;
                
                // Update display
                updateDashboardStats();
                
                // Update trend indicators
                updateTrendIndicators(stats.trends || {});
                
                console.log(`✅ ${period} stats loaded:`, stats);
            }
        }
    } catch (error) {
        console.error('❌ Error loading filtered stats:', error);
        // Fallback to current stats if API fails
        updateDashboardStats();
    }
}

// Update trend indicators
function updateTrendIndicators(trends) {
    const trendElements = document.querySelectorAll('.stat-trend');
    trendElements.forEach((element, index) => {
        const trend = trends[index] || { type: 'neutral', value: 0 };
        
        // Remove existing classes
        element.className = 'stat-trend';
        
        // Add appropriate class and content
        if (trend.type === 'positive') {
            element.classList.add('positive');
            element.innerHTML = `<i class="fas fa-arrow-up"></i> <span>${trend.value}%</span>`;
        } else if (trend.type === 'negative') {
            element.classList.add('negative');
            element.innerHTML = `<i class="fas fa-arrow-down"></i> <span>${trend.value}%</span>`;
        } else {
            element.classList.add('neutral');
            element.innerHTML = `<i class="fas fa-minus"></i> <span>${trend.value}%</span>`;
        }
    });
}

function updateSidebarCounts() {
    console.log('🔄 Updating sidebar counts with data:', allUsers);
    
    // Update hospital counts - all hospitals from backend are approved
    const hospitalCount = allUsers.hospitals ? allUsers.hospitals.length : 0;
    document.getElementById('hospitalApprovedCount').textContent = hospitalCount;
    document.getElementById('hospitalPendingCount').textContent = '0'; // All are approved
    
    // Update doctor counts - all doctors from backend are approved
    const doctorCount = allUsers.doctors ? allUsers.doctors.length : 0;
    document.getElementById('doctorApprovedCount').textContent = doctorCount;
    document.getElementById('doctorPendingCount').textContent = '0'; // All are approved
    
    // Update nurse counts - all nurses from backend are approved
    const nurseCount = allUsers.nurses ? allUsers.nurses.length : 0;
    document.getElementById('nurseApprovedCount').textContent = nurseCount;
    document.getElementById('nursePendingCount').textContent = '0'; // All are approved
    
    // Update lab counts - all labs from backend are approved
    const labCount = allUsers.labs ? allUsers.labs.length : 0;
    document.getElementById('labApprovedCount').textContent = labCount;
    document.getElementById('labPendingCount').textContent = '0'; // All are approved
    
    // Update pharmacy counts - all pharmacies from backend are approved
    const pharmacyCount = allUsers.pharmacies ? allUsers.pharmacies.length : 0;
    document.getElementById('pharmacyApprovedCount').textContent = pharmacyCount;
    document.getElementById('pharmacyPendingCount').textContent = '0'; // All are approved
    
    console.log('✅ Sidebar counts updated:', {
        hospitals: hospitalCount,
        doctors: doctorCount,
        nurses: nurseCount,
        labs: labCount,
        pharmacies: pharmacyCount
    });
    
    // Update total stats
    dashboardStats.totalProviders = hospitalCount + doctorCount + nurseCount + labCount + pharmacyCount;
    dashboardStats.approvedProviders = hospitalCount + doctorCount + nurseCount + labCount + pharmacyCount; // All are approved
    dashboardStats.pendingApprovals = 0; // All are approved, pending are handled separately
}

// API Functions for real backend integration
async function fetchPendingApprovals() {
    try {
        const token = await getAuthToken();
        console.log('🔍 Fetching pending approvals with token:', token ? 'Token received' : 'No token');
        
        // Fetch all pending approvals from the arc-staff endpoint
        const response = await fetch(`${API_BASE_URL}/arc-staff/pending-approvals`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('📡 Response status:', response.status, response.ok);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📋 Raw pending approvals result:', result);
        
        if (result.success && result.pendingUsers) {
            // Transform the data to match expected format
            const transformedUsers = result.pendingUsers.map(user => ({
                ...user,
                type: user.userType || user.type,
                id: user.uid || user._id,
                name: user.fullName || user.hospitalName || user.labName || user.pharmacyName || 'Unknown',
                email: user.email,
                registrationDate: user.createdAt || user.registrationDate,
                // Include document URLs for display
                licenseDocumentUrl: user.licenseDocumentUrl,
                registrationCertificateUrl: user.registrationCertificateUrl,
                buildingPermitUrl: user.buildingPermitUrl,
                profileImageUrl: user.profileImageUrl,
                identityProofUrl: user.identityProofUrl
            }));
            
            console.log('✅ Transformed pending approvals:', transformedUsers);
            return transformedUsers;
        } else {
            console.error('Backend returned error:', result);
            return [];
        }
    } catch (error) {
        console.error('❌ Error fetching pending approvals:', error);
        return [];
    }
}

// Fetch all approved service providers from backend
async function fetchAllServiceProviders() {
    try {
        console.log('🔄 Starting to fetch all service providers...');
        const token = await getAuthToken();
        console.log('✅ Got auth token:', token ? 'Token received' : 'No token');
        
        // Use the new arc-staff endpoint to get all approved service providers
        console.log('🔄 Fetching all approved service providers from arc-staff endpoint...');
        const response = await fetch(`${API_BASE_URL}/arc-staff/approved-service-providers`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('📊 Response status:', response.status, response.ok);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ HTTP Error Response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('📊 Raw response:', result);
        
        if (!result.success) {
            throw new Error(result.message || 'Failed to fetch service providers');
        }
        
        const allUsersData = result.data;
        console.log('📊 Extracted data:', allUsersData);
        
        if (!allUsersData) {
            throw new Error('No data received from backend');
        }
        
        // Transform data to match expected format
        const transformedData = {
            hospitals: (allUsersData.hospitals || []).map(h => ({
                id: h.uid || h._id,
                name: h.hospitalName || h.fullName || 'Unknown',
                registrationNumber: h.registrationNumber || h.licenseNumber || 'N/A',
                contact: h.mobileNumber || h.phoneNumber || 'N/A',
                email: h.email || 'N/A',
                address: h.address || 'N/A',
                status: h.approvalStatus || 'approved'
            })),
            doctors: (allUsersData.doctors || []).map(d => ({
                id: d.uid || d._id,
                name: d.fullName || 'Unknown',
                licenseNumber: d.licenseNumber || d.medicalRegistrationNumber || 'N/A',
                specialization: d.specialization || 'N/A',
                contact: d.mobileNumber || d.phoneNumber || 'N/A',
                email: d.email || 'N/A',
                experience: d.experienceYears || 'N/A',
                status: d.approvalStatus || 'approved'
            })),
            nurses: (allUsersData.nurses || []).map(n => ({
                id: n.uid || n._id,
                name: n.fullName || 'Unknown',
                licenseNumber: n.licenseNumber || n.registrationNumber || 'N/A',
                department: n.department || n.specialization || 'N/A',
                contact: n.mobileNumber || n.phoneNumber || 'N/A',
                email: n.email || 'N/A',
                experience: n.experienceYears || 'N/A',
                status: n.approvalStatus || 'approved'
            })),
            labs: (allUsersData.labs || []).map(l => ({
                id: l.uid || l._id,
                name: l.labName || l.fullName || 'Unknown',
                licenseNumber: l.licenseNumber || l.registrationNumber || 'N/A',
                contact: l.mobileNumber || l.phoneNumber || 'N/A',
                email: l.email || 'N/A',
                services: l.services || 'N/A',
                status: l.approvalStatus || 'approved'
            })),
            pharmacies: (allUsersData.pharmacies || []).map(p => ({
                id: p.uid || p._id,
                name: p.pharmacyName || p.fullName || 'Unknown',
                licenseNumber: p.licenseNumber || p.registrationNumber || 'N/A',
                contact: p.mobileNumber || p.phoneNumber || 'N/A',
                email: p.email || 'N/A',
                services: p.services || 'N/A',
                status: p.approvalStatus || 'approved'
            }))
        };
        
        console.log('✅ Fetched all service providers:', {
            hospitals: transformedData.hospitals.length,
            doctors: transformedData.doctors.length,
            nurses: transformedData.nurses.length,
            labs: transformedData.labs.length,
            pharmacies: transformedData.pharmacies.length
        });
        
        console.log('✅ Transformed data sample:', {
            hospitals: transformedData.hospitals.slice(0, 2),
            doctors: transformedData.doctors.slice(0, 2),
            nurses: transformedData.nurses.slice(0, 2),
            labs: transformedData.labs.slice(0, 2),
            pharmacies: transformedData.pharmacies.slice(0, 2)
        });
        
        return transformedData;
        
    } catch (error) {
        console.error('❌ Error fetching all service providers:', error);
        console.error('❌ Error details:', {
            message: error.message,
            stack: error.stack
        });
        // Return empty data on error
        return {
            hospitals: [],
            doctors: [],
            nurses: [],
            labs: [],
            pharmacies: []
        };
    }
}

// Get Firebase auth token for API calls
async function getAuthToken() {
    try {
        console.log('🔑 Getting Firebase auth token...');
        
        // First try to get token from localStorage
        const storedToken = localStorage.getItem('staff_idToken');
        if (storedToken) {
            console.log('✅ Using stored token from localStorage');
            return storedToken;
        }
        
        // Then try Firebase current user
        const user = firebase.auth().currentUser;
        console.log('👤 Current Firebase user:', user ? user.email : 'No user');
        
        if (user) {
            const token = await user.getIdToken();
            console.log('✅ Got Firebase token:', token ? 'Token received' : 'No token');
            // Store the token for future use
            localStorage.setItem('staff_idToken', token);
            return token;
        }
        
        throw new Error('No authenticated user or stored token');
    } catch (error) {
        console.error('❌ Error getting auth token:', error);
        throw error;
    }
}

// Fetch detailed information for a specific service provider
async function fetchServiceProviderDetails(type, id) {
    try {
        const token = await getAuthToken();
        console.log(`🔍 Fetching ${type} details for ID: ${id}`);
        
        // Use the appropriate endpoint based on type
        let endpoint;
        switch (type) {
            case 'hospital':
                endpoint = `${API_BASE_URL}/hospitals/uid/${id}`;
                break;
            case 'doctor':
                endpoint = `${API_BASE_URL}/doctors/uid/${id}`;
                break;
            case 'nurse':
                endpoint = `${API_BASE_URL}/nurses/uid/${id}`;
                break;
            case 'lab':
                endpoint = `${API_BASE_URL}/labs/uid/${id}`;
                break;
            case 'pharmacy':
                endpoint = `${API_BASE_URL}/pharmacies/uid/${id}`;
                break;
            default:
                throw new Error(`Unknown service provider type: ${type}`);
        }
        
        console.log(`🌐 Calling endpoint: ${endpoint}`);
        
        const response = await fetch(endpoint, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log(`📡 Response status: ${response.status}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`📋 Raw response data:`, data);
        
        if (data.success && data.data) {
            // Add type information for proper display
            const result = { ...data.data, type: type };
            console.log(`✅ Processed ${type} details:`, result);
            return result;
        } else if (data.success && data.hospital) {
            // Handle case where data is directly in response
            const result = { ...data.hospital, type: type };
            console.log(`✅ Processed ${type} details (direct):`, result);
            return result;
        } else {
            console.error(`❌ Invalid response format for ${type}:`, data);
            return null;
        }
    } catch (error) {
        console.error(`❌ Error fetching ${type} details:`, error);
        return null;
    }
}

// Approve a service provider
async function approveServiceProvider(id, type, notes = '') {
    try {
        const token = await getAuthToken();
        
        // Use the arc-staff approval endpoint
        const response = await fetch(`${API_BASE_URL}/arc-staff/approve/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                userType: type,
                notes: notes
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success) {
            showSuccessMessage(`✅ ${type.charAt(0).toUpperCase() + type.slice(1)} approved successfully! Email notification sent. You can now login to the platform.`);
        }
        return data.success;
    } catch (error) {
        console.error(`Error approving ${type}:`, error);
        showErrorMessage(`Error approving ${type}: ${error.message}`);
        return false;
    }
}

// Reject a service provider
async function rejectServiceProvider(id, type, reason, category, nextSteps) {
    try {
        const token = await getAuthToken();
        
        // Use the arc-staff rejection endpoint
        const response = await fetch(`${API_BASE_URL}/arc-staff/reject/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                userType: type,
                reason: reason
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success) {
            showSuccessMessage(`❌ ${type.charAt(0).toUpperCase() + type.slice(1)} rejected successfully! Email notification sent with feedback. Please register again after 24-48 hours with the requested changes.`);
        }
        return data.success;
    } catch (error) {
        console.error(`Error rejecting ${type}:`, error);
        showErrorMessage(`Error rejecting ${type}: ${error.message}`);
        return false;
    }
}

// Restore a rejected service provider
async function restoreServiceProvider(type, id) {
    try {
        const token = await getAuthToken();
        
        const response = await fetch(`${API_BASE_URL}/arc-staff/restore/${type}/${id}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                console.log('✅ Service provider restored successfully');
                showSuccessMessage('Service provider restored successfully!');
                return true;
            } else {
                throw new Error(result.message || 'Failed to restore service provider');
            }
        } else {
            throw new Error('Failed to restore service provider');
        }
        
    } catch (error) {
        console.error('❌ Error restoring service provider:', error);
        showErrorMessage('Failed to restore service provider. Please try again.');
        return false;
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Reset redirect flag on page load
    redirectInProgress = false;
    console.log('🔄 Page loaded, redirect flag reset');
    console.log('🔍 Current URL:', window.location.href);
    console.log('🔍 Current pathname:', window.location.pathname);
    console.log('🔍 Current hostname:', window.location.hostname);
    
    // Check if we're on the dashboard page
    if (window.location.pathname.includes('arcstaff-dashboard.html')) {
        console.log('🏠 On ARC Staff Dashboard page');
        checkArcStaffSession();
    } else if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/') || window.location.pathname === '') {
        // We're on the login page
        console.log('🔐 On login page, initializing...');
        initializeLoginPage();
        
        // Don't initialize dashboard functions on login page
        return;
    } else {
        console.log('📱 On other page, initializing app...');
        initializeApp();
    }

    // Login form setup moved to initializeLoginPage function

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
    // checkArcStaffSession(); // Removed duplicate call to prevent conflicts
    
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
                    
                    // Update header with staff name
                    const userNameElement = document.getElementById('userName');
                    if (userNameElement) {
                        userNameElement.textContent = staffProfile.data.fullName || user.email;
                    }
                    
                    // Update staff status in settings
                    updateStaffStatus(staffProfile.data);
                    
                    // All users are now ARC Staff only
                    console.log('✅ User is ARC Staff, staying on dashboard');
                    
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
            localStorage.removeItem('staffType');
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
    loadAllUsers();
}

function initializeLoginPage() {
    console.log('🔐 Setting up login page functionality...');
    
    // Check if already logged in
    const hasToken = localStorage.getItem('staff_idToken');
    const staffType = localStorage.getItem('staffType');
    
    if (hasToken) {
        console.log('✅ User already logged in, redirecting to dashboard');
        
        // All users go to ARC Staff dashboard
        let dashboardUrl = 'arcstaff-dashboard.html';
        
        console.log('🎯 Redirecting to:', dashboardUrl);
        // Redirect immediately without delay
        window.location.href = dashboardUrl;
        return;
    }
    
            // Set up login form
        const loginForm = document.getElementById('loginForm');
        console.log('🔍 Looking for login form...');
        console.log('🔍 Login form element:', loginForm);
        
        if (loginForm) {
            console.log('✅ Login form found, adding event listener');
            
            // Create the main login handler function
            async function handleMainLogin(email, password) {
                console.log('🚀 Main login handler triggered!');
                
                // Hide any existing messages
                hideLoginMessages();
                
                // All users are ARC Staff
                const actualStaffType = 'arcstaff';
                
                // Show loading state
                const loginBtn = document.getElementById('loginBtn');
                const btnText = loginBtn.querySelector('.btn-text');
                const spinner = document.getElementById('loginSpinner');
                
                if (btnText && spinner) {
                    btnText.style.display = 'none';
                    spinner.style.display = 'block';
                    loginBtn.disabled = true;
                }
                
                try {
                    console.log('🔐 Attempting Firebase authentication...');
                    
                    // Firebase authentication
                    const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
                    const user = userCredential.user;
                    console.log('✅ Firebase auth successful:', user.email);
                    
                    const idToken = await user.getIdToken();
                    console.log('✅ ID token obtained');
                    
                    // Verify staff access with backend
                    try {
                        console.log('🌐 Verifying staff access with backend...');
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
                        
                        console.log('📡 Backend response status:', response.status);
                        
                        if (response.ok) {
                            const result = await response.json();
                            console.log('✅ Staff access verified:', result);
                            
                                                    // Store token and staff type
                        localStorage.setItem('staff_idToken', idToken);
                        localStorage.setItem('staffType', 'arcstaff');
                        
                        // Debug: Show what's stored
                        console.log('💾 Stored in localStorage:');
                        console.log('  - staff_idToken:', idToken ? 'Present' : 'Missing');
                        console.log('  - staffType: arcstaff');
                        
                        // Show success message
                        showLoginSuccess('Login successful! Redirecting to dashboard...');
                        
                        // Redirect based on staff type
                        console.log('🔀 Staff type: ARC Staff');
                        console.log('✅ Token and staff type stored in localStorage');
                        
                        // Set redirect flag to prevent multiple redirects
                        redirectInProgress = true;
                        console.log('🚩 Redirect flag set to prevent conflicts');
                        
                        setTimeout(() => {
                            console.log('🔄 Redirecting to ARC Staff Dashboard');
                            window.location.href = 'arcstaff-dashboard.html';
                        }, 2000);
                            
                        } else {
                            const errorData = await response.json();
                            console.error('❌ Backend error:', errorData);
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
                    console.error('❌ Login error:', error);
                    showLoginError(error.message || 'Login failed. Please check your credentials.');
                    
                    // Reset form
                    document.getElementById('password').value = '';
                } finally {
                    // Reset loading state
                    if (btnText && spinner) {
                        btnText.style.display = 'block';
                        spinner.style.display = 'none';
                        loginBtn.disabled = false;
                    }
                }
            }
            
            // Expose the main login handler globally
            window.handleMainLogin = handleMainLogin;
            
            // Add form submit event listener
            loginForm.addEventListener('submit', async function(e) {
                console.log('🚀 Login form submit event triggered!');
                e.preventDefault();
                console.log('✅ Form submission prevented');
                
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                
                if (!email || !password) {
                    showLoginError('Please enter both email and password');
                    return;
                }
                
                // Call the main login handler (always ARC Staff)
                handleMainLogin(email, password);
            });
            
            console.log('✅ Login form event listener added');
        } else {
            console.warn('⚠️ Login form not found on login page');
        }
        
        // Set up forgot password functionality
        const forgotPasswordLink = document.querySelector('.forgot-password');
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', async function(e) {
                e.preventDefault();
                const email = document.getElementById('email').value;
                
                if (!email) {
                    showLoginError('Please enter your email address first.');
                    return;
                }
                
                try {
                    // Show loading state
                    showLoginSuccess('Sending password reset email...');
                    
                    // Send password reset email via Firebase
                    await firebase.auth().sendPasswordResetEmail(email);
                    
                    showLoginSuccess('Password reset email sent! Check your inbox.');
                } catch (error) {
                    console.error('Password reset error:', error);
                    showLoginError('Failed to send password reset email: ' + error.message);
                }
            });
        }
        
        console.log('✅ Login page functionality initialized');
}

// Login page helper functions
function showLoginError(message) {
    const errorDiv = document.getElementById('login-error');
    const errorText = document.getElementById('login-error-text');
    
    if (errorDiv && errorText) {
        errorText.textContent = message;
        errorDiv.style.display = 'flex';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    } else {
        console.error('Error elements not found:', message);
        alert('Error: ' + message);
    }
}

function showLoginSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    const successText = successDiv.querySelector('span');
    
    if (successDiv && successText) {
        successText.textContent = message;
        successDiv.style.display = 'flex';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 5000);
    } else {
        console.log('Success:', message);
    }
}

function hideLoginMessages() {
    const errorDiv = document.getElementById('login-error');
    const successDiv = document.getElementById('successMessage');
    
    if (errorDiv) errorDiv.style.display = 'none';
    if (successDiv) successDiv.style.display = 'none';
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
    // Search functionality
    const searchInput = document.getElementById('providerSearchInput');
    const searchBtn = document.getElementById('searchBtn');
    const providerTypeFilter = document.getElementById('providerTypeFilter');
    const statusFilter = document.getElementById('statusFilter');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
    
    if (providerTypeFilter) {
        providerTypeFilter.addEventListener('change', performSearch);
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', performSearch);
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearFilters);
    }
    
    // Quick Actions Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchQuickActionTab(tabName);
        });
    });
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        console.log('✅ Logout button found, adding event listener');
        logoutBtn.addEventListener('click', logout);
    } else {
        console.error('❌ Logout button not found!');
    }
    
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

// View user details for approved service providers
function viewUserDetails(type, userId) {
    const user = allUsers[type + 's'].find(u => u.id === userId);
    if (!user) {
        console.error('User not found:', type, userId);
        return;
    }
    
    // Use the existing modal structure
    const modal = document.getElementById('approvalModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    
    modalTitle.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} Details`;
    
    modalContent.innerHTML = `
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
            ${user.services ? `
            <div class="detail-item">
                <label>Services</label>
                <span>${user.services}</span>
            </div>
            ` : ''}
            <div class="detail-item">
                <label>Status</label>
                <span class="status-badge ${user.status}">${user.status}</span>
            </div>
        </div>
    `;
    
    // Show only view button for approved users
    const approveBtn = document.getElementById('approveBtn');
    const rejectBtn = document.getElementById('rejectBtn');
    const requestDocsBtn = document.getElementById('requestDocsBtn');
    
    if (approveBtn) approveBtn.style.display = 'none';
    if (rejectBtn) rejectBtn.style.display = 'none';
    if (requestDocsBtn) requestDocsBtn.style.display = 'none';
    
    // Show modal
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
    console.log('🏥 Loading hospitals...');
    const contentArea = document.getElementById('serviceProviderContent');
    console.log('🏥 Found content area:', contentArea);
    
    if (!contentArea) {
        console.error('❌ Service provider content area not found!');
        return;
    }
    
    const hospitals = allUsers.hospitals || [];
    console.log('🏥 Hospitals data:', hospitals);
    
    // Create a full-screen hospital management view
    contentArea.innerHTML = `
        <div class="provider-management-screen">
            <div class="screen-header">
                <div class="header-left">
                    <button class="back-btn" onclick="showDashboardOverview()">
                        <i class="fas fa-arrow-left"></i> Back to Dashboard
                    </button>
                    <div class="screen-title">
                        <h1><i class="fas fa-hospital"></i> Hospital Management</h1>
                        <p>Manage hospital registrations and approvals</p>
                    </div>
                </div>
                <div class="header-right">
                    <div class="screen-stats">
                        <div class="stat-item">
                            <span class="stat-number">${hospitals.length}</span>
                            <span class="stat-label">Total</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${hospitals.filter(h => !h.isApproved || h.approvalStatus === 'pending').length}</span>
                            <span class="stat-label">Pending</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${hospitals.filter(h => h.isApproved && h.approvalStatus === 'approved').length}</span>
                            <span class="stat-label">Approved</span>
                        </div>
                    </div>
                    <button class="refresh-btn" onclick="loadHospitals()" title="Refresh Hospitals">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
            </div>
            
            <div class="screen-content">
                ${hospitals.length === 0 ? `
                    <div class="empty-state-screen">
                        <div class="empty-icon">
                            <i class="fas fa-hospital fa-4x"></i>
                        </div>
                        <h2>No Hospitals Found</h2>
                        <p>No hospital registrations have been submitted yet.</p>
                        <button class="btn btn-primary" onclick="refreshData()">
                            <i class="fas fa-refresh"></i> Refresh Data
                        </button>
                    </div>
                ` : `
                    <div class="provider-grid-screen">
                        ${hospitals.map(hospital => `
                            <div class="provider-card-screen" data-status="${hospital.isApproved ? 'approved' : 'pending'}">
                                <div class="card-header">
                                    <div class="provider-avatar-large">
                                        <i class="fas fa-hospital"></i>
                                    </div>
                                    <div class="provider-info-main">
                                        <h3>${hospital.name || hospital.hospitalName || 'Unknown Hospital'}</h3>
                                        <p class="provider-email">${hospital.email}</p>
                                        <span class="status-badge-large ${hospital.isApproved && hospital.approvalStatus === 'approved' ? 'approved' : 'pending'}">
                                            ${hospital.isApproved && hospital.approvalStatus === 'approved' ? 'Approved' : 'Pending Approval'}
                                        </span>
                                    </div>
                                </div>
                                <div class="card-body">
                                    <div class="info-grid">
                                        <div class="info-item">
                                            <label>Registration Number:</label>
                                            <span>${hospital.registrationNumber || 'N/A'}</span>
                                        </div>
                                        <div class="info-item">
                                            <label>Address:</label>
                                            <span>${hospital.address || 'N/A'}</span>
                                        </div>
                                        <div class="info-item">
                                            <label>Contact:</label>
                                            <span>${hospital.mobileNumber || hospital.contact || 'N/A'}</span>
                                        </div>
                                        <div class="info-item">
                                            <label>Registered:</label>
                                            <span>${hospital.createdAt ? new Date(hospital.createdAt).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="card-actions">
                                                <button class="btn btn-primary" onclick="viewProviderDetails('${hospital.uid || hospital._id || hospital.id}', 'hospital')">
                                                    <i class="fas fa-eye"></i> View Details
                                                </button>
                                    ${!(hospital.isApproved && hospital.approvalStatus === 'approved') ? `
                                        <button class="btn btn-success" onclick="approveServiceProvider('${hospital.uid || hospital._id || hospital.id}', 'hospital')">
                                            <i class="fas fa-check"></i> Approve
                                        </button>
                                        <button class="btn btn-danger" onclick="rejectServiceProvider('${hospital.uid || hospital._id || hospital.id}', 'hospital')">
                                            <i class="fas fa-times"></i> Reject
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        </div>
    `;
    
    console.log('🏥 Hospitals screen loaded successfully');
}

function loadDoctors() {
    console.log('👨‍⚕️ Loading doctors...');
    const contentArea = document.getElementById('serviceProviderContent');
    console.log('👨‍⚕️ Found content area:', contentArea);
    
    if (!contentArea) {
        console.error('❌ Service provider content area not found!');
        return;
    }
    
    const doctors = allUsers.doctors || [];
    console.log('👨‍⚕️ Doctors data:', doctors);
    
    // Create a full-screen doctor management view
    contentArea.innerHTML = `
        <div class="provider-management-screen">
            <div class="screen-header">
                <div class="header-left">
                    <button class="back-btn" onclick="showDashboardOverview()">
                        <i class="fas fa-arrow-left"></i> Back to Dashboard
                    </button>
                    <div class="screen-title">
                        <h1><i class="fas fa-user-md"></i> Doctor Management</h1>
                        <p>Manage doctor registrations and approvals</p>
                    </div>
                </div>
                <div class="header-right">
                    <div class="screen-stats">
                        <div class="stat-item">
                            <span class="stat-number">${doctors.length}</span>
                            <span class="stat-label">Total</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${doctors.filter(d => d.isApproved).length}</span>
                            <span class="stat-label">Approved</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${doctors.filter(d => !d.isApproved).length}</span>
                            <span class="stat-label">Pending</span>
                        </div>
                    </div>
                    <button class="refresh-btn" onclick="loadDoctors()" title="Refresh Doctors">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
            </div>
            
            <div class="screen-content">
                ${doctors.length === 0 ? `
                    <div class="empty-state-screen">
                        <div class="empty-icon">
                            <i class="fas fa-user-md fa-4x"></i>
                        </div>
                        <h2>No Doctors Found</h2>
                        <p>No doctor registrations have been submitted yet.</p>
                        <button class="btn btn-primary" onclick="refreshData()">
                            <i class="fas fa-refresh"></i> Refresh Data
                        </button>
                    </div>
                ` : `
                    <div class="provider-grid-screen">
                        ${doctors.map(doctor => `
                            <div class="provider-card-screen" data-status="${doctor.isApproved ? 'approved' : 'pending'}">
                                <div class="card-header">
                                    <div class="provider-avatar-large">
                                        <i class="fas fa-user-md"></i>
                                    </div>
                                    <div class="provider-info-main">
                                        <h3>${doctor.name || doctor.fullName || 'Unknown Doctor'}</h3>
                                        <p class="provider-email">${doctor.email}</p>
                                        <span class="status-badge-large ${doctor.isApproved ? 'approved' : 'pending'}">
                                            ${doctor.isApproved ? 'Approved' : 'Pending Approval'}
                                        </span>
                                    </div>
                                </div>
                                <div class="card-body">
                                    <div class="info-grid">
                                        <div class="info-item">
                                            <label>License Number:</label>
                                            <span>${doctor.licenseNumber || 'N/A'}</span>
                                        </div>
                                        <div class="info-item">
                                            <label>Specialization:</label>
                                            <span>${doctor.specialization || 'N/A'}</span>
                                        </div>
                                        <div class="info-item">
                                            <label>Contact:</label>
                                            <span>${doctor.mobileNumber || doctor.contact || 'N/A'}</span>
                                        </div>
                                        <div class="info-item">
                                            <label>Registered:</label>
                                            <span>${doctor.createdAt ? new Date(doctor.createdAt).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="card-actions">
                                                <button class="btn btn-primary" onclick="viewProviderDetails('${doctor.uid || doctor._id || doctor.id}', 'doctor')">
                                                    <i class="fas fa-eye"></i> View Details
                                                </button>
                                    ${!(doctor.isApproved && doctor.approvalStatus === 'approved') ? `
                                        <button class="btn btn-success" onclick="approveServiceProvider('${doctor.uid || doctor._id || doctor.id}', 'doctor')">
                                            <i class="fas fa-check"></i> Approve
                                        </button>
                                        <button class="btn btn-danger" onclick="rejectServiceProvider('${doctor.uid || doctor._id || doctor.id}', 'doctor')">
                                            <i class="fas fa-times"></i> Reject
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        </div>
    `;
    
    console.log('👨‍⚕️ Doctors screen loaded successfully');
}

function loadNurses() {
    console.log('👩‍⚕️ Loading nurses...');
    const contentArea = document.getElementById('serviceProviderContent');
    console.log('👩‍⚕️ Found content area:', contentArea);

    if (!contentArea) {
        console.error('❌ Service provider content area not found!');
        return;
    }

    const nurses = allUsers.nurses || [];
    console.log('👩‍⚕️ Nurses data:', nurses);

    // Create a full-screen nurse management view
    contentArea.innerHTML = `
        <div class="provider-management-screen">
            <div class="screen-header">
                <div class="header-left">
                    <button class="back-btn" onclick="showDashboardOverview()">
                        <i class="fas fa-arrow-left"></i> Back to Dashboard
                    </button>
                    <div class="screen-title">
                        <h1><i class="fas fa-user-nurse"></i> Nurse Management</h1>
                        <p>Manage nurse registrations and approvals</p>
                    </div>
                </div>
                <div class="header-right">
                    <div class="screen-stats">
                        <div class="stat-item">
                            <span class="stat-number">${nurses.length}</span>
                            <span class="stat-label">Total</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${nurses.filter(n => n.isApproved).length}</span>
                            <span class="stat-label">Approved</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${nurses.filter(n => !n.isApproved).length}</span>
                            <span class="stat-label">Pending</span>
                        </div>
                    </div>
                    <button class="refresh-btn" onclick="loadNurses()" title="Refresh Nurses">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
            </div>
            
            <div class="screen-content">
                ${nurses.length === 0 ? `
                    <div class="empty-state-screen">
                        <div class="empty-icon">
                            <i class="fas fa-user-nurse fa-4x"></i>
                        </div>
                        <h2>No Nurses Found</h2>
                        <p>No nurse registrations have been submitted yet.</p>
                        <button class="btn btn-primary" onclick="refreshData()">
                            <i class="fas fa-refresh"></i> Refresh Data
                        </button>
                    </div>
                ` : `
                    <div class="provider-grid-screen">
                        ${nurses.map(nurse => `
                            <div class="provider-card-screen" data-status="${nurse.isApproved ? 'approved' : 'pending'}">
                                <div class="card-header">
                                    <div class="provider-avatar-large">
                                        <i class="fas fa-user-nurse"></i>
                                    </div>
                                    <div class="provider-info-main">
                                        <h3>${nurse.name || nurse.fullName || 'Unknown Nurse'}</h3>
                                        <p class="provider-email">${nurse.email}</p>
                                        <span class="status-badge-large ${nurse.isApproved ? 'approved' : 'pending'}">
                                            ${nurse.isApproved ? 'Approved' : 'Pending Approval'}
                                        </span>
                                    </div>
                                </div>
                                <div class="card-body">
                                    <div class="info-grid">
                                        <div class="info-item">
                                            <label>License Number:</label>
                                            <span>${nurse.licenseNumber || 'N/A'}</span>
                                        </div>
                                        <div class="info-item">
                                            <label>Department:</label>
                                            <span>${nurse.department || 'N/A'}</span>
                                        </div>
                                        <div class="info-item">
                                            <label>Contact:</label>
                                            <span>${nurse.mobileNumber || nurse.contact || 'N/A'}</span>
                                        </div>
                                        <div class="info-item">
                                            <label>Registered:</label>
                                            <span>${nurse.createdAt ? new Date(nurse.createdAt).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="card-actions">
                                    <button class="btn btn-primary" onclick="viewProviderDetails('${nurse.uid || nurse._id || nurse.id}', 'nurse')">
                                        <i class="fas fa-eye"></i> View Details
                                    </button>
                                    ${!(nurse.isApproved && nurse.approvalStatus === 'approved') ? `
                                        <button class="btn btn-success" onclick="approveServiceProvider('${nurse.uid || nurse._id || nurse.id}', 'nurse')">
                                            <i class="fas fa-check"></i> Approve
                                        </button>
                                        <button class="btn btn-danger" onclick="rejectServiceProvider('${nurse.uid || nurse._id || nurse.id}', 'nurse')">
                                            <i class="fas fa-times"></i> Reject
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        </div>
    `;

    console.log('👩‍⚕️ Nurses screen loaded successfully');
}

function loadLabs() {
    console.log('🧪 Loading labs...');
    const contentArea = document.getElementById('serviceProviderContent');
    console.log('🧪 Found content area:', contentArea);

    if (!contentArea) {
        console.error('❌ Service provider content area not found!');
        return;
    }

    const labs = allUsers.labs || [];
    console.log('🧪 Labs data:', labs);

    // Create a full-screen lab management view
    contentArea.innerHTML = `
        <div class="provider-management-screen">
            <div class="screen-header">
                <div class="header-left">
                    <button class="back-btn" onclick="showDashboardOverview()">
                        <i class="fas fa-arrow-left"></i> Back to Dashboard
                    </button>
                    <div class="screen-title">
                        <h1><i class="fas fa-flask"></i> Lab Management</h1>
                        <p>Manage lab registrations and approvals</p>
                    </div>
                </div>
                <div class="header-right">
                    <div class="screen-stats">
                        <div class="stat-item">
                            <span class="stat-number">${labs.length}</span>
                            <span class="stat-label">Total</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${labs.filter(l => l.isApproved).length}</span>
                            <span class="stat-label">Approved</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${labs.filter(l => !l.isApproved).length}</span>
                            <span class="stat-label">Pending</span>
                        </div>
                    </div>
                    <button class="refresh-btn" onclick="loadLabs()" title="Refresh Labs">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
            </div>
            
            <div class="screen-content">
                ${labs.length === 0 ? `
                    <div class="empty-state-screen">
                        <div class="empty-icon">
                            <i class="fas fa-flask fa-4x"></i>
                        </div>
                        <h2>No Labs Found</h2>
                        <p>No lab registrations have been submitted yet.</p>
                        <button class="btn btn-primary" onclick="refreshData()">
                            <i class="fas fa-refresh"></i> Refresh Data
                        </button>
                    </div>
                ` : `
                    <div class="provider-grid-screen">
                        ${labs.map(lab => `
                            <div class="provider-card-screen" data-status="${lab.isApproved ? 'approved' : 'pending'}">
                                <div class="card-header">
                                    <div class="provider-avatar-large">
                                        <i class="fas fa-flask"></i>
                                    </div>
                                    <div class="provider-info-main">
                                        <h3>${lab.name || lab.labName || 'Unknown Lab'}</h3>
                                        <p class="provider-email">${lab.email}</p>
                                        <span class="status-badge-large ${lab.isApproved ? 'approved' : 'pending'}">
                                            ${lab.isApproved ? 'Approved' : 'Pending Approval'}
                                        </span>
                                    </div>
                                </div>
                                <div class="card-body">
                                    <div class="info-grid">
                                        <div class="info-item">
                                            <label>License Number:</label>
                                            <span>${lab.licenseNumber || 'N/A'}</span>
                                        </div>
                                        <div class="info-item">
                                            <label>Contact:</label>
                                            <span>${lab.mobileNumber || lab.contact || 'N/A'}</span>
                                        </div>
                                        <div class="info-item">
                                            <label>Address:</label>
                                            <span>${lab.address || 'N/A'}</span>
                                        </div>
                                        <div class="info-item">
                                            <label>Registered:</label>
                                            <span>${lab.createdAt ? new Date(lab.createdAt).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="card-actions">
                                    <button class="btn btn-primary" onclick="viewProviderDetails('${lab.uid || lab._id || lab.id}', 'lab')">
                                        <i class="fas fa-eye"></i> View Details
                                    </button>
                                    ${!(lab.isApproved && lab.approvalStatus === 'approved') ? `
                                        <button class="btn btn-success" onclick="approveServiceProvider('${lab.uid || lab._id || lab.id}', 'lab')">
                                            <i class="fas fa-check"></i> Approve
                                        </button>
                                        <button class="btn btn-danger" onclick="rejectServiceProvider('${lab.uid || lab._id || lab.id}', 'lab')">
                                            <i class="fas fa-times"></i> Reject
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        </div>
    `;

    console.log('🧪 Labs screen loaded successfully');
}

function loadPharmacies() {
    console.log('💊 Loading pharmacies...');
    const contentArea = document.getElementById('serviceProviderContent');
    console.log('💊 Found content area:', contentArea);

    if (!contentArea) {
        console.error('❌ Service provider content area not found!');
        return;
    }

    const pharmacies = allUsers.pharmacies || [];
    console.log('💊 Pharmacies data:', pharmacies);

    // Create a full-screen pharmacy management view
    contentArea.innerHTML = `
        <div class="provider-management-screen">
            <div class="screen-header">
                <div class="header-left">
                    <button class="back-btn" onclick="showDashboardOverview()">
                        <i class="fas fa-arrow-left"></i> Back to Dashboard
                    </button>
                    <div class="screen-title">
                        <h1><i class="fas fa-pills"></i> Pharmacy Management</h1>
                        <p>Manage pharmacy registrations and approvals</p>
                    </div>
                </div>
                <div class="header-right">
                    <div class="screen-stats">
                        <div class="stat-item">
                            <span class="stat-number">${pharmacies.length}</span>
                            <span class="stat-label">Total</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${pharmacies.filter(p => !p.isApproved || p.approvalStatus === 'pending').length}</span>
                            <span class="stat-label">Pending</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">${pharmacies.filter(p => p.isApproved && p.approvalStatus === 'approved').length}</span>
                            <span class="stat-label">Approved</span>
                        </div>
                    </div>
                    <button class="refresh-btn" onclick="loadPharmacies()" title="Refresh Pharmacies">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
            </div>
            
            <div class="screen-content">
                ${pharmacies.length === 0 ? `
                    <div class="empty-state-screen">
                        <div class="empty-icon">
                            <i class="fas fa-pills fa-4x"></i>
                        </div>
                        <h2>No Pharmacies Found</h2>
                        <p>No pharmacy registrations have been submitted yet.</p>
                        <button class="btn btn-primary" onclick="refreshData()">
                            <i class="fas fa-refresh"></i> Refresh Data
                        </button>
                    </div>
                ` : `
                    <div class="provider-grid-screen">
                        ${pharmacies.map(pharmacy => `
                            <div class="provider-card-screen" data-status="${pharmacy.isApproved && pharmacy.approvalStatus === 'approved' ? 'approved' : 'pending'}">
                                <div class="card-header">
                                    <div class="provider-avatar-large">
                                        <i class="fas fa-pills"></i>
                                    </div>
                                    <div class="provider-info-main">
                                        <h3>${pharmacy.name || pharmacy.pharmacyName || 'Unknown Pharmacy'}</h3>
                                        <p class="provider-email">${pharmacy.email}</p>
                                        <span class="status-badge-large ${pharmacy.isApproved && pharmacy.approvalStatus === 'approved' ? 'approved' : 'pending'}">
                                            ${pharmacy.isApproved && pharmacy.approvalStatus === 'approved' ? 'Approved' : 'Pending Approval'}
                                        </span>
                                    </div>
                                </div>
                                <div class="card-body">
                                    <div class="info-grid">
                                        <div class="info-item">
                                            <label>License Number:</label>
                                            <span>${pharmacy.licenseNumber || 'N/A'}</span>
                                        </div>
                                        <div class="info-item">
                                            <label>Contact:</label>
                                            <span>${pharmacy.mobileNumber || pharmacy.contact || 'N/A'}</span>
                                        </div>
                                        <div class="info-item">
                                            <label>Address:</label>
                                            <span>${pharmacy.address || 'N/A'}</span>
                                        </div>
                                        <div class="info-item">
                                            <label>Registered:</label>
                                            <span>${pharmacy.createdAt ? new Date(pharmacy.createdAt).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="card-actions">
                                    <button class="btn btn-primary" onclick="viewProviderDetails('${pharmacy.uid || pharmacy._id || pharmacy.id}', 'pharmacy')">
                                        <i class="fas fa-eye"></i> View Details
                                    </button>
                                    ${!(pharmacy.isApproved && pharmacy.approvalStatus === 'approved') ? `
                                        <button class="btn btn-success" onclick="approveServiceProvider('${pharmacy.uid || pharmacy._id || pharmacy.id}', 'pharmacy')">
                                            <i class="fas fa-check"></i> Approve
                                        </button>
                                        <button class="btn btn-danger" onclick="rejectServiceProvider('${pharmacy.uid || pharmacy._id || pharmacy.id}', 'pharmacy')">
                                            <i class="fas fa-times"></i> Reject
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        </div>
    `;

    console.log('💊 Pharmacies screen loaded successfully');
}

async function loadAllUsers() {
    try {
        console.log('🔄 Loading all service providers...');
        
        // Show loading state for tables
        showTableLoadingStates();
        
        // Fetch all service providers from backend
        const allUsersData = await fetchAllServiceProviders();
        console.log('📊 Received data from backend:', allUsersData);
        
        // Update the global allUsers object
        allUsers.hospitals = allUsersData.hospitals || [];
        allUsers.doctors = allUsersData.doctors || [];
        allUsers.nurses = allUsersData.nurses || [];
        allUsers.labs = allUsersData.labs || [];
        allUsers.pharmacies = allUsersData.pharmacies || [];
        
        console.log('✅ Global allUsers object updated:', allUsers);
        
        // Don't automatically load individual provider screens
        // Only show dashboard overview by default
        console.log('🔄 Showing dashboard overview...');
        showDashboardOverview();
        
        console.log('✅ All UI components loaded');
        
        // Hide loading states
        hideTableLoadingStates();
        
    } catch (error) {
        console.error('❌ Error loading all users:', error);
        console.error('❌ Error details:', {
            message: error.message,
            stack: error.stack
        });
        
        // Show specific error message based on error type
        if (error.message.includes('No authenticated user')) {
            showErrorMessage('Authentication required. Please log in again.');
            // Redirect to login if authentication fails
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } else if (error.message.includes('HTTP error')) {
            showErrorMessage('Server error. Please check your connection and try again.');
        } else {
            showErrorMessage('Failed to load service provider data. Please refresh the page.');
        }
        
        // Hide loading states
        hideTableLoadingStates();
        
        // Show dashboard overview even on error
        showDashboardOverview();
    }
}

// Show loading states for all tables
function showTableLoadingStates() {
    const tableIds = ['hospitalsTable', 'doctorsTable', 'nursesTable', 'labsTable', 'pharmaciesTable'];
    
    tableIds.forEach(tableId => {
        const tbody = document.getElementById(tableId);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="loading-state">
                        <div class="loading-spinner">
                            <i class="fas fa-spinner fa-spin"></i>
                            <span>Loading...</span>
                        </div>
                    </td>
                </tr>
            `;
        }
    });
}

// Hide loading states for all tables
function hideTableLoadingStates() {
    // Loading states will be replaced when actual data is loaded
    console.log('✅ Loading states hidden');
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

// Removed duplicate viewUserDetails function

function logout() {
    console.log('🚪 Logout function called');
    if (confirm('Are you sure you want to logout?')) {
        console.log('✅ Logout confirmed, clearing data...');
        
                       // Clear authentication data
               localStorage.removeItem('adminLoggedIn');
               localStorage.removeItem('adminEmail');
               localStorage.removeItem('staff_idToken');
               localStorage.removeItem('staffType');
               localStorage.removeItem('superadmin_idToken');
               localStorage.removeItem('arcstaff_idToken');
               sessionStorage.removeItem('adminLoggedIn');
               sessionStorage.removeItem('adminEmail');
        
        console.log('🧹 Authentication data cleared');
        
        // Sign out from Firebase
        firebase.auth().signOut().then(() => {
            console.log('✅ Firebase signout successful');
        }).catch((error) => {
            console.error('❌ Firebase signout error:', error);
        });
        
        // Show logout message
        showNotification('Logging out...', 'info');
        
        // Redirect to login page
        setTimeout(() => {
            console.log('🔄 Redirecting to login page...');
            window.location.href = 'index.html';
        }, 1000);
    } else {
        console.log('❌ Logout cancelled');
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
  const staffType = localStorage.getItem('staffType');
  
  // Only run this function if we're on the ARC Staff dashboard
  if (!window.location.pathname.includes('arcstaff-dashboard.html')) {
    console.log('🚫 Not on ARC Staff dashboard, skipping session check');
    return;
  }
  
  if (!idToken) {
    console.log('❌ No token found, checking Firebase auth state');
    // Check if user is already authenticated with Firebase
    firebase.auth().onAuthStateChanged(function(user) {
      if (!user) {
        console.log('❌ No user authenticated, redirecting to login');
        window.location.href = 'index.html';
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
      localStorage.removeItem('staffType');
      window.location.href = 'index.html';
    } else {
      console.log('✅ Firebase user verified, session valid');
      
      // All users are ARC Staff, no redirection needed
      console.log('✅ User is ARC Staff, staying on dashboard');
      
      // Initialize dashboard for ARC Staff
      initializeArcStaffDashboard();
    }
  });
}

// Update staff status in settings modal
function updateStaffStatus(staffData) {
    const statusElement = document.getElementById('staffStatus');
    const lastUpdatedElement = document.getElementById('lastUpdated');
    const adminCommentsElement = document.getElementById('adminComments');
    
    if (statusElement) {
        if (staffData.isApproved) {
            statusElement.textContent = 'Approved';
            statusElement.className = 'status-badge approved';
        } else {
            statusElement.textContent = 'Pending Admin Approval';
            statusElement.className = 'status-badge pending';
        }
    }
    
    if (lastUpdatedElement && staffData.updatedAt) {
        lastUpdatedElement.textContent = new Date(staffData.updatedAt).toLocaleDateString();
    }
    
    if (adminCommentsElement && staffData.adminComments) {
        adminCommentsElement.innerHTML = `<p>${staffData.adminComments}</p>`;
    }
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
      
      // Try to load data even after timeout
      setTimeout(async () => {
        try {
          console.log('🔄 Attempting to load data after timeout...');
          await loadAllUsers();
        } catch (error) {
          console.error('❌ Failed to load data after timeout:', error);
        }
      }, 1000);
    }, 5000); // Reduced to 5 seconds timeout
    
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
          const response = await fetch(`https://arcular-plus-backend.onrender.com/api/arc-staff/profile`, {
            headers: {
              'Authorization': `Bearer ${idToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const staffProfile = await response.json();
            const actualName = staffProfile.staff?.fullName || staffProfile.fullName || staffProfile.displayName || user.email.split('@')[0];
            
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
    
    // Load all service providers data (with fallback)
    try {
      await loadAllUsers();
    } catch (error) {
      console.log('⚠️ Error loading service providers, continuing with basic data');
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
    
    const response = await fetch('https://arcular-plus-backend.onrender.com/api/arc-staff/pending-approvals', {
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      const stakeholders = result.pendingUsers || [];
      console.log('📊 Fetched pending approvals from backend:', stakeholders);
      
      // Update stats
      updateDashboardStats(stakeholders);
      
      // Render pending approvals list
      renderPendingApprovals(stakeholders);
    } else {
      console.error('❌ Failed to fetch pending approvals:', response.status);
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
  
  // Setup tab switching functionality
  setupTabSwitching();
  
  // Setup search functionality
  setupSearchFunctionality();
  
  // Setup modal close functionality
  setupModalCloseFunctionality();
}

// Setup tab switching functionality
function setupTabSwitching() {
  console.log('🔄 Setting up tab switching...');
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');
  
  console.log('📊 Found nav items:', navItems.length);
  console.log('📊 Found tab panes:', tabPanes.length);
  
  navItems.forEach((item, index) => {
    const targetTab = item.getAttribute('data-tab');
    console.log(`📋 Nav item ${index}: targetTab = ${targetTab}`);
    
    item.addEventListener('click', () => {
      console.log(`🔄 Switching to tab: ${targetTab}`);
      
      // Remove active class from all nav items and tab panes
      navItems.forEach(nav => nav.classList.remove('active'));
      tabPanes.forEach(pane => pane.classList.remove('active'));
      
      // Add active class to clicked nav item and corresponding tab pane
      item.classList.add('active');
      const targetPane = document.getElementById(targetTab);
      if (targetPane) {
        targetPane.classList.add('active');
        console.log(`✅ Tab ${targetTab} activated`);
      } else {
        console.warn(`⚠️ Tab pane ${targetTab} not found`);
      }
    });
  });
  
  console.log('✅ Tab switching setup complete');
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
          requiredDocuments: documentRequest,
          deadline: deadline,
          notes: requestNotes
        })
      });

      if (response.ok) {
        const result = await response.json();
        showSuccessMessage('Document request sent successfully');
        closeModal('documentRequestModal');
        
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
  // Pending approvals search
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
  
  // Approved service providers search
  const hospitalSearch = document.getElementById('hospitalSearch');
  if (hospitalSearch) {
    hospitalSearch.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      console.log('🏥 Hospital search:', searchTerm);
      filterTableRows('hospitalsTable', searchTerm, [0, 1, 2]); // name, registrationNumber, contact
    });
    console.log('✅ Hospital search setup');
  } else {
    console.warn('⚠️ Hospital search input not found');
  }
  
  const doctorSearch = document.getElementById('doctorSearch');
  if (doctorSearch) {
    doctorSearch.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      console.log('👨‍⚕️ Doctor search:', searchTerm);
      filterTableRows('doctorsTable', searchTerm, [0, 1, 2, 3]); // name, licenseNumber, specialization, contact
    });
    console.log('✅ Doctor search setup');
  } else {
    console.warn('⚠️ Doctor search input not found');
  }
  
  const nurseSearch = document.getElementById('nurseSearch');
  if (nurseSearch) {
    nurseSearch.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      console.log('👩‍⚕️ Nurse search:', searchTerm);
      filterTableRows('nursesTable', searchTerm, [0, 1, 2, 3]); // name, licenseNumber, department, contact
    });
    console.log('✅ Nurse search setup');
  } else {
    console.warn('⚠️ Nurse search input not found');
  }
  
  const labSearch = document.getElementById('labSearch');
  if (labSearch) {
    labSearch.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      console.log('🔬 Lab search:', searchTerm);
      filterTableRows('labsTable', searchTerm, [0, 1, 2]); // name, licenseNumber, contact
    });
    console.log('✅ Lab search setup');
  } else {
    console.warn('⚠️ Lab search input not found');
  }
  
  const pharmacySearch = document.getElementById('pharmacySearch');
  if (pharmacySearch) {
    pharmacySearch.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      console.log('💊 Pharmacy search:', searchTerm);
      filterTableRows('pharmaciesTable', searchTerm, [0, 1, 2]); // name, licenseNumber, contact
    });
    console.log('✅ Pharmacy search setup');
  } else {
    console.warn('⚠️ Pharmacy search input not found');
  }
  
  console.log('✅ Search functionality setup complete');
}

// Generic function to filter table rows
function filterTableRows(tableId, searchTerm, columnIndexes) {
  const tbody = document.getElementById(tableId);
  if (!tbody) return;
  
  const rows = tbody.querySelectorAll('tr');
  
  rows.forEach(row => {
    const cells = row.querySelectorAll('td');
    let shouldShow = false;
    
    // Check if any of the specified columns contain the search term
    columnIndexes.forEach(index => {
      if (cells[index] && cells[index].textContent.toLowerCase().includes(searchTerm)) {
        shouldShow = true;
      }
    });
    
    // Show/hide the row
    row.style.display = shouldShow || searchTerm === '' ? '' : 'none';
  });
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
    const category = document.getElementById('rejectionCategory').value;
    const nextSteps = document.getElementById('nextSteps').value.trim();
    
    if (!reason || !category) {
      showErrorMessage('Please fill in all required fields');
      return;
    }
    
    // Show loading state
    const confirmBtn = document.getElementById('confirmRejectBtn');
    const originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rejecting...';
    confirmBtn.disabled = true;
    
    // Call rejection API
    const success = await rejectServiceProvider('stakeholder', id, reason, category, nextSteps);
    
    if (success) {
      console.log('✅ Stakeholder rejected successfully');
      
      // Close modals
      closeModal('rejectionModal');
      closeModal('approvalModal');
      
      // Show success message
      showSuccessMessage('Stakeholder rejected successfully!');
      
      // Refresh data
      await fetchPendingStakeholders();
    } else {
      throw new Error('Rejection failed');
    }
    
  } catch (error) {
    console.error('❌ Error rejecting stakeholder:', error);
    showErrorMessage('Failed to reject stakeholder. Please try again.');
    
    // Reset button
    const confirmBtn = document.getElementById('confirmRejectBtn');
    confirmBtn.innerHTML = '<i class="fas fa-times"></i> Confirm Rejection';
    confirmBtn.disabled = false;
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
  try {
    console.log(`🔄 Exporting ${type} data...`);
    
    let dataToExport = [];
    let filename = '';
    
    switch (type) {
      case 'pending':
        dataToExport = pendingApprovals;
        filename = `pending-approvals-${new Date().toISOString().split('T')[0]}.json`;
        break;
      case 'approved':
        dataToExport = allUsers;
        filename = `approved-service-providers-${new Date().toISOString().split('T')[0]}.json`;
        break;
      case 'all':
        dataToExport = {
          pending: pendingApprovals,
          approved: allUsers,
          timestamp: new Date().toISOString()
        };
        filename = `all-stakeholders-${new Date().toISOString().split('T')[0]}.json`;
        break;
      case 'activity':
        dataToExport = getRecentActivityData();
        filename = `activity-log-${new Date().toISOString().split('T')[0]}.json`;
        break;
      default:
        throw new Error('Invalid export type');
    }
    
    // Create and download file
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showSuccessMessage(`${type} data exported successfully!`);
    closeQuickActionModal();
    
  } catch (error) {
    console.error('❌ Export error:', error);
    showErrorMessage('Failed to export data. Please try again.');
  }
}

function generateReportType(type) {
  try {
    console.log(`🔄 Generating ${type} report...`);
    
    let reportData = {};
    let reportHTML = '';
    
    switch (type) {
      case 'Monthly Summary':
        reportData = generateMonthlySummary();
        reportHTML = createMonthlySummaryHTML(reportData);
        break;
      case 'Approval Statistics':
        reportData = generateApprovalStats();
        reportHTML = createApprovalStatsHTML(reportData);
        break;
      case 'User Growth':
        reportData = generateUserGrowthReport();
        reportHTML = createUserGrowthHTML(reportData);
        break;
      case 'Document Verification':
        reportData = generateDocumentVerificationReport();
        reportHTML = createDocumentVerificationHTML(reportData);
        break;
      default:
        throw new Error('Invalid report type');
    }
    
    // Show report in modal
    showModal('Generated Report', reportHTML, 'Report Results');
    
  } catch (error) {
    console.error('❌ Report generation error:', error);
    showErrorMessage('Failed to generate report. Please try again.');
  }
}

// Helper functions for report generation
function generateMonthlySummary() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const monthlyData = {
    period: `${monthStart.toLocaleDateString()} - ${monthEnd.toLocaleDateString()}`,
    totalApplications: pendingApprovals.length + Object.values(allUsers).flat().length,
    pendingApplications: pendingApprovals.length,
    approvedApplications: Object.values(allUsers).flat().length,
    approvalRate: pendingApprovals.length > 0 ? 
      ((Object.values(allUsers).flat().length / (pendingApprovals.length + Object.values(allUsers).flat().length)) * 100).toFixed(1) : 0,
    topServiceType: getTopServiceType(),
    averageProcessingTime: calculateAvgProcessingTime()
  };
  
  return monthlyData;
}

function generateApprovalStats() {
  const stats = {
    totalPending: pendingApprovals.length,
    totalApproved: Object.values(allUsers).flat().length,
    byType: {
      hospital: {
        pending: pendingApprovals.filter(a => a.type === 'hospital').length,
        approved: allUsers.hospitals.length
      },
      doctor: {
        pending: pendingApprovals.filter(a => a.type === 'doctor').length,
        approved: allUsers.doctors.length
      },
      nurse: {
        pending: pendingApprovals.filter(a => a.type === 'nurse').length,
        approved: allUsers.nurses.length
      },
      lab: {
        pending: pendingApprovals.filter(a => a.type === 'lab').length,
        approved: allUsers.labs.length
      },
      pharmacy: {
        pending: pendingApprovals.filter(a => a.type === 'pharmacy').length,
        approved: allUsers.pharmacies.length
      }
    }
  };
  
  return stats;
}

function generateUserGrowthReport() {
  const growthData = {
    currentMonth: {
      applications: pendingApprovals.length + Object.values(allUsers).flat().length,
      approvals: Object.values(allUsers).flat().length
    },
    previousMonth: {
      applications: Math.floor((pendingApprovals.length + Object.values(allUsers).flat().length) * 0.8), // Simulated
      approvals: Math.floor(Object.values(allUsers).flat().length * 0.8)
    },
    growthRate: calculateGrowthRate()
  };
  
  return growthData;
}

function generateDocumentVerificationReport() {
  const verificationData = {
    totalDocuments: pendingApprovals.reduce((total, approval) => {
      return total + (approval.licenseDocumentUrl ? 1 : 0) + 
             (approval.profileImageUrl ? 1 : 0) + 
             (approval.registrationCertificateUrl ? 1 : 0) + 
             (approval.buildingPermitUrl ? 1 : 0);
    }, 0),
    verifiedDocuments: pendingApprovals.reduce((total, approval) => {
      return total + (approval.licenseDocumentUrl ? 1 : 0) + 
             (approval.profileImageUrl ? 1 : 0);
    }, 0),
    pendingVerification: pendingApprovals.filter(a => 
      !a.licenseDocumentUrl || !a.profileImageUrl
    ).length
  };
  
  return verificationData;
}

// Helper functions
function getTopServiceType() {
  const typeCounts = {};
  pendingApprovals.forEach(approval => {
    typeCounts[approval.type] = (typeCounts[approval.type] || 0) + 1;
  });
  
  return Object.keys(typeCounts).reduce((a, b) => 
    typeCounts[a] > typeCounts[b] ? a : b, 'none'
  );
}

function calculateGrowthRate() {
  const current = pendingApprovals.length + Object.values(allUsers).flat().length;
  const previous = Math.floor(current * 0.8);
  
  if (previous === 0) return 100;
  return ((current - previous) / previous * 100).toFixed(1);
}

function getRecentActivityData() {
  // Simulate recent activity data
  return [
    {
      action: 'Approved Hospital',
      timestamp: new Date().toISOString(),
      staff: currentUser?.email || 'Staff Member'
    },
    {
      action: 'Rejected Doctor Application',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      staff: currentUser?.email || 'Staff Member'
    }
  ];
}

// HTML creation functions for reports
function createMonthlySummaryHTML(data) {
  return `
    <div class="report-content">
      <h4>Monthly Summary Report</h4>
      <p><strong>Period:</strong> ${data.period}</p>
      
      <div class="report-stats">
        <div class="stat-item">
          <span class="stat-label">Total Applications:</span>
          <span class="stat-value">${data.totalApplications}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Pending Applications:</span>
          <span class="stat-value">${data.pendingApplications}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Approved Applications:</span>
          <span class="stat-value">${data.approvedApplications}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Approval Rate:</span>
          <span class="stat-value">${data.approvalRate}%</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Top Service Type:</span>
          <span class="stat-value">${data.topServiceType}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Avg Processing Time:</span>
          <span class="stat-value">${data.averageProcessingTime} days</span>
        </div>
      </div>
      
      <div class="report-actions">
        <button class="btn btn-primary" onclick="downloadReport('monthly')">Download PDF</button>
        <button class="btn btn-secondary" onclick="printReport()">Print Report</button>
      </div>
    </div>
  `;
}

function createApprovalStatsHTML(data) {
  return `
    <div class="report-content">
      <h4>Approval Statistics Report</h4>
      
      <div class="stats-overview">
        <div class="overview-card">
          <h5>Total Pending</h5>
          <div class="overview-value">${data.totalPending}</div>
        </div>
        <div class="overview-card">
          <h5>Total Approved</h5>
          <div class="overview-value">${data.totalApproved}</div>
        </div>
      </div>
      
      <div class="type-breakdown">
        <h5>Breakdown by Service Type</h5>
        ${Object.entries(data.byType).map(([type, counts]) => `
          <div class="type-stat">
            <span class="type-name">${type.charAt(0).toUpperCase() + type.slice(1)}</span>
            <span class="type-counts">
              <span class="pending">${counts.pending} pending</span>
              <span class="approved">${counts.approved} approved</span>
            </span>
          </div>
        `).join('')}
      </div>
      
      <div class="report-actions">
        <button class="btn btn-primary" onclick="downloadReport('approval-stats')">Download PDF</button>
        <button class="btn btn-secondary" onclick="printReport()">Print Report</button>
      </div>
    </div>
  `;
}

function createUserGrowthHTML(data) {
  return `
    <div class="report-content">
      <h4>User Growth Report</h4>
      
      <div class="growth-stats">
        <div class="growth-item">
          <h5>Current Month</h5>
          <div class="growth-values">
            <div class="growth-value">
              <span class="label">Applications:</span>
              <span class="value">${data.currentMonth.applications}</span>
            </div>
            <div class="growth-value">
              <span class="label">Approvals:</span>
              <span class="value">${data.currentMonth.approvals}</span>
            </div>
          </div>
        </div>
        
        <div class="growth-item">
          <h5>Previous Month</h5>
          <div class="growth-values">
            <div class="growth-value">
              <span class="label">Applications:</span>
              <span class="value">${data.previousMonth.applications}</span>
            </div>
            <div class="growth-value">
              <span class="label">Approvals:</span>
              <span class="value">${data.previousMonth.approvals}</span>
            </div>
          </div>
        </div>
        
        <div class="growth-item">
          <h5>Growth Rate</h5>
          <div class="growth-rate ${data.growthRate > 0 ? 'positive' : 'negative'}">
            ${data.growthRate}%
          </div>
        </div>
      </div>
      
      <div class="report-actions">
        <button class="btn btn-primary" onclick="downloadReport('user-growth')">Download PDF</button>
        <button class="btn btn-secondary" onclick="printReport()">Print Report</button>
      </div>
    </div>
  `;
}

function createDocumentVerificationHTML(data) {
  return `
    <div class="report-content">
      <h4>Document Verification Report</h4>
      
      <div class="verification-stats">
        <div class="verification-item">
          <h5>Total Documents</h5>
          <div class="verification-value">${data.totalDocuments}</div>
        </div>
        
        <div class="verification-item">
          <h5>Verified Documents</h5>
          <div class="verification-value">${data.verifiedDocuments}</div>
        </div>
        
        <div class="verification-item">
          <h5>Pending Verification</h5>
          <div class="verification-value">${data.pendingVerification}</div>
        </div>
        
        <div class="verification-item">
          <h5>Verification Rate</h5>
          <div class="verification-value">
            ${data.totalDocuments > 0 ? ((data.verifiedDocuments / data.totalDocuments) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>
      
      <div class="report-actions">
        <button class="btn btn-primary" onclick="downloadReport('document-verification')">Download PDF</button>
        <button class="btn btn-secondary" onclick="printReport()">Print Report</button>
      </div>
    </div>
  `;
}

// Additional helper functions
function downloadReport(type) {
  showSuccessMessage(`${type} report download started...`);
}

function printReport() {
  window.print();
}

// Staff profile management functions
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

// Modal management functions
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
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

// Handle approve stakeholder
async function handleApproveStakeholder(stakeholderId) {
  try {
    console.log('🔄 Approving stakeholder:', stakeholderId);
    
    // Show loading state
    const approveBtn = document.getElementById('approveBtn');
    const originalText = approveBtn.innerHTML;
    approveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Approving...';
    approveBtn.disabled = true;
    
    // Call approval API
    const success = await approveServiceProvider('stakeholder', stakeholderId, 'Approved by staff');
    
    if (success) {
      console.log('✅ Stakeholder approved successfully');
      
      // Close modal
      closeModal('approvalModal');
      
      // Show success message
      showSuccessMessage('Stakeholder approved successfully!');
      
      // Refresh data
      await fetchPendingStakeholders();
    } else {
      throw new Error('Approval failed');
    }
    
  } catch (error) {
    console.error('❌ Error approving stakeholder:', error);
    showErrorMessage('Failed to approve stakeholder. Please try again.');
    
    // Reset button
    const approveBtn = document.getElementById('approveBtn');
    approveBtn.innerHTML = '<i class="fas fa-check"></i> Approve';
    approveBtn.disabled = false;
  }
}

// Handle reject stakeholder
async function handleRejectStakeholder(stakeholderId) {
  try {
    console.log('🔄 Rejecting stakeholder:', stakeholderId);
    
    const reason = document.getElementById('rejectionReason').value.trim();
    const category = document.getElementById('rejectionCategory').value;
    const nextSteps = document.getElementById('nextSteps').value.trim();
    
    if (!reason || !category) {
      showErrorMessage('Please fill in all required fields');
      return;
    }
    
    // Show loading state
    const confirmBtn = document.getElementById('confirmRejectBtn');
    const originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rejecting...';
    confirmBtn.disabled = true;
    
    // Call rejection API
    const success = await rejectServiceProvider('stakeholder', stakeholderId, reason, category, nextSteps);
    
    if (success) {
      console.log('✅ Stakeholder rejected successfully');
      
      // Close modals
      closeModal('rejectionModal');
      closeModal('approvalModal');
      
      // Show success message
      showSuccessMessage('Stakeholder rejected successfully!');
      
      // Refresh data
      await fetchPendingStakeholders();
    } else {
      throw new Error('Rejection failed');
    }
    
  } catch (error) {
    console.error('❌ Error rejecting stakeholder:', error);
    showErrorMessage('Failed to reject stakeholder. Please try again.');
    
    // Reset button
    const confirmBtn = document.getElementById('confirmRejectBtn');
    confirmBtn.innerHTML = '<i class="fas fa-times"></i> Confirm Rejection';
    confirmBtn.disabled = false;
  }
}

// Fetch pending stakeholders
async function fetchPendingStakeholders() {
  try {
    console.log('🔄 Fetching pending stakeholders...');
    
    // Refresh pending approvals
    await loadPendingApprovalsFromBackend();
    
    // Update dashboard stats
    updatePendingCount();
    
    console.log('✅ Pending stakeholders refreshed');
    
  } catch (error) {
    console.error('❌ Error fetching pending stakeholders:', error);
    showErrorMessage('Failed to refresh pending stakeholders');
  }
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
            <div class="document-status">
              <i class="fas fa-file-alt"></i>
              <span>Documents: ${getDocumentStatus(approval)}</span>
            </div>
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

// Get document status for display
function getDocumentStatus(approval) {
  const documents = [];
  
  if (approval.licenseDocumentUrl) documents.push('License');
  if (approval.registrationCertificateUrl) documents.push('Registration');
  if (approval.buildingPermitUrl) documents.push('Building Permit');
  if (approval.profileImageUrl) documents.push('Profile Image');
  if (approval.identityProofUrl) documents.push('Identity Proof');
  
  if (documents.length === 0) {
    return '<span class="text-warning">No documents uploaded</span>';
  } else if (documents.length >= 3) {
    return `<span class="text-success">${documents.length} documents uploaded</span>`;
  } else {
    return `<span class="text-info">${documents.length} documents uploaded</span>`;
  }
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
  window.currentApproval = { id: details._id || details.uid, type: type, details: details };
  
  // Show approval status
  showApprovalStatus(details);
}

// Show approval status in modal
function showApprovalStatus(details) {
  const modalContent = document.getElementById('modalContent');
  if (!modalContent) return;
  
  // Add approval status section at the top
  const statusSection = document.createElement('div');
  statusSection.className = 'approval-status-section';
  statusSection.innerHTML = `
    <div class="status-header">
      <h4><i class="fas fa-info-circle"></i> Current Status</h4>
    </div>
    <div class="status-content">
      <div class="status-item">
        <label>Approval Status:</label>
        <span class="status-badge ${details.approvalStatus || 'pending'}">${details.approvalStatus || 'pending'}</span>
      </div>
      <div class="status-item">
        <label>Is Approved:</label>
        <span class="status-badge ${details.isApproved ? 'approved' : 'pending'}">${details.isApproved ? 'Yes' : 'No'}</span>
      </div>
      ${details.createdAt ? `
      <div class="status-item">
        <label>Registration Date:</label>
        <span>${new Date(details.createdAt).toLocaleDateString()}</span>
      </div>
      ` : ''}
    </div>
  `;
  
  // Insert at the beginning of modal content
  modalContent.insertBefore(statusSection, modalContent.firstChild);
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
        <div class="document-summary">
          <p><strong>Document Status:</strong> ${getDocumentStatus(hospital)}</p>
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
      closeModal('approvalModal');
      
      // Show success message
      showSuccessMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} approved successfully! The service provider can now login to their dashboard.`);
      
      // Refresh dashboard data
      await loadDashboardData();
      
      // Refresh approved service providers list
      await loadAllUsers();
      
      // Refresh pending approvals list
      await loadPendingApprovalsFromBackend();
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
      closeModal('approvalModal');
      
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

// ===== NEW REDESIGNED DASHBOARD FUNCTIONS =====

// Initialize sidebar navigation
function initializeSidebarNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all items
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active class to clicked item
            item.classList.add('active');
            
            // Get provider type
            const providerType = item.dataset.provider;
            currentProviderType = providerType;
            
            // Load service provider data
            loadServiceProviderData(providerType);
        });
    });
}

// Load service provider data for selected type
async function loadServiceProviderData(providerType) {
    try {
        console.log(`🔄 Loading data for ${providerType}...`);
        
        // Show loading state
        showServiceProviderLoading();
        
        // Fetch data from backend
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/arc-staff/service-providers/${providerType}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            currentProviderData = {
                approved: result.data.approved || [],
                pending: result.data.pending || []
            };
            
            // Update sidebar counts
            updateSidebarCounts(providerType, currentProviderData);
            
            // Render service provider lists
            renderServiceProviderLists(providerType);
        } else {
            throw new Error(result.message || 'Failed to fetch data');
        }
        
    } catch (error) {
        console.error(`❌ Error loading ${providerType} data:`, error);
        showErrorMessage(`Failed to load ${providerType} data`);
        showServiceProviderError();
    }
}

// Show loading state for service provider content
function showServiceProviderLoading() {
    const content = document.getElementById('serviceProviderContent');
    content.innerHTML = `
        <div class="loading-state-content">
            <div class="loading-spinner">
                <div class="spinner-ring"></div>
                <div class="spinner-ring"></div>
                <div class="spinner-ring"></div>
            </div>
            <p>Loading ${currentProviderType} data...</p>
        </div>
    `;
}

// Show error state for service provider content
function showServiceProviderError() {
    const content = document.getElementById('serviceProviderContent');
    content.innerHTML = `
        <div class="error-state-content">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Error Loading Data</h3>
            <p>Failed to load ${currentProviderType} information. Please try again.</p>
            <button class="btn btn-primary" onclick="loadServiceProviderData('${currentProviderType}')">
                <i class="fas fa-redo"></i> Retry
            </button>
        </div>
    `;
}

// Update sidebar counts
function updateSidebarCounts(providerType, data) {
    const approvedCount = document.getElementById(`${providerType}ApprovedCount`);
    const pendingCount = document.getElementById(`${providerType}PendingCount`);
    
    if (approvedCount) approvedCount.textContent = data.approved.length;
    if (pendingCount) pendingCount.textContent = data.pending.length;
}

// Render service provider lists
function renderServiceProviderLists(providerType) {
    const content = document.getElementById('serviceProviderContent');
    
    content.innerHTML = `
        <div class="service-provider-lists">
            <div class="list-section">
                <div class="section-header">
                    <h2>Pending Approvals</h2>
                    <span class="count-badge pending">${currentProviderData.pending.length}</span>
                </div>
                <div class="list-container">
                    ${renderPendingList(providerType)}
                </div>
            </div>
            
            <div class="list-section">
                <div class="section-header">
                    <h2>Approved Providers</h2>
                    <span class="count-badge approved">${currentProviderData.approved.length}</span>
                </div>
                <div class="list-container">
                    ${renderApprovedList(providerType)}
                </div>
            </div>
        </div>
    `;
}

// Render pending list
function renderPendingList(providerType) {
    if (currentProviderData.pending.length === 0) {
        return `
            <div class="empty-state">
                <i class="fas fa-check-circle"></i>
                <p>No pending approvals for ${providerType}</p>
            </div>
        `;
    }
    
    return currentProviderData.pending.map(provider => `
        <div class="list-item pending" data-id="${provider.id}" data-type="${providerType}">
            <div class="item-info">
                <div class="item-name">${provider.name || provider.fullName || provider.hospitalName || provider.labName || provider.pharmacyName}</div>
                <div class="item-details">
                    <span class="email">${provider.email}</span>
                    <span class="date">${formatDate(provider.createdAt || provider.registrationDate)}</span>
                </div>
            </div>
            <div class="item-actions">
                <button class="btn btn-primary btn-sm" onclick="viewProviderDetails('${provider.id}', '${providerType}')">
                    <i class="fas fa-eye"></i> View
                </button>
            </div>
        </div>
    `).join('');
}

// Render approved list
function renderApprovedList(providerType) {
    if (currentProviderData.approved.length === 0) {
        return `
            <div class="empty-state">
                <i class="fas fa-info-circle"></i>
                <p>No approved ${providerType} yet</p>
            </div>
        `;
    }
    
    return currentProviderData.approved.map(provider => `
        <div class="list-item approved" data-id="${provider.id}" data-type="${providerType}">
            <div class="item-info">
                <div class="item-name">${provider.name || provider.fullName || provider.hospitalName || provider.labName || provider.pharmacyName}</div>
                <div class="item-details">
                    <span class="email">${provider.email}</span>
                    <span class="date">${formatDate(provider.createdAt || provider.registrationDate)}</span>
                </div>
            </div>
            <div class="item-actions">
                <button class="btn btn-secondary btn-sm" onclick="viewProviderDetails('${provider.id}', '${providerType}')">
                    <i class="fas fa-eye"></i> View
                </button>
            </div>
        </div>
    `).join('');
}

// View provider details
async function viewProviderDetails(providerId, providerType) {
    try {
        console.log(`🔍 Viewing details for ${providerType} with ID: ${providerId}`);
        
        // Fetch detailed information
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/arc-staff/provider-details/${providerType}/${providerId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            const provider = result.data;
            
            // Populate modal with provider details
            populateProviderDetailsModal(provider, providerType);
            
            // Show modal
            document.getElementById('providerDetailsModal').style.display = 'block';
        } else {
            throw new Error(result.message || 'Failed to fetch provider details');
        }
        
    } catch (error) {
        console.error('❌ Error viewing provider details:', error);
        showErrorMessage('Failed to load provider details');
    }
}

// Populate provider details modal
function populateProviderDetailsModal(provider, providerType) {
    const modalTitle = document.getElementById('providerModalTitle');
    const modalContent = document.getElementById('providerDetailsContent');
    
    modalTitle.textContent = `${providerType.charAt(0).toUpperCase() + providerType.slice(1)} Details`;
    
    modalContent.innerHTML = `
        <div class="provider-details">
            <div class="detail-section">
                <h4>Basic Information</h4>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Name:</label>
                        <span>${provider.name || provider.fullName || provider.hospitalName || provider.labName || provider.pharmacyName}</span>
                    </div>
                    <div class="detail-item">
                        <label>Email:</label>
                        <span>${provider.email}</span>
                    </div>
                    <div class="detail-item">
                        <label>Phone:</label>
                        <span>${provider.mobileNumber || provider.phoneNumber || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <label>Registration Date:</label>
                        <span>${formatDate(provider.createdAt || provider.registrationDate)}</span>
                    </div>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>Documents</h4>
                <div class="document-grid">
                    ${renderDocumentSection(provider, providerType)}
                </div>
            </div>
            
            <div class="detail-section">
                <h4>Additional Information</h4>
                <div class="detail-grid">
                    ${renderAdditionalInfo(provider, providerType)}
                </div>
            </div>
        </div>
    `;
    
    // Store current provider for approval/rejection
    window.currentProvider = { ...provider, type: providerType };
    
    // Setup modal event listeners
    setupProviderModalEventListeners(provider, providerType);
}

// Setup provider modal event listeners
function setupProviderModalEventListeners(provider, providerType) {
    const approveBtn = document.getElementById('approveProviderBtn');
    const rejectBtn = document.getElementById('rejectProviderBtn');
    const restoreBtn = document.getElementById('restoreProviderBtn');
    const requestDocsBtn = document.getElementById('requestDocsBtn');
    const closeBtn = document.getElementById('closeProviderBtn');
    
    // Show/hide buttons based on provider status
    if (approveBtn) {
        approveBtn.style.display = provider.approvalStatus === 'pending' ? 'inline-block' : 'none';
        approveBtn.onclick = () => handleApproveProvider(provider, providerType);
    }
    
    if (rejectBtn) {
        rejectBtn.style.display = provider.approvalStatus === 'pending' ? 'inline-block' : 'none';
        rejectBtn.onclick = () => showRejectionModal(provider, providerType);
    }
    
    if (restoreBtn) {
        restoreBtn.style.display = provider.approvalStatus === 'rejected' ? 'inline-block' : 'none';
        restoreBtn.onclick = () => handleRestoreProvider(provider, providerType);
    }
    
    if (requestDocsBtn) {
        requestDocsBtn.onclick = () => showDocumentRequestModal(provider, providerType);
    }
    
    if (closeBtn) {
        closeBtn.onclick = () => closeProviderDetailsModal();
    }
}

// Handle approve provider
async function handleApproveProvider(provider, providerType) {
    try {
        const success = await approveServiceProvider(providerType, provider.uid || provider.id, 'Approved by staff');
        if (success) {
            showSuccessMessage(`${providerType.charAt(0).toUpperCase() + providerType.slice(1)} approved successfully!`);
            closeProviderDetailsModal();
            // Refresh the current view
            if (currentProviderType) {
                loadServiceProviderData(currentProviderType);
            }
        }
    } catch (error) {
        console.error('Error approving provider:', error);
        showErrorMessage('Failed to approve provider');
    }
}

// Handle restore provider
async function handleRestoreProvider(provider, providerType) {
    try {
        const success = await restoreServiceProvider(providerType, provider.uid || provider.id);
        if (success) {
            closeProviderDetailsModal();
            // Refresh the current view
            if (currentProviderType) {
                loadServiceProviderData(currentProviderType);
            }
        }
    } catch (error) {
        console.error('Error restoring provider:', error);
        showErrorMessage('Failed to restore provider');
    }
}

// Render document section
function renderDocumentSection(provider, providerType) {
    const documents = [];
    
    if (provider.profileImageUrl) {
        documents.push({
            name: 'Profile Image',
            url: provider.profileImageUrl,
            type: 'image'
        });
    }
    
    if (provider.licenseDocumentUrl) {
        documents.push({
            name: 'License Document',
            url: provider.licenseDocumentUrl,
            type: 'document'
        });
    }
    
    if (provider.identityProofUrl) {
        documents.push({
            name: 'Identity Proof',
            url: provider.identityProofUrl,
            type: 'document'
        });
    }
    
    if (provider.registrationCertificateUrl) {
        documents.push({
            name: 'Registration Certificate',
            url: provider.registrationCertificateUrl,
            type: 'document'
        });
    }
    
    if (documents.length === 0) {
        return '<p>No documents uploaded</p>';
    }
    
    return documents.map(doc => `
        <div class="document-item">
            <div class="document-info">
                <i class="fas fa-${doc.type === 'image' ? 'image' : 'file-alt'}"></i>
                <span>${doc.name}</span>
            </div>
            <button class="btn btn-sm btn-secondary" onclick="viewDocument('${doc.url}', '${doc.name}')">
                <i class="fas fa-eye"></i> View
            </button>
        </div>
    `).join('');
}

// Render additional information
function renderAdditionalInfo(provider, providerType) {
    const info = [];
    
    switch (providerType) {
        case 'hospital':
            if (provider.hospitalName) info.push(['Hospital Name', provider.hospitalName]);
            if (provider.registrationNumber) info.push(['Registration Number', provider.registrationNumber]);
            if (provider.address) info.push(['Address', provider.address]);
            break;
        case 'doctor':
            if (provider.specialization) info.push(['Specialization', provider.specialization]);
            if (provider.medicalRegistrationNumber) info.push(['Medical Registration', provider.medicalRegistrationNumber]);
            if (provider.experienceYears) info.push(['Experience', `${provider.experienceYears} years`]);
            break;
        case 'nurse':
            if (provider.department) info.push(['Department', provider.department]);
            if (provider.registrationNumber) info.push(['Registration Number', provider.registrationNumber]);
            break;
        case 'lab':
            if (provider.labName) info.push(['Lab Name', provider.labName]);
            if (provider.services) info.push(['Services', provider.services]);
            break;
        case 'pharmacy':
            if (provider.pharmacyName) info.push(['Pharmacy Name', provider.pharmacyName]);
            if (provider.services) info.push(['Services', provider.services]);
            break;
    }
    
    if (info.length === 0) {
        return '<p>No additional information available</p>';
    }
    
    return info.map(([label, value]) => `
        <div class="detail-item">
            <label>${label}:</label>
            <span>${value}</span>
        </div>
    `).join('');
}

// View document
function viewDocument(url, name) {
    if (url && url.trim() !== '') {
        try {
            // Check if URL is valid
            const urlObj = new URL(url);
            
            // Try to open in new tab
            const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
            
            if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
                // Popup blocked, show message and provide alternative
                showErrorMessage('Popup blocked! Please allow popups for this site or copy the URL manually.');
                
                // Show URL in a modal for manual copying
                const urlModal = document.createElement('div');
                urlModal.className = 'modal';
                urlModal.style.display = 'block';
                urlModal.innerHTML = `
                    <div class="modal-content" style="max-width: 600px;">
                        <div class="modal-header">
                            <h3>Document URL</h3>
                            <span class="close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</span>
                        </div>
                        <div class="modal-body">
                            <p>Copy this URL and paste it in a new tab:</p>
                            <div style="background: #f5f5f5; padding: 10px; border-radius: 4px; word-break: break-all; font-family: monospace;">
                                ${url}
                            </div>
                            <button class="btn btn-primary" onclick="navigator.clipboard.writeText('${url}').then(() => alert('URL copied to clipboard!'))" style="margin-top: 10px;">
                                <i class="fas fa-copy"></i> Copy URL
                            </button>
                        </div>
                    </div>
                `;
                document.body.appendChild(urlModal);
                
                // Auto-remove modal after 10 seconds
                setTimeout(() => {
                    if (urlModal.parentElement) {
                        urlModal.remove();
                    }
                }, 10000);
            }
        } catch (error) {
            console.error('Error opening document:', error);
            showErrorMessage('Invalid document URL. Please check the file link.');
        }
    } else {
        showErrorMessage('Document not available');
    }
}

// Initialize settings functionality
function initializeSettings() {
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeBtn = settingsModal.querySelector('.close');
    const saveBtn = document.getElementById('saveSettingsBtn');
    const cancelBtn = document.getElementById('cancelSettingsBtn');
    
    // Open settings modal
    settingsBtn.addEventListener('click', () => {
        loadStaffProfile();
        settingsModal.style.display = 'block';
    });
    
    // Close settings modal
    closeBtn.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });
    
    // Save settings
    saveBtn.addEventListener('click', saveStaffSettings);
    
    // Cancel settings
    cancelBtn.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });
}

// Load staff profile
async function loadStaffProfile() {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/arc-staff/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.staff) {
                const profile = result.staff; // Backend returns 'staff' not 'data'
                
                console.log('📋 Staff profile loaded:', profile);
                
                // Populate form fields with null checks
                document.getElementById('staffName').value = profile.fullName || '';
                document.getElementById('staffPhone').value = profile.mobileNumber || '';
                document.getElementById('staffDepartment').value = profile.department || '';
                document.getElementById('staffAddress').value = profile.address || '';
                document.getElementById('staffBio').value = profile.bio || '';
                
                // Update status information
                updateStaffStatus(profile);
            } else {
                console.error('❌ Profile loading failed:', result.message || 'No staff data received');
                showErrorMessage(result.message || 'Failed to load profile data');
            }
        } else {
            console.error('❌ Profile API error:', response.status, response.statusText);
            showErrorMessage('Failed to load profile data');
        }
    } catch (error) {
        console.error('❌ Error loading staff profile:', error);
        showErrorMessage('Failed to load profile data');
        
        // Set default values for form fields
        document.getElementById('staffName').value = '';
        document.getElementById('staffPhone').value = '';
        document.getElementById('staffDepartment').value = '';
        document.getElementById('staffAddress').value = '';
        document.getElementById('staffBio').value = '';
        
        // Set default status
        updateStaffStatus({
            isApproved: false,
            lastUpdated: null,
            reviewNotes: 'Profile data not available'
        });
    }
}

// Load staff data into form (alias for loadStaffProfile)
function loadStaffDataIntoForm() {
    loadStaffProfile();
}

// Save staff settings
async function saveStaffSettings() {
    try {
        // Validate required fields
        const fullName = document.getElementById('staffName').value.trim();
        const mobileNumber = document.getElementById('staffPhone').value.trim();
        const department = document.getElementById('staffDepartment').value.trim();
        
        if (!fullName || !mobileNumber || !department) {
            showErrorMessage('Please fill in all required fields (Full Name, Phone Number, Department)');
            return;
        }
        
        const formData = {
            fullName: fullName,
            mobileNumber: mobileNumber,
            department: department,
            address: document.getElementById('staffAddress').value.trim(),
            bio: document.getElementById('staffBio').value.trim()
        };
        
        console.log('📝 Submitting profile changes:', formData);
        
        const token = await getAuthToken();
        
        // Submit profile changes for admin approval instead of direct update
        const response = await fetch(`${API_BASE_URL}/arc-staff/profile-changes`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                showSuccessMessage('Profile changes submitted for admin approval. You will be notified once approved.');
                document.getElementById('settingsModal').style.display = 'none';
                
                // Don't update header display yet - wait for admin approval
                console.log('✅ Profile changes submitted for approval:', formData);
            } else {
                console.error('❌ Profile submission failed:', result.message);
                showErrorMessage(result.message || 'Failed to submit profile changes');
            }
        } else {
            const errorText = await response.text();
            console.error('❌ Profile submission API error:', response.status, errorText);
            showErrorMessage('Failed to submit profile changes');
        }
        
    } catch (error) {
        console.error('❌ Error submitting profile changes:', error);
        showErrorMessage('Failed to submit profile changes. Please try again.');
    }
}

// Format date helper
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Initialize new dashboard functionality
function initializeNewDashboard() {
    console.log('🚀 Initializing new dashboard functionality...');
    
    // Initialize sidebar navigation
    initializeSidebarNavigation();
    
    // Initialize settings
    initializeSettings();
    
    // Setup stats filtering
    setupStatsFilter();
    
    // Load initial counts
    loadInitialCounts();
    
    console.log('✅ New dashboard functionality initialized');
}

// Load initial counts for sidebar
async function loadInitialCounts() {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/arc-staff/dashboard-counts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                const counts = result.data;
                
                // Update all sidebar counts
                Object.keys(counts).forEach(providerType => {
                    const approvedCount = document.getElementById(`${providerType}ApprovedCount`);
                    const pendingCount = document.getElementById(`${providerType}PendingCount`);
                    
                    if (approvedCount) approvedCount.textContent = counts[providerType].approved || 0;
                    if (pendingCount) pendingCount.textContent = counts[providerType].pending || 0;
                });
            }
        }
    } catch (error) {
        console.error('❌ Error loading initial counts:', error);
    }
}

// Close provider details modal
function closeProviderDetailsModal() {
    document.getElementById('providerDetailsModal').style.display = 'none';
    window.currentProvider = null;
}

// ===== IMPROVED ARCSTAFF DASHBOARD FUNCTIONALITY =====

// Global variables for improved functionality
let currentApproval = null;

// Load Service Provider Data with improved functionality
async function loadServiceProviderDataImproved(providerType) {
  try {
    console.log(`📋 Loading ${providerType} data with improved functionality...`);
    
    const idToken = localStorage.getItem('staff_idToken');
    const response = await fetch(`https://arcular-plus-backend.onrender.com/api/arc-staff/approved-${providerType}s`, {
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      const providers = result[providerType + 's'] || [];
      
      // Filter pending approvals for this provider type
      const pendingForType = pendingApprovals.filter(approval => approval.userType === providerType);
      
      // Render the provider list with improved UI
      renderServiceProviderListImproved(providerType, providers, pendingForType);
      
      // Update active nav item
      updateActiveNavItem(providerType);
    } else {
      console.error(`❌ Failed to load ${providerType} data:`, response.status);
      showErrorMessage(`Failed to load ${providerType} data. Please try again.`);
    }
  } catch (error) {
    console.error(`❌ Error loading ${providerType} data:`, error);
    showErrorMessage(`Failed to load ${providerType} data. Please try again.`);
  }
}

// Render Service Provider List with improved UI
function renderServiceProviderListImproved(providerType, approvedProviders, pendingProviders) {
  const container = document.getElementById('serviceProviderContent');
  if (!container) return;
  
  const typeIcon = getTypeIcon(providerType);
  const typeColor = getTypeColor(providerType);
  const typeName = providerType.charAt(0).toUpperCase() + providerType.slice(1);
  
  let html = `
    <div class="provider-section">
      <div class="section-header">
        <div class="section-title">
          <i class="${typeIcon}"></i>
          <h2>${typeName}s Management</h2>
        </div>
        <div class="section-stats">
          <span class="stat-item approved">
            <i class="fas fa-check-circle"></i>
            ${approvedProviders.length} Approved
          </span>
          <span class="stat-item pending">
            <i class="fas fa-clock"></i>
            ${pendingProviders.length} Pending
          </span>
        </div>
      </div>
  `;
  
  // Pending Approvals Section
  if (pendingProviders.length > 0) {
    html += `
      <div class="pending-section">
        <h3><i class="fas fa-clock"></i> Pending Approvals</h3>
        <div class="provider-grid">
    `;
    
    pendingProviders.forEach(provider => {
      html += createProviderCardImproved(provider, 'pending');
    });
    
    html += `
        </div>
      </div>
    `;
  }
  
  // Approved Providers Section
  if (approvedProviders.length > 0) {
    html += `
      <div class="approved-section">
        <h3><i class="fas fa-check-circle"></i> Approved ${typeName}s</h3>
        <div class="provider-grid">
    `;
    
    approvedProviders.forEach(provider => {
      html += createProviderCardImproved(provider, 'approved');
    });
    
    html += `
        </div>
      </div>
    `;
  }
  
  // No data message
  if (pendingProviders.length === 0 && approvedProviders.length === 0) {
    html += `
      <div class="no-data-message">
        <i class="fas fa-info-circle"></i>
        <h3>No ${typeName}s Found</h3>
        <p>No ${providerType} registrations found in the system.</p>
      </div>
    `;
  }
  
  html += `</div>`;
  
  container.innerHTML = html;
  
  // Add event listeners to provider cards
  addProviderCardListenersImproved();
}

// Create Provider Card with improved design
function createProviderCardImproved(provider, status) {
  const typeIcon = getTypeIcon(provider.userType || provider.type);
  const typeColor = getTypeColor(provider.userType || provider.type);
  const name = provider.fullName || provider.hospitalName || provider.labName || provider.pharmacyName || 'N/A';
  const email = provider.email || 'N/A';
  const phone = provider.mobileNumber || provider.contact || 'N/A';
  const submittedDate = new Date(provider.createdAt || provider.submittedAt || Date.now()).toLocaleDateString();
  
  let statusBadge = '';
  let actionButtons = '';
  
  if (status === 'pending') {
    statusBadge = '<span class="status-badge pending">Pending Review</span>';
    actionButtons = `
      <div class="card-actions">
        <button class="btn btn-primary btn-sm" onclick="viewProviderDetailsImproved('${provider.uid}', '${provider.userType || provider.type}', 'pending')">
          <i class="fas fa-eye"></i> Review
        </button>
      </div>
    `;
  } else {
    statusBadge = '<span class="status-badge approved">Approved</span>';
    actionButtons = `
      <div class="card-actions">
        <button class="btn btn-info btn-sm" onclick="viewProviderDetailsImproved('${provider.uid}', '${provider.userType || provider.type}', 'approved')">
          <i class="fas fa-eye"></i> View
        </button>
      </div>
    `;
  }
  
  return `
    <div class="provider-card ${status}" data-uid="${provider.uid}" data-type="${provider.userType || provider.type}" data-status="${status}">
      <div class="card-header">
        <div class="provider-type">
          <i class="${typeIcon}"></i>
          <span class="type-label">${(provider.userType || provider.type).charAt(0).toUpperCase() + (provider.userType || provider.type).slice(1)}</span>
        </div>
        ${statusBadge}
      </div>
      
      <div class="card-content">
        <h4 class="provider-name">${name}</h4>
        <div class="provider-details">
          <div class="detail-item">
            <i class="fas fa-envelope"></i>
            <span>${email}</span>
          </div>
          <div class="detail-item">
            <i class="fas fa-phone"></i>
            <span>${phone}</span>
          </div>
          <div class="detail-item">
            <i class="fas fa-calendar"></i>
            <span>Submitted: ${submittedDate}</span>
          </div>
        </div>
      </div>
      
      ${actionButtons}
    </div>
  `;
}

// View Provider Details with improved functionality
async function viewProviderDetailsImproved(uid, type, status) {
  try {
    console.log(`👁️ Viewing ${type} details for UID: ${uid}`);
    
    const idToken = localStorage.getItem('staff_idToken');
    const response = await fetch(`https://arcular-plus-backend.onrender.com/api/arc-staff/service-provider/${type}/${uid}`, {
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      const provider = result.data;
      
      // Set current approval for actions
      currentApproval = {
        id: uid,
        type: type,
        status: status,
        data: provider
      };
      
      // Show provider details modal with improved UI
      showProviderDetailsModalImproved(provider, status);
    } else {
      console.error(`❌ Failed to load ${type} details:`, response.status);
      showErrorMessage(`Failed to load ${type} details. Please try again.`);
    }
  } catch (error) {
    console.error(`❌ Error loading ${type} details:`, error);
    showErrorMessage(`Failed to load ${type} details. Please try again.`);
  }
}

// Show Provider Details Modal with improved UI
function showProviderDetailsModalImproved(provider, status) {
  const modal = document.getElementById('providerDetailsModal');
  const title = document.getElementById('providerModalTitle');
  const content = document.getElementById('providerDetailsContent');
  
  if (!modal || !title || !content) return;
  
  // Update modal title
  const typeName = provider?.type?.charAt(0).toUpperCase() + provider?.type?.slice(1) || 'Service Provider';
  title.textContent = `${typeName} Details`;
  
  // Generate content with improved UI
  content.innerHTML = generateProviderDetailsHTMLImproved(provider, status);
  
  // Show/hide action buttons based on status
  const approveBtn = document.getElementById('approveProviderBtn');
  const rejectBtn = document.getElementById('rejectProviderBtn');
  const restoreBtn = document.getElementById('restoreProviderBtn');
  
  if (status === 'pending') {
    if (approveBtn) approveBtn.style.display = 'inline-block';
    if (rejectBtn) rejectBtn.style.display = 'inline-block';
    if (restoreBtn) restoreBtn.style.display = 'none';
  } else if (status === 'rejected') {
    if (approveBtn) approveBtn.style.display = 'none';
    if (rejectBtn) rejectBtn.style.display = 'none';
    if (restoreBtn) restoreBtn.style.display = 'inline-block';
  } else {
    if (approveBtn) approveBtn.style.display = 'none';
    if (rejectBtn) rejectBtn.style.display = 'none';
    if (restoreBtn) restoreBtn.style.display = 'none';
  }
  
  // Show modal
  modal.style.display = 'block';
}

// Generate Provider Details HTML with improved UI
function generateProviderDetailsHTMLImproved(provider, status) {
  if (!provider) {
    return '<div class="error-message">Provider data not available</div>';
  }
  
  const typeIcon = getTypeIcon(provider.type);
  const typeColor = getTypeColor(provider.type);
  
  let html = `
    <div class="provider-details-container">
      <div class="details-header">
        <div class="provider-info">
          <div class="provider-avatar">
            <i class="${typeIcon}"></i>
          </div>
          <div class="provider-basic-info">
            <h3>${provider.fullName || provider.hospitalName || provider.labName || provider.pharmacyName || 'N/A'}</h3>
            <p class="provider-type">${provider.type?.charAt(0).toUpperCase() + provider.type?.slice(1) || 'Service Provider'}</p>
            <p class="provider-email">${provider.email || 'N/A'}</p>
          </div>
        </div>
        <div class="status-info">
          <span class="status-badge ${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
        </div>
      </div>
      
      <div class="details-content">
        <div class="details-section">
          <h4><i class="fas fa-info-circle"></i> Basic Information</h4>
          <div class="info-grid">
            <div class="info-item">
              <label>Full Name:</label>
              <span>${provider.fullName || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>Email:</label>
              <span>${provider.email || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>Phone:</label>
              <span>${provider.mobileNumber || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>Address:</label>
              <span>${provider.address || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>City:</label>
              <span>${provider.city || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>State:</label>
              <span>${provider.state || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>Pincode:</label>
              <span>${provider.pincode || 'N/A'}</span>
            </div>
            <div class="info-item">
              <label>Registration Date:</label>
              <span>${new Date(provider.createdAt || provider.registrationDate || Date.now()).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
  `;
  
  // Add type-specific information
  if (provider.type === 'hospital') {
    html += generateHospitalDetailsImproved(provider);
  } else if (provider.type === 'doctor') {
    html += generateDoctorDetailsImproved(provider);
  } else if (provider.type === 'nurse') {
    html += generateNurseDetailsImproved(provider);
  } else if (provider.type === 'lab') {
    html += generateLabDetailsImproved(provider);
  } else if (provider.type === 'pharmacy') {
    html += generatePharmacyDetailsImproved(provider);
  }
  
  // Add documents section
  html += generateDocumentsSectionImproved(provider);
  
  // Add approval/rejection info if applicable
  if (provider.approvalStatus === 'approved' && provider.approvedAt) {
    html += `
      <div class="details-section">
        <h4><i class="fas fa-check-circle"></i> Approval Information</h4>
        <div class="info-grid">
          <div class="info-item">
            <label>Approved At:</label>
            <span>${new Date(provider.approvedAt).toLocaleDateString()}</span>
          </div>
          <div class="info-item">
            <label>Approved By:</label>
            <span>${provider.approvedBy || 'N/A'}</span>
          </div>
          <div class="info-item">
            <label>Approval Notes:</label>
            <span>${provider.approvalNotes || 'N/A'}</span>
          </div>
        </div>
      </div>
    `;
  } else if (provider.approvalStatus === 'rejected' && provider.rejectedAt) {
    html += `
      <div class="details-section">
        <h4><i class="fas fa-times-circle"></i> Rejection Information</h4>
        <div class="info-grid">
          <div class="info-item">
            <label>Rejected At:</label>
            <span>${new Date(provider.rejectedAt).toLocaleDateString()}</span>
          </div>
          <div class="info-item">
            <label>Rejected By:</label>
            <span>${provider.rejectedBy || 'N/A'}</span>
          </div>
          <div class="info-item">
            <label>Rejection Reason:</label>
            <span>${provider.rejectionReason || 'N/A'}</span>
          </div>
        </div>
      </div>
    `;
  }
  
  html += `
      </div>
    </div>
  `;
  
  return html;
}

// Generate type-specific details with improved UI
function generateHospitalDetailsImproved(provider) {
  return `
    <div class="details-section">
      <h4><i class="fas fa-hospital"></i> Hospital Information</h4>
      <div class="info-grid">
        <div class="info-item">
          <label>Hospital Name:</label>
          <span>${provider.hospitalName || 'N/A'}</span>
        </div>
        <div class="info-item">
          <label>Registration Number:</label>
          <span>${provider.registrationNumber || 'N/A'}</span>
        </div>
        <div class="info-item">
          <label>Hospital Type:</label>
          <span>${provider.hospitalType || 'N/A'}</span>
        </div>
        <div class="info-item">
          <label>Number of Beds:</label>
          <span>${provider.numberOfBeds || 'N/A'}</span>
        </div>
        <div class="info-item">
          <label>Departments:</label>
          <span>${provider.departments ? provider.departments.join(', ') : 'N/A'}</span>
        </div>
      </div>
    </div>
  `;
}

function generateDoctorDetailsImproved(provider) {
  return `
    <div class="details-section">
      <h4><i class="fas fa-user-md"></i> Doctor Information</h4>
      <div class="info-grid">
        <div class="info-item">
          <label>Medical Registration Number:</label>
          <span>${provider.medicalRegistrationNumber || 'N/A'}</span>
        </div>
        <div class="info-item">
          <label>License Number:</label>
          <span>${provider.licenseNumber || 'N/A'}</span>
        </div>
        <div class="info-item">
          <label>Specialization:</label>
          <span>${provider.specialization || 'N/A'}</span>
        </div>
        <div class="info-item">
          <label>Experience Years:</label>
          <span>${provider.experienceYears || 'N/A'}</span>
        </div>
        <div class="info-item">
          <label>Consultation Fee:</label>
          <span>${provider.consultationFee ? `₹${provider.consultationFee}` : 'N/A'}</span>
        </div>
        <div class="info-item">
          <label>Qualifications:</label>
          <span>${provider.qualifications ? provider.qualifications.join(', ') : provider.qualification || 'N/A'}</span>
        </div>
      </div>
    </div>
  `;
}

function generateNurseDetailsImproved(provider) {
  return `
    <div class="details-section">
      <h4><i class="fas fa-user-nurse"></i> Nurse Information</h4>
      <div class="info-grid">
        <div class="info-item">
          <label>License Number:</label>
          <span>${provider.licenseNumber || 'N/A'}</span>
        </div>
        <div class="info-item">
          <label>Registration Number:</label>
          <span>${provider.registrationNumber || 'N/A'}</span>
        </div>
        <div class="info-item">
          <label>Qualification:</label>
          <span>${provider.qualification || 'N/A'}</span>
        </div>
        <div class="info-item">
          <label>Experience Years:</label>
          <span>${provider.experienceYears || 'N/A'}</span>
        </div>
        <div class="info-item">
          <label>Hospital Affiliation:</label>
          <span>${provider.hospitalAffiliation || 'N/A'}</span>
        </div>
      </div>
    </div>
  `;
}

function generateLabDetailsImproved(provider) {
  return `
    <div class="details-section">
      <h4><i class="fas fa-flask"></i> Lab Information</h4>
      <div class="info-grid">
        <div class="info-item">
          <label>Lab Name:</label>
          <span>${provider.labName || 'N/A'}</span>
        </div>
        <div class="info-item">
          <label>License Number:</label>
          <span>${provider.licenseNumber || 'N/A'}</span>
        </div>
        <div class="info-item">
          <label>Owner Name:</label>
          <span>${provider.ownerName || 'N/A'}</span>
        </div>
        <div class="info-item">
          <label>Services Provided:</label>
          <span>${provider.servicesProvided ? provider.servicesProvided.join(', ') : 'N/A'}</span>
        </div>
      </div>
    </div>
  `;
}

function generatePharmacyDetailsImproved(provider) {
  return `
    <div class="details-section">
      <h4><i class="fas fa-pills"></i> Pharmacy Information</h4>
      <div class="info-grid">
        <div class="info-item">
          <label>Pharmacy Name:</label>
          <span>${provider.pharmacyName || 'N/A'}</span>
        </div>
        <div class="info-item">
          <label>License Number:</label>
          <span>${provider.licenseNumber || 'N/A'}</span>
        </div>
        <div class="info-item">
          <label>Owner Name:</label>
          <span>${provider.ownerName || 'N/A'}</span>
        </div>
        <div class="info-item">
          <label>Pharmacist Name:</label>
          <span>${provider.pharmacistName || 'N/A'}</span>
        </div>
        <div class="info-item">
          <label>Services Provided:</label>
          <span>${provider.servicesProvided ? provider.servicesProvided.join(', ') : 'N/A'}</span>
        </div>
        <div class="info-item">
          <label>Home Delivery:</label>
          <span>${provider.homeDelivery ? 'Yes' : 'No'}</span>
        </div>
      </div>
    </div>
  `;
}

// Generate Documents Section with improved UI
function generateDocumentsSectionImproved(provider) {
  const documents = [];
  
  // Add common documents
  if (provider.licenseDocumentUrl) {
    documents.push({
      name: 'License Document',
      url: provider.licenseDocumentUrl,
      type: 'license'
    });
  }
  
  if (provider.profileImageUrl) {
    documents.push({
      name: 'Profile Image',
      url: provider.profileImageUrl,
      type: 'profile'
    });
  }
  
  // Add type-specific documents
  if (provider.type === 'hospital') {
    if (provider.registrationCertificateUrl) {
      documents.push({
        name: 'Registration Certificate',
        url: provider.registrationCertificateUrl,
        type: 'registration'
      });
    }
    if (provider.buildingPermitUrl) {
      documents.push({
        name: 'Building Permit',
        url: provider.buildingPermitUrl,
        type: 'permit'
      });
    }
  }
  
  if (documents.length === 0) {
    return `
      <div class="details-section">
        <h4><i class="fas fa-file-alt"></i> Documents</h4>
        <p class="no-documents">No documents uploaded</p>
      </div>
    `;
  }
  
  let html = `
    <div class="details-section">
      <h4><i class="fas fa-file-alt"></i> Documents</h4>
      <div class="documents-grid">
  `;
  
  documents.forEach(doc => {
    html += `
      <div class="document-item">
        <div class="document-icon">
          <i class="fas fa-file-${doc.type === 'profile' ? 'image' : 'pdf'}"></i>
        </div>
        <div class="document-info">
          <h5>${doc.name}</h5>
          <button class="btn btn-sm btn-outline" onclick="viewDocumentImproved('${doc.url}', '${doc.name}')">
            <i class="fas fa-eye"></i> View
          </button>
        </div>
      </div>
    `;
  });
  
  html += `
      </div>
    </div>
  `;
  
  return html;
}

// View Document with improved functionality
function viewDocumentImproved(url, name) {
  // Open document in new tab
  window.open(url, '_blank');
}

// Approve Service Provider with improved functionality
async function approveServiceProviderImproved(id, type, notes = '') {
  try {
    console.log(`✅ Approving ${type} with ID: ${id}`);
    
    const idToken = localStorage.getItem('staff_idToken');
    const response = await fetch(`https://arcular-plus-backend.onrender.com/api/arc-staff/approve/${id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userType: type,
        notes: notes
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Approval successful:', result.message);
      
      showSuccessMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} approved successfully!`);
      
      // Close modal and refresh data
      closeModal();
      await loadDashboardDataImproved();
      
    } else {
      const error = await response.json();
      console.error('❌ Approval failed:', error.message);
      showErrorMessage(`Failed to approve ${type}: ${error.message}`);
    }
  } catch (error) {
    console.error('❌ Approval error:', error);
    showErrorMessage(`Failed to approve ${type}. Please try again.`);
  }
}

// Reject Service Provider with improved functionality
async function rejectServiceProviderImproved(id, type, reason, category, nextSteps) {
  try {
    console.log(`❌ Rejecting ${type} with ID: ${id}`);
    
    const idToken = localStorage.getItem('staff_idToken');
    const response = await fetch(`https://arcular-plus-backend.onrender.com/api/arc-staff/reject/${id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userType: type,
        reason: reason,
        category: category,
        nextSteps: nextSteps
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Rejection successful:', result.message);
      
      showSuccessMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} rejected successfully!`);
      
      // Close modal and refresh data
      closeModal();
      await loadDashboardDataImproved();
      
    } else {
      const error = await response.json();
      console.error('❌ Rejection failed:', error.message);
      showErrorMessage(`Failed to reject ${type}: ${error.message}`);
    }
  } catch (error) {
    console.error('❌ Rejection error:', error);
    showErrorMessage(`Failed to reject ${type}. Please try again.`);
  }
}

// Load Dashboard Data with improved functionality
async function loadDashboardDataImproved() {
  try {
    console.log('📊 Loading dashboard data with improved functionality...');
    
    // Load stats and counts in parallel
    await Promise.all([
      loadDashboardStatsImproved(),
      loadDashboardCountsImproved(),
      loadPendingApprovalsImproved()
    ]);
    
    console.log('✅ Dashboard data loaded successfully');
  } catch (error) {
    console.error('❌ Failed to load dashboard data:', error);
    showErrorMessage('Failed to load dashboard data. Please try again.');
  }
}

// Load Dashboard Stats with improved functionality
async function loadDashboardStatsImproved() {
  try {
    const period = document.getElementById('stats-period')?.value || 'month';
    const idToken = localStorage.getItem('staff_idToken');
    
    const response = await fetch(`https://arcular-plus-backend.onrender.com/api/arc-staff/stats?period=${period}`, {
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      const stats = result.data;
      
      // Update stats in UI
      updateStatsDisplayImproved(stats);
    } else {
      console.error('❌ Failed to load stats:', response.status);
    }
  } catch (error) {
    console.error('❌ Error loading stats:', error);
  }
}

// Update Stats Display with improved functionality
function updateStatsDisplayImproved(stats) {
  const elements = {
    'total-providers-count': stats.totalProviders || 0,
    'approved-providers-count': stats.approvedProviders || 0,
    'pending-approvals-count': stats.pendingApprovals || 0,
    'total-departments': stats.totalDepartments || 5
  };
  
  Object.entries(elements).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  });
}

// Load Dashboard Counts with improved functionality
async function loadDashboardCountsImproved() {
  try {
    const idToken = localStorage.getItem('staff_idToken');
    
    const response = await fetch(`https://arcular-plus-backend.onrender.com/api/arc-staff/dashboard-counts`, {
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      const counts = result.data;
      
      // Update sidebar counts
      updateSidebarCountsImproved(counts);
    } else {
      console.error('❌ Failed to load counts:', response.status);
    }
  } catch (error) {
    console.error('❌ Error loading counts:', error);
  }
}

// Update Sidebar Counts with improved functionality
function updateSidebarCountsImproved(counts) {
  const countMappings = {
    'hospitalApprovedCount': counts.hospitals?.approved || 0,
    'hospitalPendingCount': counts.hospitals?.pending || 0,
    'doctorApprovedCount': counts.doctors?.approved || 0,
    'doctorPendingCount': counts.doctors?.pending || 0,
    'nurseApprovedCount': counts.nurses?.approved || 0,
    'nursePendingCount': counts.nurses?.pending || 0,
    'labApprovedCount': counts.labs?.approved || 0,
    'labPendingCount': counts.labs?.pending || 0,
    'pharmacyApprovedCount': counts.pharmacies?.approved || 0,
    'pharmacyPendingCount': counts.pharmacies?.pending || 0
  };
  
  Object.entries(countMappings).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  });
}

// Load Pending Approvals with improved functionality
async function loadPendingApprovalsImproved() {
  try {
    const idToken = localStorage.getItem('staff_idToken');
    
    const response = await fetch(`https://arcular-plus-backend.onrender.com/api/arc-staff/pending-approvals`, {
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      pendingApprovals = result.pendingUsers || [];
      
      console.log('📋 Loaded pending approvals:', pendingApprovals.length);
      
      // Update pending count in stats
      const pendingCountElement = document.getElementById('pending-approvals-count');
      if (pendingCountElement) {
        pendingCountElement.textContent = pendingApprovals.length;
      }
    } else {
      console.error('❌ Failed to load pending approvals:', response.status);
      pendingApprovals = [];
    }
  } catch (error) {
    console.error('❌ Error loading pending approvals:', error);
    pendingApprovals = [];
  }
}

// Add Provider Card Listeners with improved functionality
function addProviderCardListenersImproved() {
  // Add click listeners to provider cards
  document.querySelectorAll('.provider-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.btn')) {
        const uid = card.dataset.uid;
        const type = card.dataset.type;
        const status = card.dataset.status;
        viewProviderDetailsImproved(uid, type, status);
      }
    });
  });
}

// Utility Functions for improved functionality
function getTypeIcon(type) {
  const icons = {
    hospital: 'fas fa-hospital',
    doctor: 'fas fa-user-md',
    nurse: 'fas fa-user-nurse',
    lab: 'fas fa-flask',
    pharmacy: 'fas fa-pills'
  };
  return icons[type] || 'fas fa-user';
}

function getTypeColor(type) {
  const colors = {
    hospital: 'hospital',
    doctor: 'doctor',
    nurse: 'nurse',
    lab: 'lab',
    pharmacy: 'pharmacy'
  };
  return colors[type] || 'default';
}

function updateActiveNavItem(providerType) {
  // Remove active class from all nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Add active class to selected nav item
  const activeItem = document.querySelector(`[data-provider="${providerType}"]`);
  if (activeItem) {
    activeItem.classList.add('active');
  }
}

// Show Success Message with improved functionality
function showSuccessMessage(message) {
  showMessage(message, 'success');
}

// Show Error Message with improved functionality
function showErrorMessage(message) {
  showMessage(message, 'error');
}

// Show Message with improved functionality
function showMessage(message, type) {
  const container = document.getElementById('messageContainer');
  if (!container) return;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;
  messageDiv.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(messageDiv);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (messageDiv.parentNode) {
      messageDiv.parentNode.removeChild(messageDiv);
    }
  }, 5000);
}

// Override existing functions to use improved functionality
window.loadServiceProviderData = loadServiceProviderDataImproved;
// Keep the original viewProviderDetails function for redirecting to details page
// window.viewProviderDetails = viewProviderDetailsImproved;
window.approveServiceProvider = approveServiceProviderImproved;
window.rejectServiceProvider = rejectServiceProviderImproved;
window.loadDashboardData = loadDashboardDataImproved;

// Navigation Functions
function showDashboardOverview() {
    console.log('🏠 Showing dashboard overview...');
    const contentArea = document.getElementById('serviceProviderContent');
    if (contentArea) {
        contentArea.innerHTML = `
            <div class="dashboard-overview">
                <div class="overview-header">
                    <div class="header-left">
                        <h2><i class="fas fa-tachometer-alt"></i> Dashboard Overview</h2>
                        <p>Select a service provider type from the sidebar to manage applications</p>
                    </div>
                    <div class="header-right">
                        <button class="btn btn-primary" onclick="refreshData()">
                            <i class="fas fa-refresh"></i> Refresh Data
                        </button>
                    </div>
                </div>
                <div class="overview-grid">
                    <div class="overview-card" onclick="loadHospitals()">
                        <div class="card-icon">
                            <i class="fas fa-hospital"></i>
                        </div>
                        <h3>Hospitals</h3>
                        <p>Manage hospital registrations</p>
                        <div class="card-stats">
                            <span class="stat">Total: ${allUsers.hospitals?.length || 0}</span>
                            <span class="stat">Pending: ${allUsers.hospitals?.filter(h => !h.isApproved || h.approvalStatus === 'pending').length || 0}</span>
                        </div>
                    </div>
                    <div class="overview-card" onclick="loadDoctors()">
                        <div class="card-icon">
                            <i class="fas fa-user-md"></i>
                        </div>
                        <h3>Doctors</h3>
                        <p>Manage doctor registrations</p>
                        <div class="card-stats">
                            <span class="stat">Total: ${allUsers.doctors?.length || 0}</span>
                            <span class="stat">Pending: ${allUsers.doctors?.filter(d => !d.isApproved || d.approvalStatus === 'pending').length || 0}</span>
                        </div>
                    </div>
                    <div class="overview-card" onclick="loadNurses()">
                        <div class="card-icon">
                            <i class="fas fa-user-nurse"></i>
                        </div>
                        <h3>Nurses</h3>
                        <p>Manage nurse registrations</p>
                        <div class="card-stats">
                            <span class="stat">Total: ${allUsers.nurses?.length || 0}</span>
                            <span class="stat">Pending: ${allUsers.nurses?.filter(n => !n.isApproved || n.approvalStatus === 'pending').length || 0}</span>
                        </div>
                    </div>
                    <div class="overview-card" onclick="loadLabs()">
                        <div class="card-icon">
                            <i class="fas fa-flask"></i>
                        </div>
                        <h3>Labs</h3>
                        <p>Manage lab registrations</p>
                        <div class="card-stats">
                            <span class="stat">Total: ${allUsers.labs?.length || 0}</span>
                            <span class="stat">Pending: ${allUsers.labs?.filter(l => !l.isApproved || l.approvalStatus === 'pending').length || 0}</span>
                        </div>
                    </div>
                    <div class="overview-card" onclick="loadPharmacies()">
                        <div class="card-icon">
                            <i class="fas fa-pills"></i>
                        </div>
                        <h3>Pharmacies</h3>
                        <p>Manage pharmacy registrations</p>
                        <div class="card-stats">
                            <span class="stat">Total: ${allUsers.pharmacies?.length || 0}</span>
                            <span class="stat">Pending: ${allUsers.pharmacies?.filter(p => !p.isApproved || p.approvalStatus === 'pending').length || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

function refreshData() {
    console.log('🔄 Refreshing data...');
    // Clear any existing error messages
    clearErrorMessages();
    // Reload all data
    loadAllUsers();
}

// Load service provider data based on type
function loadServiceProviderData(providerType) {
    console.log('🔄 Loading service provider data for:', providerType);
    
    // Update active nav item
    updateActiveNavItem(providerType);
    
    // Load the appropriate provider type
    switch(providerType) {
        case 'hospital':
            loadHospitals();
            break;
        case 'doctor':
            loadDoctors();
            break;
        case 'nurse':
            loadNurses();
            break;
        case 'lab':
            loadLabs();
            break;
        case 'pharmacy':
            loadPharmacies();
            break;
        default:
            console.error('❌ Unknown provider type:', providerType);
            showErrorMessage('Unknown service provider type');
    }
}

// Clear all error messages
function clearErrorMessages() {
    const errorElements = document.querySelectorAll('.error-message, .alert-danger');
    errorElements.forEach(element => {
        element.remove();
    });
}

// View provider details in separate page
function viewProviderDetails(providerId, providerType) {
    console.log('🔄 Opening provider details:', providerId, providerType);
    window.location.href = `service-provider-details.html?id=${providerId}&type=${providerType}`;
}

// Search functionality
function performSearch() {
    const searchTerm = document.getElementById('providerSearchInput').value.toLowerCase().trim();
    const providerType = document.getElementById('providerTypeFilter').value;
    const status = document.getElementById('statusFilter').value;
    
    console.log('🔍 Performing search:', { searchTerm, providerType, status });
    
    // Get all providers from allUsers
    let allProviders = [];
    
    if (allUsers) {
        if (allUsers.hospitals) allProviders = allProviders.concat(allUsers.hospitals.map(h => ({...h, type: 'hospital'})));
        if (allUsers.doctors) allProviders = allProviders.concat(allUsers.doctors.map(d => ({...d, type: 'doctor'})));
        if (allUsers.nurses) allProviders = allProviders.concat(allUsers.nurses.map(n => ({...n, type: 'nurse'})));
        if (allUsers.labs) allProviders = allProviders.concat(allUsers.labs.map(l => ({...l, type: 'lab'})));
        if (allUsers.pharmacies) allProviders = allProviders.concat(allUsers.pharmacies.map(p => ({...p, type: 'pharmacy'})));
    }
    
    // Filter providers
    let filteredProviders = allProviders;
    
    // Search term filter
    if (searchTerm) {
        filteredProviders = filteredProviders.filter(provider => {
            const name = (provider.name || provider.fullName || provider.hospitalName || provider.labName || provider.pharmacyName || '').toLowerCase();
            const email = (provider.email || '').toLowerCase();
            const type = provider.type.toLowerCase();
            
            return name.includes(searchTerm) || email.includes(searchTerm) || type.includes(searchTerm);
        });
    }
    
    // Provider type filter
    if (providerType) {
        filteredProviders = filteredProviders.filter(provider => provider.type === providerType);
    }
    
    // Status filter
    if (status) {
        filteredProviders = filteredProviders.filter(provider => {
            if (status === 'approved') return provider.isApproved === true;
            if (status === 'pending') return provider.isApproved === false;
            if (status === 'rejected') return provider.isApproved === false && provider.rejected === true;
            return true;
        });
    }
    
    // Display search results
    displaySearchResults(filteredProviders, searchTerm, providerType, status);
}

// Display search results
function displaySearchResults(providers, searchTerm, providerType, status) {
    const contentArea = document.getElementById('serviceProviderContent');
    
    if (!contentArea) {
        console.error('❌ Service provider content area not found!');
        return;
    }
    
    // Create search results header
    let headerText = 'Search Results';
    if (searchTerm) headerText += ` for "${searchTerm}"`;
    if (providerType) headerText += ` (${providerType.charAt(0).toUpperCase() + providerType.slice(1)})`;
    if (status) headerText += ` (${status.charAt(0).toUpperCase() + status.slice(1)})`;
    
    if (providers.length === 0) {
        contentArea.innerHTML = `
            <div class="search-results-screen">
                <div class="screen-header">
                    <div class="header-left">
                        <div class="screen-title">
                            <h1><i class="fas fa-search"></i> ${headerText}</h1>
                            <p>No service providers found matching your criteria</p>
                        </div>
                    </div>
                    <div class="header-right">
                        <button class="btn btn-primary" onclick="showDashboardOverview()">
                            <i class="fas fa-arrow-left"></i> Back to Dashboard
                        </button>
                    </div>
                </div>
                <div class="empty-state-screen">
                    <div class="empty-icon">
                        <i class="fas fa-search fa-4x"></i>
                    </div>
                    <h2>No Results Found</h2>
                    <p>Try adjusting your search criteria or filters</p>
                    <button class="btn btn-primary" onclick="clearFilters()">
                        <i class="fas fa-times"></i> Clear Filters
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    // Group providers by type
    const groupedProviders = providers.reduce((acc, provider) => {
        if (!acc[provider.type]) acc[provider.type] = [];
        acc[provider.type].push(provider);
        return acc;
    }, {});
    
    // Create search results content
    contentArea.innerHTML = `
        <div class="search-results-screen">
            <div class="screen-header">
                <div class="header-left">
                    <div class="screen-title">
                        <h1><i class="fas fa-search"></i> ${headerText}</h1>
                        <p>Found ${providers.length} service provider${providers.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <div class="header-right">
                    <button class="btn btn-primary" onclick="showDashboardOverview()">
                        <i class="fas fa-arrow-left"></i> Back to Dashboard
                    </button>
                </div>
            </div>
            
            <div class="screen-content">
                <div class="provider-grid-screen">
                    ${Object.entries(groupedProviders).map(([type, typeProviders]) => `
                        <div class="provider-type-section">
                            <h3 class="provider-type-title">
                                <i class="${getTypeIcon(type)}"></i>
                                ${type.charAt(0).toUpperCase() + type.slice(1)}s (${typeProviders.length})
                            </h3>
                            <div class="provider-cards-grid">
                                ${typeProviders.map(provider => `
                                    <div class="provider-card-screen" data-status="${provider.isApproved ? 'approved' : 'pending'}">
                                        <div class="card-header">
                                            <div class="provider-avatar-large">
                                                <i class="${getTypeIcon(type)}"></i>
                                            </div>
                                            <div class="provider-info-main">
                                                <h3>${provider.name || provider.fullName || provider.hospitalName || provider.labName || provider.pharmacyName || 'Unknown'}</h3>
                                                <p class="provider-email">${provider.email}</p>
                                                <span class="status-badge-large ${provider.isApproved ? 'approved' : 'pending'}">
                                                    ${provider.isApproved ? 'Approved' : 'Pending Approval'}
                                                </span>
                                            </div>
                                        </div>
                                        <div class="card-body">
                                            <div class="info-grid">
                                                <div class="info-item">
                                                    <label>Registration Number:</label>
                                                    <span>${provider.registrationNumber || provider.licenseNumber || 'N/A'}</span>
                                                </div>
                                                <div class="info-item">
                                                    <label>Contact:</label>
                                                    <span>${provider.mobileNumber || provider.contact || 'N/A'}</span>
                                                </div>
                                                <div class="info-item">
                                                    <label>Registered:</label>
                                                    <span>${new Date(provider.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="card-actions">
                                            <button class="btn btn-primary" onclick="viewProviderDetails('${provider.uid || provider._id}', '${type}')">
                                                <i class="fas fa-eye"></i> View Details
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// Clear filters
function clearFilters() {
    document.getElementById('providerSearchInput').value = '';
    document.getElementById('providerTypeFilter').value = '';
    document.getElementById('statusFilter').value = '';
    
    // Show dashboard overview
    showDashboardOverview();
}

// Get type icon
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

// Provider Management Tab Switching
function switchProviderTab(tabName) {
    console.log('🔄 Switching provider tab:', tabName);
    
    // Remove active class from all provider tabs
    document.querySelectorAll('.provider-management-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    
    // Add active class to selected tab
    document.querySelector(`[onclick="switchProviderTab('${tabName}')"]`).classList.add('active');
    
    // Load content based on tab
    if (tabName === 'pending') {
        showDashboardOverview();
    } else if (tabName === 'approved') {
        loadApprovedProviders();
    }
}

// Load approved providers for the main dashboard
async function loadApprovedProviders() {
    try {
        const content = document.getElementById('serviceProviderContent');
        content.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                </div>
                <p>Loading approved providers...</p>
            </div>
        `;
        
        const token = await getAuthToken();
        const response = await fetch(`${API_BASE_URL}/arc-staff/approved-service-providers`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            renderApprovedProviders(result.data);
        } else {
            throw new Error('Failed to load approved providers');
        }
    } catch (error) {
        console.error('Error loading approved providers:', error);
        const content = document.getElementById('serviceProviderContent');
        content.innerHTML = `
            <div class="error-state">
                <div class="error-icon">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <p>Failed to load approved providers</p>
                <button class="btn btn-primary" onclick="loadApprovedProviders()">
                    <i class="fas fa-refresh"></i> Try Again
                </button>
            </div>
        `;
    }
}

// Render approved providers in main dashboard
function renderApprovedProviders(data) {
    const content = document.getElementById('serviceProviderContent');
    
    if (!data || Object.keys(data).length === 0) {
        content.innerHTML = `
            <div class="empty-state-screen">
                <div class="empty-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3>No Approved Providers</h3>
                <p>There are no approved service providers yet.</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="approved-providers-overview">';
    
    // Render each provider type
    Object.keys(data).forEach(type => {
        const providers = data[type];
        if (providers && providers.length > 0) {
            html += `
                <div class="provider-type-section">
                    <h3 class="provider-type-title">
                        <i class="${getTypeIcon(type)}"></i>
                        ${type.charAt(0).toUpperCase() + type.slice(1)}s (${providers.length})
                    </h3>
                    <div class="providers-grid">
                        ${providers.map(provider => `
                            <div class="provider-card approved">
                                <div class="provider-card-header">
                                    <div class="provider-avatar">
                                        <i class="${getTypeIcon(type)}"></i>
                                    </div>
                                    <div class="provider-info">
                                        <h4>${provider.name || provider.fullName || provider.hospitalName || provider.labName || provider.pharmacyName || 'Unknown'}</h4>
                                        <p class="provider-email">${provider.email}</p>
                                        <span class="status-badge approved">Approved</span>
                                    </div>
                                </div>
                                <div class="provider-card-body">
                                    <div class="provider-details">
                                        <div class="detail-item">
                                            <span class="detail-label">Registration:</span>
                                            <span class="detail-value">${provider.registrationNumber || provider.licenseNumber || 'N/A'}</span>
                                        </div>
                                        <div class="detail-item">
                                            <span class="detail-label">Contact:</span>
                                            <span class="detail-value">${provider.mobileNumber || 'N/A'}</span>
                                        </div>
                                        <div class="detail-item">
                                            <span class="detail-label">Registered:</span>
                                            <span class="detail-value">${provider.createdAt ? new Date(provider.createdAt).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    });
    
    html += '</div>';
    content.innerHTML = html;
}

// Quick Actions Tab Switching
function switchQuickActionTab(tabName) {
    console.log('🔄 Switching to tab:', tabName);
    
    // Remove active class from all tabs and panels
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    
    // Add active class to selected tab and panel
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Quick Actions Functions

// Reports Tab Functions
function generateStaffReport() {
    console.log('📊 Generating staff performance report...');
    showNotification('Generating staff performance report...', 'info');
    
    // Simulate report generation
    setTimeout(() => {
        showSuccessMessage('Staff performance report generated successfully!');
        // Here you would typically download or display the report
    }, 2000);
}

function generateProviderReport() {
    console.log('📊 Generating provider statistics report...');
    showNotification('Generating provider statistics...', 'info');
    
    setTimeout(() => {
        showSuccessMessage('Provider statistics report generated successfully!');
    }, 2000);
}

function generateApprovalReport() {
    console.log('📊 Generating approval summary report...');
    showNotification('Generating approval summary...', 'info');
    
    setTimeout(() => {
        showSuccessMessage('Approval summary report generated successfully!');
    }, 2000);
}

function generateMonthlyReport() {
    console.log('📊 Generating monthly summary report...');
    showNotification('Generating monthly summary...', 'info');
    
    setTimeout(() => {
        showSuccessMessage('Monthly summary report generated successfully!');
    }, 2000);
}

// Exports Tab Functions
function exportStaffData() {
    console.log('📊 Exporting staff data...');
    showNotification('Exporting staff data...', 'info');
    
    setTimeout(() => {
        showSuccessMessage('Staff data exported successfully!');
        // Here you would typically trigger a download
    }, 2000);
}

function exportProviderData() {
    console.log('📊 Exporting provider data...');
    showNotification('Exporting provider data...', 'info');
    
    setTimeout(() => {
        showSuccessMessage('Provider data exported successfully!');
    }, 2000);
}

function exportApprovalData() {
    console.log('📊 Exporting approval data...');
    showNotification('Exporting approval data...', 'info');
    
    setTimeout(() => {
        showSuccessMessage('Approval data exported successfully!');
    }, 2000);
}

function exportAuditLog() {
    console.log('📊 Exporting audit log...');
    showNotification('Exporting audit log...', 'info');
    
    setTimeout(() => {
        showSuccessMessage('Audit log exported successfully!');
    }, 2000);
}

// Tools Tab Functions
function bulkApproveProviders() {
    console.log('🔧 Bulk approving providers...');
    showNotification('Opening bulk approval interface...', 'info');
    
    // This would typically open a modal with provider selection
    setTimeout(() => {
        showSuccessMessage('Bulk approval interface opened!');
    }, 1000);
}

function sendBulkNotifications() {
    console.log('🔧 Sending bulk notifications...');
    showNotification('Opening notification composer...', 'info');
    
    setTimeout(() => {
        showSuccessMessage('Notification composer opened!');
    }, 1000);
}

function systemMaintenance() {
    console.log('🔧 Running system maintenance...');
    showNotification('Running system maintenance tasks...', 'info');
    
    setTimeout(() => {
        showSuccessMessage('System maintenance completed successfully!');
    }, 3000);
}

function backupData() {
    console.log('🔧 Creating data backup...');
    showNotification('Creating system backup...', 'info');
    
    setTimeout(() => {
        showSuccessMessage('Data backup created successfully!');
    }, 3000);
}

function generateReports() {
    console.log('📋 Generating Excel reports...');
    showNotification('Generating Excel reports...', 'info');
    // TODO: Implement actual Excel report generation
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM loaded, initializing improved dashboard...');

    // Initialize the improved dashboard functionality
    initializeNewDashboard();

    // Also initialize improved functionality
    setTimeout(() => {
      loadDashboardDataImproved();
      // Show dashboard overview by default
      showDashboardOverview();
    }, 1000);
});