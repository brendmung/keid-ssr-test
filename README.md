# Keid Marketplace Backend

A secure backend server for the Keid Marketplace application that dynamically serves the frontend while protecting source code and API keys.

## 🔒 Security Features

- **Protected Source Code**: Frontend code is minified, obfuscated, and served dynamically
- **Secure API Keys**: All sensitive keys are stored server-side in environment variables  
- **API Proxying**: External API calls are routed through the backend to hide endpoints
- **Rate Limiting**: Prevents API abuse with configurable limits
- **Input Validation**: All user inputs are validated and sanitized
- **Security Headers**: Comprehensive HTTP security headers implemented
- **CORS Protection**: Configurable cross-origin resource sharing
- **Content Security Policy**: Prevents XSS and other injection attacks

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. **Install dependencies:**
   ```bash
   cd keid-backend
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your actual API keys and configuration
   ```

3. **Build frontend assets:**
   ```bash
   npm run build
   ```

4. **Start the server:**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

5. **Access the application:**
   Open http://localhost:3000 in your browser

## 📁 Project Structure

```
keid-backend/
├── server.js              # Main server file
├── routes/
│   └── api.js             # API routes and proxying
├── views/
│   └── index.html         # Processed HTML template
├── public/
│   └── assets/            # Minified/obfuscated frontend assets
├── data/
│   ├── categories.json    # Product categories
│   └── locations.json     # Location data
├── build/
│   └── build-frontend.js  # Frontend build process
└── .env                   # Environment configuration (KEEP SECURE!)
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `API_BASE_URL` | External API endpoint | Required |
| `IMGBB_API_KEY` | Image upload service key | Required |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |

### Security Configuration

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **File Upload**: 5MB max file size, images only
- **CORS**: Configurable origins
- **CSP**: Strict content security policy

## 🛡️ Security Measures

1. **Source Code Protection**:
   - JavaScript is minified and obfuscated
   - Import/export statements removed
   - Debug code stripped in production

2. **API Key Security**:
   - All keys stored server-side only
   - Frontend receives configuration via secure endpoint
   - External API calls proxied through backend

3. **Input Validation**:
   - Express-validator for all user inputs
   - File type validation for uploads
   - XSS protection via sanitization

4. **HTTP Security**:
   - Helmet.js security headers
   - CORS configuration
   - Rate limiting
   - Compression

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login  
- `POST /api/auth/verify-otp` - OTP verification
- `POST /api/auth/resend-otp` - Resend OTP
- `POST /api/auth/forgot-password` - Password reset
- `POST /api/auth/reset-password` - Reset password

### Listings
- `GET /api/listings` - Get listings (with filters)
- `GET /api/listings/:id` - Get specific listing
- `POST /api/listings` - Create listing
- `PUT /api/listings/:id` - Update listing
- `DELETE /api/listings/:id` - Delete listing

### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `DELETE /api/users/profile` - Delete account

### Utilities
- `GET /api/categories` - Get product categories
- `GET /api/locations` - Get locations
- `POST /api/upload-image` - Upload images
- `GET /api/health` - Health check

## 🔨 Development

### Build Process
```bash
# Build frontend assets
npm run build-frontend

# Start development server
npm run dev
```

### Frontend Processing
The build process:
1. Combines all JavaScript modules into a single file
2. Removes ES6 import/export statements
3. Replaces API configuration with secure backend calls
4. Minifies and obfuscates the code
5. Processes HTML templates
6. Optimizes CSS and static assets

## 🚀 Deployment

### Production Setup

1. **Set production environment:**
   ```bash
   export NODE_ENV=production
   ```

2. **Configure production variables:**
   - Set secure `JWT_SECRET` and `SESSION_SECRET`
   - Update `FRONTEND_URL` to production domain
   - Configure SSL certificates if needed

3. **Build and start:**
   ```bash
   npm run build
   npm start
   ```

### Docker Deployment (Optional)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔍 Monitoring

- Health check endpoint: `/api/health`
- Error logging to console (configure external logging in production)
- Request logging via Morgan (add if needed)

## 🛠️ Troubleshooting

### Common Issues

1. **Build fails**: Ensure all source files are present in `extracted_files/`
2. **API errors**: Check external API endpoints and keys in `.env`
3. **CORS issues**: Verify `FRONTEND_URL` matches your domain
4. **Rate limiting**: Adjust limits in server configuration

### Debug Mode
Set `NODE_ENV=development` for detailed error messages.

## 📝 License

MIT License - see LICENSE file for details.

## 👨‍💻 Author

**MiniMax Agent** - Backend Security Implementation

---

**⚠️ Security Note**: Never commit the `.env` file or expose API keys. Always use environment variables in production.