# Google OAuth Login Implementation Guide

## Overview
This document explains the Google OAuth Login feature that has been integrated into the PirmaPH authentication system. This feature allows users to sign in using their Google account while maintaining the existing JWT-based authentication system.

## Features Implemented

### Backend Changes

1. **OAuth2 Dependencies** (`pom.xml`)
   - Added `spring-boot-starter-oauth2-client` dependency for OAuth2 support

2. **User Entity Updates** (`User.java`)
   - Added `authProvider` field to track authentication method ("LOCAL" or "GOOGLE")
   - Added `googleId` field to store Google OAuth user ID
   - Made several fields nullable to accommodate OAuth users who may not provide complete profile information initially
   - Added getters and setters for new fields

3. **User Repository** (`UserRepository.java`)
   - Added `findByGoogleId()` method to find users by their Google ID

4. **OAuth2 Configuration** (`application.properties`)
   - Added Google OAuth2 client configuration
   - Configured OAuth2 endpoints and scopes

5. **Custom OAuth2 User Service** (`CustomOAuth2UserService.java`)
   - Handles user creation and linking after successful Google authentication
   - Checks if user exists by Google ID
   - Links Google account to existing email if found
   - Creates new user account if no existing account found
   - Generates unique username from email
   - Sets default role as RESIDENT

6. **OAuth2 Success Handler** (`OAuth2AuthenticationSuccessHandler.java`)
   - Generates JWT token after successful Google authentication
   - Redirects to frontend with token as query parameter
   - Maintains unified JWT authentication architecture

7. **Security Configuration Updates** (`SecurityConfig.java`)
   - Integrated OAuth2 login flow with existing JWT authentication
   - Added OAuth2 endpoints to permitted URLs
   - Configured custom OAuth2 user service and success handler

8. **User Controller** (`UserController.java`)
   - Added `/api/users/me` endpoint to retrieve currently authenticated user
   - Works with both regular and OAuth-authenticated users

### Frontend Changes

1. **AuthPage Updates** (`AuthPage.jsx`)
   - Added "Continue with Google" button on login form
   - Added `handleGoogleLogin()` function to redirect to OAuth2 endpoint
   - Button styled with Google branding and icon

2. **OAuth2 Redirect Handler** (`OAuth2RedirectHandler.jsx`)
   - New component to handle OAuth2 callback
   - Extracts token from URL query parameters
   - Stores token in localStorage
   - Fetches user data using token
   - Redirects to dashboard upon successful authentication

3. **Routing Updates** (`App.jsx`)
   - Added `/oauth2/redirect` route for OAuth2 callback handling

4. **Styling** (`Auth.css`)
   - Added styles for Google button with hover effects
   - Added divider component styles (OR separator)
   - Maintained consistent design with existing UI

## Setup Instructions

### 1. Create Google OAuth2 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Navigate to "Credentials" in the APIs & Services section
5. Click "Create Credentials" → "OAuth 2.0 Client ID"
6. Configure OAuth consent screen if not already done
7. Choose "Web application" as application type
8. Add authorized redirect URIs:
   - `http://localhost:8080/login/oauth2/code/google` (for local development)
   - Add production URLs when deploying
9. Copy the Client ID and Client Secret

### 2. Configure Backend

Update `backend/src/main/resources/application.properties` with your Google OAuth2 credentials:

```properties
# Replace with your actual credentials
spring.security.oauth2.client.registration.google.client-id=YOUR_GOOGLE_CLIENT_ID
spring.security.oauth2.client.registration.google.client-secret=YOUR_GOOGLE_CLIENT_SECRET
```

**IMPORTANT:** 
- Never commit actual credentials to version control
- Use environment variables in production
- Keep the client secret secure

### 3. Update Frontend Configuration (if needed)

If deploying to production, update the OAuth2 redirect URL in:
- `web/src/pages/AuthPage.jsx` - Update the `handleGoogleLogin()` function to use your production backend URL
- `web/src/pages/OAuth2RedirectHandler.jsx` - Update the `/api/users/me` endpoint URL

### 4. Database Migration

The User entity has been updated with two new fields:
- `authProvider` (VARCHAR 20) - nullable
- `googleId` (VARCHAR 255) - nullable, unique

If using `spring.jpa.hibernate.ddl-auto=update`, these columns will be added automatically.

For production, create a migration script:
```sql
ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20);
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NULL;
ALTER TABLE users MODIFY COLUMN birth_date DATE NULL;
ALTER TABLE users MODIFY COLUMN sex VARCHAR(20) NULL;
ALTER TABLE users MODIFY COLUMN phone_number VARCHAR(20) NULL;
ALTER TABLE users MODIFY COLUMN street VARCHAR(200) NULL;
ALTER TABLE users MODIFY COLUMN barangay VARCHAR(100) NULL;
ALTER TABLE users MODIFY COLUMN city VARCHAR(100) NULL;
ALTER TABLE users MODIFY COLUMN province VARCHAR(100) NULL;
```

## How It Works

### Authentication Flow

1. **User clicks "Continue with Google"** on login page
2. **Frontend redirects** to `http://localhost:8080/oauth2/authorization/google`
3. **Backend redirects** user to Google's OAuth2 consent screen
4. **User authenticates** with Google and grants permissions
5. **Google redirects back** to backend with authorization code
6. **Backend exchanges** authorization code for access token
7. **CustomOAuth2UserService**:
   - Fetches user info from Google
   - Checks if user exists by Google ID or email
   - Creates new user or links existing account
8. **OAuth2AuthenticationSuccessHandler**:
   - Generates JWT token for the user
   - Redirects to frontend with token: `http://localhost:5173/oauth2/redirect?token=JWT_TOKEN`
9. **OAuth2RedirectHandler** (Frontend):
   - Extracts token from URL
   - Stores token in localStorage
   - Fetches user data from `/api/users/me`
   - Updates auth context
   - Redirects to dashboard

### User Account Handling

| Scenario | Behavior |
|----------|----------|
| New Google user | Creates new account with Google info, generates unique username |
| Existing user with same email | Links Google account to existing user, updates authProvider |
| Existing Google user | Logs in with existing account |

## Security Considerations

1. **JWT Generation**: System generates its own JWT tokens, not relying on Google's tokens
2. **Unified Authentication**: Both regular and OAuth users use the same JWT-based authentication
3. **Account Linking**: Prevents duplicate accounts by linking Google to existing email
4. **Protected Endpoints**: All secured endpoints continue working with JWT validation
5. **CORS Configuration**: Properly configured for cross-origin requests

## Testing OAuth Login

### Local Testing

1. Start the backend server:
   ```bash
   cd backend
   mvn spring-boot:run
   ```

2. Start the frontend development server:
   ```bash
   cd web
   npm run dev
   ```

3. Navigate to `http://localhost:5173`
4. Click "Continue with Google" button
5. Sign in with a Google account
6. Verify successful redirect to dashboard

### Verify Database

After successful OAuth login, check the users table:
```sql
SELECT id, username, email, auth_provider, google_id, created_at 
FROM users 
WHERE auth_provider = 'GOOGLE';
```

## API Endpoints

### OAuth2 Endpoints (handled by Spring Security)
- `GET /oauth2/authorization/google` - Initiates OAuth2 flow
- `GET /login/oauth2/code/google` - OAuth2 callback endpoint

### User Endpoints
- `GET /api/users/me` - Get current authenticated user
  - **Authorization**: Bearer token required
  - **Returns**: User object with all profile information

## Mobile Application Compatibility

The implementation is designed to be mobile-compatible:

1. **API-Driven**: All OAuth logic returns JWT tokens through API
2. **Token-Based**: Mobile apps can use the same JWT tokens
3. **Future Integration**: Mobile apps can implement OAuth flow using:
   - Native Google Sign-In SDKs
   - Web view for OAuth flow
   - Backend token exchange endpoints

### Mobile Implementation Notes (for future)

For mobile apps, you can:
1. Use native Google Sign-In SDK to get Google access token
2. Send Google token to custom backend endpoint
3. Backend validates Google token and returns PirmaPH JWT
4. Mobile app uses PirmaPH JWT for all subsequent requests

## Troubleshooting

### Common Issues

1. **"Redirect URI mismatch" error**
   - Verify redirect URI in Google Console matches exactly: `http://localhost:8080/login/oauth2/code/google`
   - Check for trailing slashes or http vs https

2. **Token not received on frontend**
   - Check browser console for errors
   - Verify CORS configuration in backend
   - Ensure frontend callback URL matches redirect in success handler

3. **User not found after OAuth**
   - Verify CustomOAuth2UserService is creating/finding user correctly
   - Check database for user creation
   - Review backend logs for errors

4. **JWT validation fails**
   - Ensure JWT secret is consistent
   - Verify token format in Authorization header: `Bearer <token>`

## Configuration for Production

### Backend

1. Use environment variables for OAuth credentials:
```properties
spring.security.oauth2.client.registration.google.client-id=${GOOGLE_CLIENT_ID}
spring.security.oauth2.client.registration.google.client-secret=${GOOGLE_CLIENT_SECRET}
spring.security.oauth2.client.registration.google.redirect-uri=${BACKEND_URL}/login/oauth2/code/google
```

2. Update CORS configuration:
```properties
cors.allowed-origins=${FRONTEND_URL}
```

3. Add production redirect URI in Google Console

### Frontend

1. Update OAuth endpoint URL in `AuthPage.jsx`
2. Update API base URL in `OAuth2RedirectHandler.jsx`
3. Consider using environment variables:
   ```javascript
   const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
   ```

## Existing Features Preserved

✅ All existing authentication features remain functional:
- User registration with email/password
- User login with email/password
- JWT authentication
- Password hashing with BCrypt
- Protected routes
- Logout functionality
- `/api/users/me` endpoint for both auth methods

## Summary

Google OAuth Login has been successfully integrated into PirmaPH while maintaining:
- Existing JWT-based security architecture
- Database consistency with unified user model
- Future mobile application compatibility
- Secure authentication flow
- Seamless user experience

Users can now choose between traditional email/password login or convenient Google authentication, with both methods using the same underlying JWT security system.
