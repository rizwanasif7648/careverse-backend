# Careverse API - Postman Collection

## 📦 Files Included

1. **postman_collection.json** - Complete API collection with all endpoints
2. **postman_environment_local.json** - Environment for local development
3. **postman_environment_ngrok.json** - Environment for ngrok public URL

## 🚀 Setup Instructions

### 1. Import Collection
1. Open Postman
2. Click **Import** button (top left)
3. Select `postman_collection.json`
4. Collection "Careverse API" will appear in your workspace

### 2. Import Environment
1. Click **Import** button again
2. Select **BOTH** environment files:
   - `postman_environment_local.json` (for local testing)
   - `postman_environment_ngrok.json` (for sharing with frontend)
3. Environments will appear in the environment dropdown (top right)

### 3. Select Environment
- For **local testing**: Select "Careverse - Local" environment
- For **sharing with frontend**: Select "Careverse - Ngrok (Public)" environment

## 🔑 Authentication Flow

### Step 1: Register a User
1. Open **Authentication → Register User**
2. Request body is pre-filled:
   ```json
   {
     "email": "john@example.com",
     "password": "SecurePass@123"
   }
   ```
3. Click **Send**
4. ✅ Tokens will be **automatically saved** to environment variables

### Step 2: Login
1. Open **Authentication → Login User**
2. Use the same credentials
3. Click **Send**
4. ✅ New tokens will be **automatically saved**

### Step 3: Use Protected Endpoints
- All other endpoints automatically use `{{token}}` from environment
- No need to manually copy/paste tokens!

## 📝 Available Endpoints

### Authentication
- ✅ **POST** `/api/v1/auth/register` - Register new user
- ✅ **POST** `/api/v1/auth/login` - Login user
- ✅ **POST** `/api/v1/auth/refresh-token` - Refresh access token

### Chat (Protected)
- **POST** `/api/v1/chat/message` - Send message
- **GET** `/api/v1/chat/conversations` - Get all conversations

### Assessments (Protected)
- **GET** `/api/v1/assessments` - Get user assessments
- **POST** `/api/v1/assessments/generate` - Generate assessment

### Providers (Protected)
- **GET** `/api/v1/providers/search` - Search healthcare providers

### Health Check
- **GET** `/health` - Check server status

## 🌐 Ngrok Public URL

**Current Public URL:**
```
https://dacf9aa59862.ngrok-free.app
```

**API Base Path:**
```
https://dacf9aa59862.ngrok-free.app/api/v1
```

### Share with Frontend Team:
1. Use **"Careverse - Ngrok (Public)"** environment
2. Share the ngrok URL: `https://dacf9aa59862.ngrok-free.app`
3. All API endpoints will work through this public URL

## 🔄 Auto Token Management

The collection includes automatic token management:
- After successful **Register** or **Login**, tokens are saved automatically
- Access token saved to `{{token}}`
- Refresh token saved to `{{refreshToken}}`
- All protected endpoints use `{{token}}` automatically

## 📋 Password Requirements

Passwords must meet these criteria:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (@$!%*?&)

Example: `SecurePass@123`

## 🛠️ Tips

1. **Check Environment**: Make sure correct environment is selected (top right dropdown)
2. **View Variables**: Click environment name to see saved tokens
3. **Multiple Users**: Change email in request body to test with different users
4. **Token Expiry**: 
   - Access tokens expire in 7 days
   - Refresh tokens expire in 30 days
   - Use refresh token endpoint to get new access token

## 🐛 Troubleshooting

### "Connection refused" error
- Make sure server is running: `npm run dev`
- Check correct environment is selected

### "Invalid token" error
- Token may have expired
- Login again to get new tokens

### Ngrok URL not working
- Ngrok session may have expired (free tier has 2-hour sessions)
- Restart ngrok: `ngrok http 5000`
- Update `baseUrl` in ngrok environment with new URL

## 📞 Support

For issues or questions, check:
- Server logs: Terminal running `npm run dev`
- Postman console: View → Show Postman Console
- Response body: Contains detailed error messages
