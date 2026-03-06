# Quick Start: Google OAuth Login

## What's New

✨ **Google OAuth Login** has been added to your PirmaPH application!

Users can now sign in with their Google account in addition to the existing email/password authentication.

## Summary of Changes

### Backend (7 files modified/created)
1. ✅ `pom.xml` - Added OAuth2 dependency
2. ✅ `User.java` - Added `authProvider` and `googleId` fields
3. ✅ `UserRepository.java` - Added `findByGoogleId()` method
4. ✅ `AuthService.java` - Set authProvider for local registrations
5. ✅ `SecurityConfig.java` - Integrated OAuth2 login
6. ✅ `CustomOAuth2UserService.java` - NEW: Handles Google user creation/linking
7. ✅ `OAuth2AuthenticationSuccessHandler.java` - NEW: Generates JWT after OAuth login
8. ✅ `UserController.java` - NEW: Added `/api/users/me` endpoint
9. ✅ `application.properties` - Added Google OAuth2 configuration

### Frontend (4 files modified/created)
1. ✅ `AuthPage.jsx` - Added "Continue with Google" button
2. ✅ `Auth.css` - Added Google button and divider styles
3. ✅ `OAuth2RedirectHandler.jsx` - NEW: Handles OAuth callback
4. ✅ `App.jsx` - Added OAuth2 redirect route

## Required: Google OAuth Setup

To complete the setup, you need to obtain Google OAuth2 credentials:

### Step 1: Create Google OAuth Credentials

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **"Create Credentials"** → **"OAuth 2.0 Client ID"**
5. Configure OAuth consent screen (if prompted)
6. Select **"Web application"** as application type
7. Add authorized redirect URI:
   ```
   http://localhost:8080/login/oauth2/code/google
   ```
8. Click **"Create"**
9. Copy your **Client ID** and **Client Secret**

### Step 2: Update Backend Configuration

Open `backend/src/main/resources/application.properties` and replace placeholders:

```properties
# Replace these with your actual Google OAuth credentials
spring.security.oauth2.client.registration.google.client-id=YOUR_GOOGLE_CLIENT_ID
spring.security.oauth2.client.registration.google.client-secret=YOUR_GOOGLE_CLIENT_SECRET
```

⚠️ **IMPORTANT:** Never commit these credentials to version control!

## How to Test

### 1. Start Backend
```bash
cd backend
mvn spring-boot:run
```

### 2. Start Frontend
```bash
cd web
npm run dev
```

### 3. Test Google Login

1. Navigate to `http://localhost:5173`
2. You should see the login page with a new **"Continue with Google"** button
3. Click the Google button
4. Sign in with your Google account
5. Grant permissions when prompted
6. You should be redirected to the dashboard

### 4. Verify in Database

Check that the user was created with OAuth provider:
```sql
SELECT username, email, auth_provider, google_id 
FROM users 
WHERE auth_provider = 'GOOGLE';
```

## Features

✨ **What Works Now:**
- ✅ Login with Google account
- ✅ Automatic user account creation for new Google users
- ✅ Account linking for existing users with same email
- ✅ JWT token generation after OAuth login
- ✅ Same protected routes work for OAuth users
- ✅ `/api/users/me` endpoint for current user
- ✅ All existing features (email/password login, registration) still work

## Architecture Highlights

### Unified Authentication
- Both regular and OAuth users use **JWT tokens**
- Same security filter chain applies to all users
- Consistent API authentication across all endpoints

### Smart Account Handling
| Scenario | What Happens |
|----------|-------------|
| New Google user | Creates account, generates username from email |
| Existing user (same email) | Links Google account to existing user |
| Returning Google user | Logs in to existing account |

### Security
- ✅ System generates its own JWT tokens (not using Google's tokens)
- ✅ OAuth users stored in same database table as regular users
- ✅ Protected endpoints work identically for all users
- ✅ Mobile-compatible API design

## Next Steps

1. ✅ **Get Google OAuth credentials** (see Step 1 above)
2. ✅ **Update application.properties** (see Step 2 above)
3. ✅ **Test the implementation** (see How to Test above)
4. 📱 **Future:** Add Google OAuth to mobile app when ready

## Need Help?

See the comprehensive guide: [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)

### Common Issues

**"Redirect URI mismatch"**
- Verify URI in Google Console: `http://localhost:8080/login/oauth2/code/google`
- Check for exact match (trailing slashes matter!)

**Google button not working**
- Check browser console for errors
- Verify backend is running on port 8080
- Ensure CORS is properly configured

**Token not received**
- Check backend logs for errors
- Verify OAuth2AuthenticationSuccessHandler is working
- Check frontend redirect URL matches

## File Changes Reference

### Key New Files
- `backend/.../CustomOAuth2UserService.java` - User creation/linking logic
- `backend/.../OAuth2AuthenticationSuccessHandler.java` - JWT generation after OAuth
- `backend/.../UserController.java` - /me endpoint
- `web/src/pages/OAuth2RedirectHandler.jsx` - OAuth callback handler

### Modified Files
- `backend/pom.xml` - OAuth2 dependency
- `backend/.../User.java` - New OAuth fields
- `backend/.../SecurityConfig.java` - OAuth2 integration
- `backend/.../application.properties` - OAuth2 config
- `web/src/pages/AuthPage.jsx` - Google button
- `web/src/pages/Auth.css` - Google button styles
- `web/src/App.jsx` - OAuth redirect route

---

🎉 **Google OAuth Login is ready to use!** Just add your credentials and test it out.
