# PirmaPH - Quick Start Guide

**Get your application running in 5 minutes!**

---

## Prerequisites Check

Before starting, verify you have:

```powershell
# Check Java version (need 17+)
java -version

# Check Node.js version (need 16+)
node --version

# Check npm version
npm --version

# Check MySQL is running
mysql --version
```

If any command fails, install the missing tool first.

---

## 🚀 Quick Start (5 Steps)

### Step 1: Install Frontend Dependencies (2 minutes)

Open PowerShell in the project root:

```powershell
cd web
npm install
```

**Expected output:**
```
added 200+ packages in 45s
```

### Step 2: Start the Backend (1 minute)

Open a **NEW PowerShell window** (keep the first one open):

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

**Wait for this message:**
```
Started PirmaphApplication in 5.234 seconds
```

✅ Backend is now running on **http://localhost:8080**

**Keep this window open!**

### Step 3: Start the Frontend (30 seconds)

Go back to your **first PowerShell window** (in the `web` folder):

```powershell
npm run dev
```

**Expected output:**
```
VITE v7.3.1  ready in 523 ms

➜  Local:   http://localhost:5173/
➜  press h + enter to show help
```

✅ Frontend is now running on **http://localhost:5173**

**Keep both windows open!**

### Step 4: Open in Browser (10 seconds)

Open your browser and go to:

**http://localhost:5173**

You should see the **PirmaPH Login/Register page** with:
- Blue left panel with "PirmaPH" branding
- White right panel with login form
- Two tabs: "LOGIN" and "REGISTER"

### Step 5: Register Your First User (1 minute)

1. Click the **"REGISTER"** tab

2. Fill in the form:
   - **Username:** testuser
   - **Email:** test@example.com
   - **Password:** Test123456!
   - **Confirm Password:** Test123456!
   - **First Name:** Juan
   - **Middle Name:** Santos
   - **Last Name:** Dela Cruz
   - **Birth Date:** 1990-05-15
   - **Sex:** Male
   - **Phone Number:** 09171234567
   - **Street:** 123 Rizal Street
   - **Province:** (Select any province from dropdown)
   - **Municipality/City:** (Select any city from dropdown - wait for dropdown to populate)
   - **Barangay:** (Select any barangay from dropdown - wait for dropdown to populate)
   - **ZIP Code:** 1000
   - **Role:** Resident

3. Click **"Create Account"**

4. You should be **automatically logged in** and redirected to the **Dashboard**!

✅ **Success!** You should now see:
- Dashboard with Philippine flag colors
- Your name in the sidebar
- Stats cards (Total, Pending, Approved, Rejected Requests)
- Recent requests list
- Announcements panel

---

## ✅ Verification

### Quick Checks:

1. **Backend is running:**
   - PowerShell window shows "Started PirmaphApplication"
   - No red error messages

2. **Frontend is running:**
   - PowerShell window shows "Local: http://localhost:5173"
   - No red error messages

3. **Database created:**
   Open MySQL and check:
   ```sql
   SHOW DATABASES;
   USE pirmaPH_db;
   SHOW TABLES;
   SELECT * FROM user;
   ```
   You should see your registered user in the `user` table.

4. **JWT Token stored:**
   - Open browser **DevTools** (F12)
   - Go to **Application** → **Local Storage** → **http://localhost:5173**
   - You should see:
     - `token`: A long string (JWT)
     - `user`: JSON object with your data

---

## 🧪 Quick Tests

### Test 1: Logout and Login Again

1. Click **"Logout"** button in the bottom-left sidebar
2. You should be redirected to the login page
3. Enter your email and password:
   - **Email:** test@example.com
   - **Password:** Test123456!
4. Click **"Sign In"**
5. You should be back on the dashboard

✅ **Login works!**

### Test 2: Protected Route

1. Logout if logged in
2. Manually type in browser: `http://localhost:5173/dashboard`
3. Press Enter

✅ **You should be automatically redirected to the login page** (dashboard is protected)

### Test 3: Register Another User

1. Go to register page
2. Try to register with the same email: `test@example.com`
3. You should see error: **"Email already exists"**

✅ **Duplicate validation works!**

---

## 📱 Test Responsive Design

### Desktop View:
- Resize browser to full width
- You should see 4 stat cards in a row
- Sidebar fixed on the left

### Tablet View:
- Resize browser to ~900px width
- Stat cards should show 2 per row
- Sidebar still visible

### Mobile View:
- Resize browser to ~500px width
- Stat cards should stack vertically
- All content visible

---

## 🛑 Troubleshooting

### Backend won't start:

**Error:** "Port 8080 already in use"

**Solution:**
```powershell
# Find process using port 8080
netstat -ano | findstr :8080

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

---

**Error:** "Could not connect to MySQL"

**Solution:**
1. Make sure MySQL is running
2. Check credentials in `backend/src/main/resources/application.properties`
3. Create database manually:
   ```sql
   CREATE DATABASE pirmaPH_db;
   ```

---

### Frontend won't start:

**Error:** "Cannot find module 'react-router-dom'"

**Solution:**
```powershell
cd web
npm install react-router-dom
```

---

**Error:** "Port 5173 already in use"

**Solution:**
- Vite will automatically use next available port (5174, 5175...)
- Check the console output for actual port number

---

### Login/Register not working:

**Check:**
1. Backend is running (check PowerShell window)
2. Open browser DevTools → **Network** tab
3. Try to login/register
4. Look for failed requests in Network tab
5. Click on failed request to see error details

**Common issue:** CORS error
- Solution: Ensure backend `SecurityConfig.java` has `http://localhost:5173` in `allowedOrigins`

---

### Location dropdowns empty:

**Check:**
1. Internet connection (PSGC Cloud API is external)
2. Browser Console for errors (F12 → Console tab)
3. Network tab for failed API calls

---

## 📖 Next Steps

Now that your app is running:

1. **Read Full Documentation:**
   - [PROJECT_STATUS.md](PROJECT_STATUS.md) - Project overview
   - [TESTING_GUIDE.md](TESTING_GUIDE.md) - Detailed testing
   - [API_DOCUMENTATION.md](backend/API_DOCUMENTATION.md) - API reference
   - [FRONTEND_IMPLEMENTATION.md](FRONTEND_IMPLEMENTATION.md) - Frontend details

2. **Test All Features:**
   Follow the complete [TESTING_GUIDE.md](TESTING_GUIDE.md) for thorough testing

3. **Customize:**
   - Change colors in CSS files
   - Update branding and text
   - Add new features

4. **Deploy:**
   - Build for production: `npm run build`
   - Deploy frontend to Vercel/Netlify
   - Deploy backend to cloud provider

---

## 🎉 Success!

You now have a fully functional authentication system with:

✅ User registration  
✅ User login  
✅ JWT authentication  
✅ Protected dashboard  
✅ Beautiful Philippine-themed UI  
✅ Responsive design  

**Happy coding! 🚀**

---

## Need Help?

- Check [TESTING_GUIDE.md](TESTING_GUIDE.md) for detailed tests
- Review [PROJECT_STATUS.md](PROJECT_STATUS.md) for complete status
- Check browser Console (F12) for errors
- Verify both PowerShell windows are still running

---

**Project:** PirmaPH - Barangay Digital Services  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
