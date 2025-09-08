## Arcular+ Web Apps – Overview and Backend Flow

This document explains how the Arcular+ web apps (Arc Staff UI and Admin UI) work end‑to‑end with the Node.js backend, plus how to run, configure, and extend them. Image placeholders are included so you can add screenshots later.

---

### 1) High‑Level Architecture

- Client: Static web apps served from `Arcular-Pluse-Webpage/`
  - `ARCstaff/` – Arc Staff dashboard (approve providers, search, quick actions, profile settings)
  - (Admin dashboard is served from the backend’s public folder; flows are documented below)
- Backend: Node.js/Express API in `node_backend/`
  - Auth: Firebase Admin SDK verifies ID tokens
  - Database: MongoDB via Mongoose
  - Storage: Firebase Storage (document URLs)
  - Email: Nodemailer for approval/rejection/notifications

> PLACEHOLDER: Add system diagram screenshot here
> `docs/images/system-diagram.png`

---

### 2) Roles and Apps

- Admin: reviews staff profile changes and oversees metrics
- Arc Staff: manages provider registrations; approves/rejects; submits profile changes for admin approval

> PLACEHOLDERS:
> - `docs/images/arcstaff-dashboard.png`
> - `docs/images/admin-dashboard.png`

---

### 3) Key Flows

#### 3.1 Authentication
- Frontend stores Firebase ID token (e.g., `localStorage`)
- Every API request sends `Authorization: Bearer <idToken>`
- Backend middleware verifies token with Firebase Admin SDK

#### 3.2 Service Provider Lifecycle
- Collections: `Hospital`, `Doctor`, `Nurse`, `Lab`, `Pharmacy`
- Pending if `isApproved !== true`; Approved if `isApproved === true`
- Details: `GET /api/arc-staff/service-provider/:type/:uid` (matches `uid | id | _id`)
- Approve: `POST /api/arc-staff/approve/:userId { userType }`
- Reject:  `POST /api/arc-staff/reject/:userId { userType, reason }`

> PLACEHOLDER: `docs/images/provider-details.png`

#### 3.3 Arc Staff Profile Change Approval
- Staff: `POST /api/arc-staff/profile-changes`
- Admin: `GET /api/admin/profile-changes`; approve/reject endpoints

> PLACEHOLDERS:
> - `docs/images/staff-settings.png`
> - `docs/images/admin-review.png`

#### 3.4 Search and Filters
- Realtime: `GET /api/arc-staff/search-approved-providers?q=...&providerType=...&status=...`
- Local fallback filters `allUsers` and also matches ARC ID/UID.

#### 3.5 Platform Overview & Period Filters
- Tries backend stats; falls back to local computed counts
- Periods: `today`, `week`, `month` via `/api/arc-staff/stats?period=...` (optional)

#### 3.6 Quick Actions (Arc Staff)
- Generate Reports (XLS): workbook with one sheet per provider type
- Generate Report: summary counts workbook
- Export Staff Data: snapshot export (XLS/CSV‑compatible)

> PLACEHOLDER: `docs/images/quick-actions.png`

---

### 4) Backend – Main Endpoints

Arc Staff (`/api/arc-staff`):
- `GET /profile`, `POST /profile-changes`
- `GET /approved-service-providers`
- `GET /service-provider/:type/:uid`
- `POST /approve/:userId`, `POST /reject/:userId`
- `GET /search-approved-providers`
- `GET /dashboard-counts`, `GET /stats?period=today|week|month`

Admin (`/api/admin`):
- `GET /profile-changes`, `POST /profile-changes/:id/approve`, `POST /profile-changes/:id/reject`

---

### 5) Data Model (Simplified)
- Providers: `uid`, `email`, `mobileNumber`, `name`, `isApproved`, `approvalStatus`, `createdAt`, docs URLs
- ProfileChanges: `uid`, proposed fields, `status`, timestamps, reviewer info

---

### 6) Repository Layout

```
Arcular-Pluse-Webpage/
  ARCstaff/
    arcstaff-dashboard.html
    arcstaff.css
    script.js
  README.md
node_backend/
  controllers/
  models/
  routes/
  services/
  server.js / app.js
```

> PLACEHOLDER: `docs/images/folder-structure.png`

---

### 7) Running Locally
1) Backend
```
cd node_backend
cp .env.example .env   # set env vars
npm install
npm start
```
2) Frontend (static)
```
Open Arcular-Pluse-Webpage/ARCstaff/arcstaff-dashboard.html in a static server
Ensure API_BASE_URL in ARCstaff/script.js points to backend URL
```

---

### 8) Backend .env
```
PORT=8080
MONGODB_URI=mongodb+srv://...
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=no-reply@example.com
EMAIL_PASS=your_smtp_password
BASE_URL=https://your-backend.example.com
```

---

### 9) Screenshot Placeholders
Create files in `Arcular-Pluse-Webpage/docs/images/` with the names referenced above.

---

© Arcular+
