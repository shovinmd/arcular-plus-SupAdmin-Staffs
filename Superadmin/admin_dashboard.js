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

function openPlatformSettingsModal() {
  document.getElementById('platform-settings-modal').style.display = 'block';
  loadAdminProfile();
}

function viewSystemStatus() {
  showSuccessMessage('System status monitoring will be available in the next update.');
}

function exportStaffData() {
  showSuccessMessage('Exporting staff data...');
  exportStaffDataToCSV();
}

function generateStaffReport() {
  showSuccessMessage('Generating staff report...');
  generateStaffReportDetailed();
}

// Export staff data to CSV
async function exportStaffDataToCSV() {
  try {
    const user = firebase.auth().currentUser;
    const freshToken = await user.getIdToken();
    
    // Fetch staff data
    const response = await fetch('https://arcular-plus-backend.onrender.com/admin/api/admin/staff', {
      headers: { 'Authorization': `Bearer ${freshToken}` }
    });
    
    if (response.ok) {
      const staffList = await response.json();
      
      // Convert to CSV
      const csvContent = convertStaffToCSV(staffList);
      
      // Download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `staff_data_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showSuccessMessage('Staff data exported successfully!');
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } else {
      throw new Error('Failed to fetch staff data');
    }
    
  } catch (error) {
    console.error('Error exporting staff data:', error);
    showErrorMessage('Failed to export staff data: ' + error.message);
  }
}

// Convert staff data to CSV format
function convertStaffToCSV(staffList) {
  const headers = ['Name', 'Email', 'Role', 'Department', 'Status', 'Created At', 'Phone', 'Designation'];
  
  const csvRows = [headers.join(',')];
  
  staffList.forEach(staff => {
    const row = [
      staff.fullName || 'N/A',
      staff.email || 'N/A',
      staff.role || 'N/A',
      staff.department || 'N/A',
      staff.status || 'Active',
      staff.createdAt ? new Date(staff.createdAt).toLocaleDateString() : 'N/A',
      staff.mobileNumber || 'N/A',
      staff.designation || 'N/A'
    ].map(field => `"${field}"`).join(',');
    
    csvRows.push(row);
  });
  
  return csvRows.join('\n');
}

// Generate detailed staff report
async function generateStaffReportDetailed() {
  try {
    const user = firebase.auth().currentUser;
    const freshToken = await user.getIdToken();
    
    // Fetch staff data
    const response = await fetch('https://arcular-plus-backend.onrender.com/admin/api/admin/staff', {
      headers: { 'Authorization': `Bearer ${freshToken}` }
    });
    
    if (response.ok) {
      const staffList = await response.json();
      
      // Generate comprehensive report
      const reportContent = generateComprehensiveStaffReport(staffList);
      
      // Download report
      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `comprehensive_staff_report_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showSuccessMessage('Comprehensive staff report generated successfully!');
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } else {
      throw new Error('Failed to fetch staff data');
    }
    
  } catch (error) {
    console.error('Error generating staff report:', error);
    showErrorMessage('Failed to generate staff report: ' + error.message);
  }
}

// Generate comprehensive staff report content
function generateComprehensiveStaffReport(staffList) {
  const now = new Date();
  
  let report = `
    COMPREHENSIVE STAFF REPORT
    Generated: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}
    ================================================================
    
    EXECUTIVE SUMMARY:
    =================
    Total Staff Members: ${staffList.length}
    Active Staff: ${staffList.filter(s => s.status === 'active').length}
    Pending Approvals: ${staffList.filter(s => s.status === 'pending').length}
    Inactive Staff: ${staffList.filter(s => s.status === 'inactive').length}
    
    DEPARTMENT BREAKDOWN:
    ===================
  `;
  
  // Group by department
  const departmentGroups = {};
  staffList.forEach(staff => {
    const dept = staff.department || 'Unassigned';
    if (!departmentGroups[dept]) {
      departmentGroups[dept] = [];
    }
    departmentGroups[dept].push(staff);
  });
  
  Object.keys(departmentGroups).forEach(dept => {
    const staffInDept = departmentGroups[dept];
    report += `
    ${dept}: ${staffInDept.length} staff members
    `;
  });
  
  report += `
    
    ROLE DISTRIBUTION:
    =================
  `;
  
  // Group by role
  const roleGroups = {};
  staffList.forEach(staff => {
    const role = staff.role || 'Unassigned';
    if (!roleGroups[role]) {
      roleGroups[role] = [];
    }
    roleGroups[role].push(staff);
  });
  
  Object.keys(roleGroups).forEach(role => {
    const staffInRole = roleGroups[role];
    report += `
    ${role}: ${staffInRole.length} staff members
    `;
  });
  
  report += `
    
    DETAILED STAFF LISTING:
    ======================
  `;
  
  staffList.forEach((staff, index) => {
    report += `
    ${index + 1}. ${staff.fullName || 'N/A'}
       Email: ${staff.email || 'N/A'}
       Role: ${staff.role || 'N/A'}
       Department: ${staff.department || 'N/A'}
       Status: ${staff.status || 'Active'}
       Created: ${staff.createdAt ? new Date(staff.createdAt).toLocaleDateString() : 'N/A'}
       Phone: ${staff.mobileNumber || 'N/A'}
       Designation: ${staff.designation || 'N/A'}
    `;
  });
  
  report += `
    
    RECOMMENDATIONS:
    ================
    - Monitor staff performance metrics
    - Review pending approvals regularly
    - Ensure proper role distribution
    - Maintain department balance
    
    Report generated by Arcular+ Admin Dashboard
    ===========================================
  `;
  
  return report;
}

function generateReports() {
  showSuccessMessage('Generating comprehensive reports...');
  
  // Show report options modal
  const reportOptions = `
    <div class="report-options-modal">
      <h3>Generate Reports</h3>
      <div class="report-type-selection">
        <div class="report-option">
          <input type="radio" id="staff-report" name="report-type" value="staff" checked>
          <label for="staff-report">Staff Report</label>
        </div>
        <div class="report-option">
          <input type="radio" id="department-report" name="report-type" value="department">
          <label for="department-report">Department Report</label>
        </div>
        <div class="report-option">
          <input type="radio" id="activity-report" name="report-type" value="activity">
          <label for="activity-report">Activity Report</label>
        </div>
      </div>
      
             <div class="report-format-selection">
         <h4>Format:</h4>
         <div class="format-option">
           <input type="radio" id="xls-format" name="report-format" value="xls" checked>
           <label for="xls-format">XLS (Excel Spreadsheet)</label>
         </div>
       </div>
      
      <div class="report-date-range">
        <h4>Date Range:</h4>
        <select id="report-date-range">
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month" selected>This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="year">This Year</option>
          <option value="custom">Custom Range</option>
        </select>
      </div>
      
      <div class="report-actions">
        <button onclick="generateSelectedReport()" class="btn btn-primary">Generate Report</button>
        <button onclick="closeReportModal()" class="btn btn-secondary">Cancel</button>
      </div>
    </div>
  `;
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'block';
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
      ${reportOptions}
    </div>
  `;
  
  document.body.appendChild(modal);
}

function generateSelectedReport() {
  const reportType = document.querySelector('input[name="report-type"]:checked').value;
  const dateRange = document.getElementById('report-date-range').value;
  
  showSuccessMessage(`Generating ${reportType} report in XLS format...`);
  
  // Generate the actual report (always XLS format)
  generateReport(reportType, 'xls', dateRange);
  
  // Close modal
  document.querySelector('.modal').remove();
}

function closeReportModal() {
  document.querySelector('.modal').remove();
}

async function generateReport(type, format, dateRange) {
  try {
    const user = firebase.auth().currentUser;
    const freshToken = await user.getIdToken();
    
    // Call backend API to generate report
    const response = await fetch('https://arcular-plus-backend.onrender.com/admin/api/admin/generate-report', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${freshToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reportType: type,
        format: 'xls', // Always use XLS format
        dateRange: dateRange
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      
      if (result.downloadUrl) {
        // Download the generated report
        downloadReport(result.downloadUrl, `${type}_report_${new Date().toISOString().split('T')[0]}.xls`);
        showSuccessMessage('Report generated and downloaded successfully!');
      } else {
        showErrorMessage('Report generated but download URL not provided');
      }
    } else {
      throw new Error('Failed to generate report');
    }
    
  } catch (error) {
    console.error('Error generating report:', error);
    showErrorMessage('Failed to generate report: ' + error.message);
    
    // Fallback: Generate mock report for demonstration
    generateMockReport(type, 'xls', dateRange);
  }
}

function generateMockReport(type, format, dateRange) {
  showSuccessMessage('Generating XLS report...');
  
  // Create mock report content
  let reportContent = '';
  let fileName = '';
  
  switch (type) {
    case 'staff':
      reportContent = generateStaffReportContent();
      fileName = `staff_report_${new Date().toISOString().split('T')[0]}`;
      break;
    case 'department':
      reportContent = generateDepartmentReportContent();
      fileName = `department_report_${new Date().toISOString().split('T')[0]}`;
      break;
    case 'activity':
      reportContent = generateActivityReportContent();
      fileName = `activity_report_${new Date().toISOString().split('T')[0]}`;
      break;
  }
  
  // Always generate XLS format
  generateXLS(reportContent, fileName);
}

function generateStaffReportContent() {
  const totalStaff = document.getElementById('total-staff-count').textContent;
  const activeStaff = document.getElementById('active-staff-count').textContent;
  const pendingApprovals = document.getElementById('pending-approvals-count').textContent;
  const totalDepartments = document.getElementById('total-departments').textContent;
  
  return `
    STAFF REPORT
    ============
    Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
    
    EXECUTIVE SUMMARY
    =================
    Total Staff Members: ${totalStaff}
    Active Staff: ${activeStaff}
    Pending Approvals: ${pendingApprovals}
    Total Departments: ${totalDepartments}
    
    STAFF OVERVIEW
    ==============
    This comprehensive report provides detailed insights into the organization's
    human resources structure, including staff distribution across departments,
    role assignments, and current operational status.
    
    KEY METRICS
    ===========
    • Staff Utilization: ${activeStaff}/${totalStaff} (${totalStaff > 0 ? Math.round((activeStaff/totalStaff)*100) : 0}%)
    • Approval Rate: ${pendingApprovals} pending approvals
    • Department Coverage: ${totalDepartments} active departments
    
    RECOMMENDATIONS
    ===============
    1. Monitor staff performance metrics regularly
    2. Review pending approvals within 48 hours
    3. Ensure proper role distribution across departments
    4. Maintain optimal staff-to-department ratios
    
    Report generated by Arcular+ Admin Dashboard
    ===========================================
  `;
}

function generateDepartmentReportContent() {
  const totalDepartments = document.getElementById('total-departments').textContent;
  const totalStaff = document.getElementById('total-staff-count').textContent;
  
  return `
    DEPARTMENT REPORT
    =================
    Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
    
    DEPARTMENT OVERVIEW
    ==================
    Total Departments: ${totalDepartments}
    Total Staff Members: ${totalStaff}
    Average Staff per Department: ${totalDepartments > 0 ? Math.round(totalStaff/totalDepartments) : 0}
    
    DEPARTMENT STRUCTURE
    ===================
    • ARC Staff Department: Core administrative operations
    • Patient Supervisor Department: Patient support and assistance
    • Backend Manager Department: Technical infrastructure management
    • Super Admin Department: Executive oversight and control
    
    OPERATIONAL METRICS
    ==================
    • Department Efficiency: Based on staff productivity and response times
    • Resource Allocation: Optimal distribution of staff across departments
    • Cross-Department Collaboration: Inter-departmental communication metrics
    • Performance Benchmarks: Department-specific KPIs and targets
    
    STRATEGIC INSIGHTS
    =================
    1. Department scalability assessment
    2. Resource optimization opportunities
    3. Cross-training and skill development needs
    4. Performance improvement recommendations
    
    Report generated by Arcular+ Admin Dashboard
    ===========================================
  `;
}

function generateActivityReportContent() {
  const totalStaff = document.getElementById('total-staff-count').textContent;
  const activeStaff = document.getElementById('active-staff-count').textContent;
  
  return `
    ACTIVITY REPORT
    ===============
    Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
    
    ACTIVITY OVERVIEW
    ================
    This report tracks all system activities, user interactions, and operational
    metrics to provide insights into platform usage and performance.
    
    RECENT ACTIVITIES
    ================
    • Staff Profile Updates: Real-time profile modifications and approvals
    • New Staff Registrations: Onboarding and account creation activities
    • Department Changes: Organizational structure modifications
    • System Access Logs: Authentication and authorization tracking
    • Report Generation: Document creation and download activities
    
    PERFORMANCE INDICATORS
    =====================
    • System Response Time: Average API response latency
    • User Activity Rate: Daily active users and session duration
    • Task Completion Rate: Success rate of administrative operations
    • System Uptime: Platform availability and reliability metrics
    • Error Rate: System errors and resolution times
    
    OPERATIONAL INSIGHTS
    ===================
    • Peak Usage Times: Identify high-traffic periods
    • User Behavior Patterns: Common workflows and preferences
    • System Bottlenecks: Performance optimization opportunities
    • Security Metrics: Access patterns and threat detection
    
    RECOMMENDATIONS
    ===============
    1. Monitor system performance during peak hours
    2. Implement automated activity reporting
    3. Set up proactive performance alerts
    4. Regular system health assessments
    
    Report generated by Arcular+ Admin Dashboard
    ===========================================
  `;
}

// PDF generation removed - only DOC format supported

function generateXLS(content, fileName) {
  try {
    // Convert content to CSV format that Excel can open
    const lines = content.split('\n');
    const csvContent = lines.map(line => {
      // Split by common delimiters and wrap in quotes if needed
      if (line.includes(':')) {
        const parts = line.split(':');
        if (parts.length === 2) {
          return `"${parts[0].trim()}","${parts[1].trim()}"`;
        }
      }
      // For section headers, make them stand out
      if (line.includes('===') || line.includes('==')) {
        return `"${line.replace(/=/g, '').trim()}",""`;
      }
      // For regular content
      return `"${line.trim()}",""`;
    }).join('\n');
    
    // Add CSV headers for better Excel compatibility
    const csvHeaders = 'Field,Value\n';
    const fullCsvContent = csvHeaders + csvContent;
    
    // Create CSV blob with proper MIME type for Excel
    const blob = new Blob([fullCsvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Download as .xls file (Excel will open CSV files)
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    showSuccessMessage('XLS report generated successfully! (Can be opened in Microsoft Excel)');
    
  } catch (error) {
    console.error('Error generating XLS:', error);
    // Fallback to text file if CSV generation fails
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    downloadReport(url, `${fileName}.txt`);
    showSuccessMessage('Report generated as text file (can be opened in Excel)');
  }
}

function downloadReport(url, fileName) {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

function managePlatformSettings() {
  openPlatformSettingsModal();
}

// Load admin profile data
async function loadAdminProfile() {
  try {
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    const freshToken = await user.getIdToken();
    
    // Try the admin profile endpoint first (GET method)
    let response = await fetch(`https://arcular-plus-backend.onrender.com/admin/api/admin/profile/${user.uid}`, {
      headers: {
        'Authorization': `Bearer ${freshToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    // If that fails, try the staff profile endpoint
    if (!response.ok) {
      console.log('Admin profile endpoint failed, trying staff profile endpoint...');
      response = await fetch(`https://arcular-plus-backend.onrender.com/staff/api/staff/profile/${user.uid}`, {
        headers: {
          'Authorization': `Bearer ${freshToken}`,
          'Content-Type': 'application/json'
        }
      });
    }
    
    if (response.ok) {
      const profileData = await response.json();
      if (profileData.data) {
        // Populate form fields
        document.getElementById('admin-full-name').value = profileData.data.fullName || '';
        document.getElementById('admin-phone').value = profileData.data.mobileNumber || profileData.data.phone || '';
        document.getElementById('admin-department').value = profileData.data.department || '';
        document.getElementById('admin-designation').value = profileData.data.designation || '';
        document.getElementById('admin-address').value = profileData.data.address || '';
        document.getElementById('admin-bio').value = profileData.data.bio || '';
      }
    } else {
      console.log('Profile not found, using default values');
      // Set default values if profile doesn't exist
      document.getElementById('admin-full-name').value = user.displayName || user.email.split('@')[0] || '';
      document.getElementById('admin-phone').value = '';
      document.getElementById('admin-department').value = 'Administration';
      document.getElementById('admin-designation').value = 'Super Admin';
      document.getElementById('admin-address').value = '';
      document.getElementById('admin-bio').value = '';
    }
  } catch (error) {
    console.error('Error loading admin profile:', error);
    // Set default values on error
    const user = firebase.auth().currentUser;
    if (user) {
      document.getElementById('admin-full-name').value = user.displayName || user.email.split('@')[0] || '';
      document.getElementById('admin-phone').value = '';
      document.getElementById('admin-department').value = 'Administration';
      document.getElementById('admin-designation').value = 'Super Admin';
      document.getElementById('admin-address').value = '';
      document.getElementById('admin-bio').value = '';
    }
  }
}

// Save admin profile changes
async function saveAdminProfile(formData) {
  try {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('User not authenticated');
    
    const freshToken = await user.getIdToken();
    
    // Try the admin profile endpoint first (POST method as per backend)
    let response = await fetch(`https://arcular-plus-backend.onrender.com/admin/api/admin/profile`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${freshToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uid: user.uid,
        email: user.email,
        ...formData
      })
    });
    
    // If that fails, try the staff profile endpoint
    if (!response.ok) {
      console.log('Admin profile endpoint failed, trying staff profile endpoint...');
      response = await fetch(`https://arcular-plus-backend.onrender.com/staff/api/staff/profile/${user.uid}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${freshToken}`,
          'Content-Type': 'application/json'
        }
      });
    }
    
    if (response.ok) {
      const result = await response.json();
      showSuccessMessage('Profile updated successfully!');
      
      // Update display
      if (formData.fullName) {
        document.getElementById('admin-name').textContent = formData.fullName;
        document.getElementById('welcome-admin-name').textContent = formData.fullName;
      }
      
      return result;
    } else {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update profile');
    }
  } catch (error) {
    console.error('Error updating admin profile:', error);
    throw error;
  }
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
  async function setupDashboard() {
    const user = firebase.auth().currentUser;
    if (user) {
      // Set default values
      document.getElementById('admin-name').textContent = user.displayName || user.email;
      document.getElementById('welcome-admin-name').textContent = user.displayName || user.email.split('@')[0];
      
      // Setup profile changes refresh
      setupProfileChangesRefresh();
      document.getElementById('admin-email').textContent = user.email;
      
             // Load admin profile from backend
       try {
         const freshToken = await user.getIdToken();
         
                   // Try admin profile endpoint first (GET method)
          let response = await fetch(`https://arcular-plus-backend.onrender.com/admin/api/admin/profile/${user.uid}`, {
            headers: {
              'Authorization': `Bearer ${freshToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          // If that fails, try staff profile endpoint
          if (!response.ok) {
            console.log('Admin profile endpoint failed, trying staff profile endpoint...');
            response = await fetch(`https://arcular-plus-backend.onrender.com/staff/api/staff/profile/${user.uid}`, {
              headers: {
                'Authorization': `Bearer ${freshToken}`,
                'Content-Type': 'application/json'
              }
            });
          }
         
         if (response.ok) {
           const profileData = await response.json();
           if (profileData.data && profileData.data.fullName) {
             document.getElementById('admin-name').textContent = profileData.data.fullName;
             document.getElementById('welcome-admin-name').textContent = profileData.data.fullName;
           }
         }
       } catch (error) {
         console.error('Error loading admin profile:', error);
       }
    }
    
    // Update current date/time
    updateCurrentDateTime();
    
    // Setup refresh functionality
    setupRefreshButton();
    
    // Setup stats filter
    setupStatsFilter();
    
    // Setup platform settings modal
    setupPlatformSettingsModal();
    
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

    // Setup stats period filter
    function setupStatsFilter() {
      const statsPeriodSelect = document.getElementById('stats-period');
      if (statsPeriodSelect) {
        statsPeriodSelect.addEventListener('change', async function() {
          try {
            const freshToken = await firebase.auth().currentUser.getIdToken();
            await loadDashboardStats(freshToken);
            showSuccessMessage('Stats updated for selected period!');
          } catch (error) {
            console.error('Stats filter error:', error);
            showErrorMessage('Failed to update stats');
          }
        });
      }
    }

    // Setup platform settings modal
    function setupPlatformSettingsModal() {
      const modal = document.getElementById('platform-settings-modal');
      const closeBtn = document.getElementById('close-platform-settings-modal');
      const cancelBtn = document.getElementById('cancel-platform-settings-btn');
      const form = document.getElementById('platform-settings-form');
      
      // Close modal
      closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
      });
      
      // Cancel button
      cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
      });
      
      // Close modal when clicking outside
      window.addEventListener('click', (event) => {
        if (event.target === modal) {
          modal.style.display = 'none';
        }
      });
      
      // Handle form submission
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('save-platform-settings-btn');
        submitBtn.textContent = 'Saving...';
        submitBtn.disabled = true;
        
        try {
          const formData = {
            fullName: document.getElementById('admin-full-name').value,
            phone: document.getElementById('admin-phone').value,
            department: document.getElementById('admin-department').value,
            designation: document.getElementById('admin-designation').value,
            address: document.getElementById('admin-address').value,
            bio: document.getElementById('admin-bio').value
          };
          
          await saveAdminProfile(formData);
          modal.style.display = 'none';
          
        } catch (error) {
          showErrorMessage('Error updating profile: ' + error.message);
        } finally {
          submitBtn.textContent = 'Save Changes';
          submitBtn.disabled = false;
        }
      });
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
        
        // Get selected period filter
        const periodFilter = document.getElementById('stats-period').value;
        let filteredStaffList = staffList;
        
        // Apply period filter
        if (periodFilter === 'today') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          filteredStaffList = staffList.filter(staff => {
            const staffDate = new Date(staff.createdAt);
            return staffDate >= today;
          });
        } else if (periodFilter === 'week') {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          filteredStaffList = staffList.filter(staff => {
            const staffDate = new Date(staff.createdAt);
            return staffDate >= weekAgo;
          });
        }
        // 'month' filter shows all data (default)
        
        document.getElementById('total-staff-count').textContent = filteredStaffList.length || 0;
        document.getElementById('active-staff-count').textContent = 
          filteredStaffList.filter(staff => staff.status === 'active').length || 0;
        document.getElementById('pending-approvals-count').textContent = 
          filteredStaffList.filter(staff => staff.status === 'pending').length || 0;
        
        // Calculate unique departments
        const departments = [...new Set(filteredStaffList.map(staff => staff.department).filter(Boolean))];
        document.getElementById('total-departments').textContent = departments.length || 0;
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  // Setup refresh button for pending profile changes
  function setupProfileChangesRefresh() {
    const refreshBtn = document.getElementById('refresh-changes');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        try {
          const token = await firebase.auth().currentUser.getIdToken();
          await loadPendingProfileChanges(token);
          showSuccessMessage('Profile changes refreshed');
        } catch (error) {
          console.error('Error refreshing profile changes:', error);
          showErrorMessage('Failed to refresh profile changes');
        }
      });
    }
  }

  // Load pending profile changes from staff
async function loadPendingProfileChanges(token) {
  try {
    console.log('Loading pending profile changes...');
    
    const response = await fetch(`https://arcular-plus-backend.onrender.com/api/admin/profile-changes`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Pending profile changes loaded:', data);
      console.log('Number of pending changes:', data.pendingChanges ? data.pendingChanges.length : 0);
      renderPendingProfileChanges(data.pendingChanges || []);
    } else {
      console.log('Profile changes endpoint error:', response.status, response.statusText);
      const errorText = await response.text();
      console.log('Error response:', errorText);
      renderPendingProfileChanges([]);
    }
  } catch (error) {
    console.error('Error loading pending profile changes:', error);
    renderPendingProfileChanges([]);
  }
}

  // Render pending profile changes in the UI
  function renderPendingProfileChanges(changes) {
    const changesContainer = document.getElementById('pending-changes-list');
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
          <div class="change-staff-name">${change.fullName || 'Unknown Staff'}</div>
          <div class="change-details">
            <div class="change-field">
              <strong>Full Name:</strong> ${change.fullName || 'N/A'}
            </div>
            <div class="change-field">
              <strong>Phone Number:</strong> ${change.mobileNumber || 'N/A'}
            </div>
            <div class="change-field">
              <strong>Department:</strong> ${change.department || 'N/A'}
            </div>
            <div class="change-field">
              <strong>Address:</strong> ${change.address || 'N/A'}
            </div>
            <div class="change-field">
              <strong>Bio:</strong> ${change.bio || 'N/A'}
            </div>
          </div>
          <div class="change-submitted">
            Submitted: ${new Date(change.submittedAt).toLocaleDateString()}
          </div>
        </div>
        <div class="change-actions">
          <button class="change-approve-btn" onclick="handleApproveProfileChange('${change._id}')">
            <i class="fas fa-check"></i> Approve
          </button>
          <button class="change-reject-btn" onclick="handleRejectProfileChange('${change._id}')">
            <i class="fas fa-times"></i> Reject
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

      const response = await fetch(`https://arcular-plus-backend.onrender.com/api/admin/profile-changes/${changeId}/approve`, {
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

      const response = await fetch(`https://arcular-plus-backend.onrender.com/api/admin/profile-changes/${changeId}/reject`, {
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
