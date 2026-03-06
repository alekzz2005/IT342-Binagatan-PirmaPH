# PirmaPH - Testing Guide

## Prerequisites

Before testing, ensure you have:

1. **Java 17 or higher** installed
2. **MySQL 8.0+** installed and running
3. **Node.js 16+** and npm installed
4. **Git** installed (optional but recommended)

## Step 1: Setup MySQL Database

### Option A: Manual Database Creation

```sql
CREATE DATABASE IF NOT EXISTS pirmaPH_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Option B: Auto-Creation (Recommended)

The application will automatically create the database when it starts (configured in `application.properties`).

## Step 2: Install Frontend Dependencies

Navigate to the web folder and install dependencies:

```powershell
cd web
npm install
```

This will install:
- React 19.2.0
- React Router DOM 7.5.0
- Vite 7.3.1
- ESLint and plugins

## Step 3: Start the Backend Server

### From the backend directory:

**Using Maven Wrapper (Recommended):**

```powershell
cd ..\backend
.\mvnw.cmd spring-boot:run
```

**Using Maven (if installed locally):**

```powershell
mvn spring-boot:run
```

### Backend should start on:
- **URL:** http://localhost:8080
- **API Base:** http://localhost:8080/api/auth

### Expected Console Output:
```
Started PirmaphApplication in X.XXX seconds
```

### Check Backend Health:
Open browser and visit: http://localhost:8080/api/auth/health (if health endpoint exists)

## Step 4: Start the Frontend Server

### In a new terminal, navigate to web directory:

```powershell
cd web
npm run dev
```

### Frontend should start on:
- **URL:** http://localhost:5173
- **Dev Server:** Vite

### Expected Console Output:
```
VITE vX.X.X  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

## Step 5: Test User Registration

1. Open browser and go to: **http://localhost:5173**
2. You should see the **Login/Register** page with two tabs
3. Click on the **"REGISTER"** tab

### Fill out the registration form:

| Field | Example Value |
|-------|---------------|
| Username | juandelacruz |
| Email | juan.delacruz@email.com |
| Password | SecurePass123! |
| Confirm Password | SecurePass123! |
| First Name | Juan |
| Middle Name | Santos |
| Last Name | Dela Cruz |
| Birth Date | 1990-05-15 |
| Sex | Male |
| Phone Number | 09171234567 |
| Street | 123 Rizal Street |
| Barangay | (Select from dropdown) |
| Municipality/City | (Select from dropdown) |
| Province | (Select from dropdown) |
| ZIP Code | 1000 |
| Role | RESIDENT |

4. Click **"Create Account"**

### Expected Result:
- ✅ Success message appears
- ✅ Automatically logged in
- ✅ Redirected to **/dashboard**
- ✅ Dashboard shows your name and user data
- ✅ Philippine flag banner displays greeting

### Check Backend Console:
```
Hibernate: insert into user (barangay, birth_date, city, created_at, email, first_name, last_name, middle_name, password_hash, phone_number, province, role, sex, street, updated_at, username, zip_code, id) values (...)
```

### Check Browser Developer Tools:
- **localStorage** should contain:
  - `token`: JWT token string
  - `user`: JSON object with user data

## Step 6: Test User Logout

1. On the **Dashboard**, find the **sidebar**
2. Scroll to bottom and click **"Logout"** button

### Expected Result:
- ✅ Redirected to **login page** (/)
- ✅ localStorage cleared (token and user removed)
- ✅ Cannot access /dashboard without login

## Step 7: Test User Login

1. On the **Login/Register** page, ensure **"LOGIN"** tab is active
2. Fill in credentials:
   - **Email:** juan.delacruz@email.com
   - **Password:** SecurePass123!
3. Click **"Sign In"**

### Expected Result:
- ✅ Success message or auto-redirect
- ✅ JWT token stored in localStorage
- ✅ Redirected to **/dashboard**
- ✅ Dashboard displays user information
- ✅ Stats cards show data
- ✅ Recent requests list visible
- ✅ Announcements panel visible

## Step 8: Test Protected Routes

### Test 1: Direct Dashboard Access (Logged Out)

1. Logout if logged in
2. Manually navigate to: **http://localhost:5173/dashboard**

### Expected Result:
- ✅ Automatically redirected to **/** (login page)
- ✅ Dashboard NOT accessible

### Test 2: Direct Dashboard Access (Logged In)

1. Login successfully
2. Manually navigate to: **http://localhost:5173/dashboard**

### Expected Result:
- ✅ Dashboard loads successfully
- ✅ User data displays correctly

### Test 3: Root Path Redirect (Logged In)

1. While logged in, navigate to: **http://localhost:5173/**

### Expected Result:
- ✅ Automatically redirected to **/dashboard**
- ✅ Login page NOT shown

## Step 9: Test Form Validations

### Registration Validations to Test:

| Test Case | Input | Expected Error |
|-----------|-------|----------------|
| Empty fields | Leave username blank | "Username is required" |
| Invalid email | Enter "notanemail" | "Email is invalid" |
| Weak password | Enter "123" | "Password must be at least 8 characters" |
| Password mismatch | password ≠ confirmPassword | "Passwords do not match" |
| Duplicate username | Register with existing username | "Username already exists" |
| Duplicate email | Register with existing email | "Email already exists" |
| Invalid phone | Enter letters in phone | "Phone number must be valid" |
| Past date validation | Birth date in future | Error from backend |

### Login Validations to Test:

| Test Case | Input | Expected Error |
|-----------|-------|----------------|
| Wrong password | Correct email, wrong password | "Invalid email or password" |
| Wrong email | Non-existent email | "Invalid email or password" |
| Empty fields | Leave fields blank | "Email is required" / "Password is required" |

## Step 10: Test Location Dropdowns

The location dropdowns use the **PSGC Cloud API** for Philippine locations.

### Test Cascade:

1. Open Registration form
2. Select **Province** → Should populate **Municipality/City** dropdown
3. Select **Municipality/City** → Should populate **Barangay** dropdown
4. All three should work in cascade

### Expected Behavior:
- ✅ Dropdowns populate dynamically
- ✅ Dependent dropdowns reset when parent changes
- ✅ All Philippine provinces, cities, and barangays available

### If dropdowns don't populate:
- Check browser **Console** for API errors
- Verify internet connection (PSGC Cloud API is external)
- Check Network tab in DevTools

## Step 11: Visual/UI Testing

### Login/Register Page Checklist:
- ✅ Left panel is blue with Philippine flag colors
- ✅ Right panel is white with form
- ✅ Tab switcher works (Login ↔ Register)
- ✅ Form inputs have proper styling
- ✅ Buttons have hover effects
- ✅ Responsive on mobile (≤768px - single column)
- ✅ Font: "Source Sans 3" used throughout

### Dashboard Page Checklist:
- ✅ Fixed sidebar (260px width) with blue background
- ✅ Sidebar shows user avatar with initials
- ✅ Navigation items highlighted on hover
- ✅ Philippine flag banner with greeting ("Good morning/afternoon/evening")
- ✅ 4 stats cards with colored top borders (blue, gold, green, red)
- ✅ Recent requests list with status badges
- ✅ Announcements panel with priority badges
- ✅ Header sticky at top with breadcrumb and notification bell
- ✅ Responsive breakpoints at 1200px and 768px

## Step 12: Database Verification

### Connect to MySQL and verify data:

```sql
USE pirmaPH_db;

-- Check if users table exists
SHOW TABLES;

-- View user records
SELECT id, username, email, first_name, last_name, role, created_at FROM user;

-- Verify password is hashed (BCrypt)
SELECT username, password_hash FROM user;
```

### Expected:
- ✅ `user` table exists
- ✅ Registered users appear in table
- ✅ Passwords are **hashed** (starts with $2a$ or $2b$)
- ✅ UUIDs used for `id` column
- ✅ Timestamps auto-populated

## Step 13: JWT Token Verification

### Inspect JWT Token:

1. Login to application
2. Open **Browser DevTools** → **Application** tab → **Local Storage**
3. Find `token` key
4. Copy the token value
5. Go to: **https://jwt.io**
6. Paste token in "Encoded" section

### Expected Decoded Payload:
```json
{
  "userId": "uuid-here",
  "role": "RESIDENT",
  "iat": 1234567890,
  "exp": 1234654290
}
```

### Verify:
- ✅ `userId` matches database UUID
- ✅ `role` is correct (RESIDENT or OFFICER)
- ✅ Token expiration is 24 hours from issuance

## Step 14: API Testing (Optional)

### Using the test-api.http file:

1. Open `backend/test-api.http` in VS Code
2. Install **REST Client** extension
3. Click "Send Request" above each HTTP request

### Test Endpoints:

**Register:**
```http
POST http://localhost:8080/api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "SecurePass123!",
  ...
}
```

**Login:**
```http
POST http://localhost:8080/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "SecurePass123!"
}
```

### Expected Responses:
- **201 Created** for successful registration
- **200 OK** for successful login
- **400 Bad Request** for validation errors
- **409 Conflict** for duplicate username/email

## Troubleshooting

### Backend Issues:

**Problem:** Port 8080 already in use
```
***************************
APPLICATION FAILED TO START
***************************

Web server failed to start. Port 8080 was already in use.
```

**Solution:**
- Stop other applications using port 8080
- Or change port in `application.properties`: `server.port=8081`

---

**Problem:** MySQL connection failed
```
Could not open JDBC Connection for transaction
```

**Solution:**
- Verify MySQL is running: `mysql -u root -p`
- Check credentials in `application.properties`
- Ensure database exists: `CREATE DATABASE pirmaPH_db;`

---

### Frontend Issues:

**Problem:** Cannot find module 'react-router-dom'
```
Error: Cannot find module 'react-router-dom'
```

**Solution:**
```powershell
cd web
npm install react-router-dom
```

---

**Problem:** Port 5173 already in use

**Solution:**
- Vite will automatically try next port (5174, 5175...)
- Or specify port: `npm run dev -- --port 3000`

---

**Problem:** Network errors (CORS)
```
Access to fetch at 'http://localhost:8080/api/auth/register' from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Solution:**
- Ensure backend is running
- Check CORS configuration in `SecurityConfig.java`
- Verify `allowedOrigins` includes frontend URL

---

**Problem:** Location dropdowns empty

**Solution:**
- Check internet connection (PSGC Cloud API is external)
- Open DevTools Console for errors
- Verify `locationService.js` is correctly imported

---

## Success Criteria

Your application is fully functional when:

- ✅ Backend starts without errors
- ✅ Frontend starts on http://localhost:5173
- ✅ User can register with all required fields
- ✅ Passwords are hashed in database (BCrypt)
- ✅ User can login with email/password
- ✅ JWT token is generated and stored
- ✅ Dashboard is accessible after login
- ✅ Dashboard shows user information correctly
- ✅ Logout clears authentication and redirects
- ✅ Protected routes block unauthenticated access
- ✅ Form validations work on frontend and backend
- ✅ Location dropdowns cascade correctly
- ✅ UI matches provided layout designs
- ✅ Responsive design works on mobile

## Next Steps

After successful testing:

1. **Add CVE Scanning** - Check for dependency vulnerabilities
2. **Generate Unit Tests** - Use test generation tools
3. **Deploy to Production** - Configure production database and build frontend
4. **Add More Features** - Document requests, announcements, officer tools
5. **Implement Email Verification** - Add email confirmation on registration
6. **Add Password Reset** - Implement forgot password flow
7. **Role-Based Features** - Different UI for RESIDENT vs OFFICER roles

---

**Need Help?** Refer to:
- [API_DOCUMENTATION.md](backend/API_DOCUMENTATION.md) - API reference
- [SETUP_GUIDE.md](backend/SETUP_GUIDE.md) - Detailed setup instructions
- [IMPLEMENTATION_SUMMARY.md](backend/IMPLEMENTATION_SUMMARY.md) - Project overview
