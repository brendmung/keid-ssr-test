const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            connectSrc: ["'self'", process.env.API_BASE_URL || "https://keid-43qv.onrender.com"]
        }
    }
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || `http://localhost:${PORT}`,
    credentials: true
}));

// API Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Config endpoint for frontend (without exposing sensitive keys)
app.get('/config', (req, res) => {
    res.json({
        apiBaseUrl: '/api', // Use our backend API instead of external
        features: {
            imageUpload: true,
            userAuth: true,
            locationServices: true
        }
    });
});

// Serve static assets with cache headers
app.use('/assets', express.static(path.join(__dirname, 'public/assets'), {
    maxAge: '1y',
    etag: false
}));

// Dynamic frontend serving
app.get('*', (req, res) => {
    // For API calls that don't match routes, return 404
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }

    // Serve the main application
    const indexPath = path.join(__dirname, 'views/index.html');
    
    if (fs.existsSync(indexPath)) {
        // Read and process the HTML template
        let html = fs.readFileSync(indexPath, 'utf8');
        
        // Inject dynamic configuration
        html = html.replace('{{CONFIG_ENDPOINT}}', '/config');
        html = html.replace('{{APP_VERSION}}', process.env.APP_VERSION || '1.0.0');
        
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        
        res.send(html);
    } else {
        res.status(404).send('Application not found');
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Keid Marketplace Backend running on port ${PORT}`);
    console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Access at: http://localhost:${PORT}`);
});

module.exports = app;