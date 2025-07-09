# Google Authentication Implementation

This document explains how to set up and use Google authentication in the user-service.

## Backend Implementation

### Files Created/Modified:

1. **Services/googleAuthService.js** - Handles Google token verification and user management
2. **controllers/googleAuthController.js** - Handles HTTP requests for Google authentication
3. **routes/googleAuthRoutes.js** - Defines Google authentication endpoints
4. **Repository/AuthRepository.js** - Updated with Google user methods
5. **models/User.js** - Updated to make password optional for Google users
6. **server.js** - Updated to include Google auth routes

### API Endpoints:

- `POST /auth/google` - Authenticate with Google token
- `GET /auth/me` - Get current authenticated user
- `POST /auth/logout` - Logout user

## Frontend Implementation

### Files Created:

1. **frontend/GoogleAuthSlice.jsx** - Redux slice for Google authentication state
2. **frontend/GoogleAuthService.js** - Service for handling Google OAuth flow
3. **frontend/GoogleAuthComponent.jsx** - React component for Google sign-in

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend/services/user-service
npm install google-auth-library
```

### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configure OAuth consent screen
6. Create OAuth 2.0 Client ID for Web application
7. Add authorized JavaScript origins:
   - `http://localhost:3000` (for development)
   - `http://localhost:5173` (for Vite)
   - Your production domain
8. Add authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback`
   - Your production callback URL

### 3. Environment Variables

Add these to your `.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
```

For frontend, add to your React app's `.env`:

```env
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id-here
REACT_APP_API_URL=http://localhost:4000
```

### 4. Database Schema

The User model has been updated to support Google authentication:

```javascript
{
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Allows null values for non-Google users
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  // Password is now optional for Google users
  password: {
    type: String,
    required: function() {
      return !this.googleId;
    },
  }
}
```

## Usage

### Backend Usage

The Google authentication is automatically integrated into your existing auth system. Users can authenticate using either:

1. **Regular email/password** - Traditional authentication
2. **Google OAuth** - Google authentication

### Frontend Usage

#### 1. Add Redux Store

```javascript
// store.js
import { configureStore } from "@reduxjs/toolkit";
import googleAuthReducer from "./frontend/GoogleAuthSlice";

export const store = configureStore({
  reducer: {
    googleAuth: googleAuthReducer,
    // ... other reducers
  },
});
```

#### 2. Use Google Auth Component

```javascript
import GoogleAuthComponent from "./frontend/GoogleAuthComponent";

function LoginPage() {
  const handleGoogleSuccess = (result) => {
    console.log("Google auth successful:", result);
    // Redirect or update UI
  };

  const handleGoogleError = (error) => {
    console.error("Google auth failed:", error);
    // Show error message
  };

  return (
    <div>
      <h1>Login</h1>
      <GoogleAuthComponent
        onSuccess={handleGoogleSuccess}
        onError={handleGoogleError}
        buttonText="Sign in with Google"
      />
    </div>
  );
}
```

#### 3. Manual Google Sign-In

```javascript
import GoogleAuthService from "./frontend/GoogleAuthService";

const handleManualSignIn = async () => {
  try {
    const credential = await GoogleAuthService.signIn();
    // Send credential to backend
    const response = await fetch("/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: credential }),
    });
    const result = await response.json();
    console.log("Auth result:", result);
  } catch (error) {
    console.error("Sign in failed:", error);
  }
};
```

## API Response Format

### Successful Google Authentication

```json
{
  "success": true,
  "message": "Google authentication successful",
  "data": {
    "user": {
      "_id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "username": "john",
      "role": "customer",
      "profileImage": "https://example.com/photo.jpg",
      "googleId": "google_user_id",
      "emailVerified": true
    },
    "token": "jwt_token_here"
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Google authentication failed",
  "error": "Error details"
}
```

## Security Considerations

1. **Token Verification**: All Google tokens are verified server-side
2. **HTTPS**: Use HTTPS in production for secure cookie transmission
3. **CORS**: Properly configured CORS for cross-origin requests
4. **Rate Limiting**: Implemented rate limiting on auth endpoints
5. **Input Validation**: All inputs are validated before processing

## Testing

### Backend Testing

```bash
# Test Google auth endpoint
curl -X POST http://localhost:4000/auth/google \
  -H "Content-Type: application/json" \
  -d '{"token": "google_id_token_here"}'
```

### Frontend Testing

1. Open your React app
2. Click the Google Sign-In button
3. Complete Google OAuth flow
4. Verify successful authentication

## Troubleshooting

### Common Issues:

1. **"Google OAuth not loaded"** - Check if Google script is loading properly
2. **"Invalid token"** - Verify Google Client ID matches between frontend and backend
3. **CORS errors** - Ensure CORS configuration includes your frontend URL
4. **Cookie not set** - Check cookie settings for your environment

### Debug Steps:

1. Check browser console for JavaScript errors
2. Verify environment variables are set correctly
3. Test Google OAuth flow in Google Cloud Console
4. Check network tab for API request/response details

## Migration from Existing Auth

If you have existing users, they can continue using email/password authentication. Google authentication is additive and doesn't break existing functionality.

Users can link their Google account to existing accounts by:

1. Signing in with email/password
2. Going to profile settings
3. Linking Google account (future feature)
