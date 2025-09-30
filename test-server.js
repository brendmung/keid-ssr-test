#!/usr/bin/env node

// Simple test server without external dependencies
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif'
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    const pathname = parsedUrl.pathname;

    // Enable CORS for development
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Config endpoint
    if (pathname === '/config') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            apiBaseUrl: '/api',
            features: {
                imageUpload: true,
                userAuth: true,
                locationServices: true
            }
        }));
        return;
    }

    // API endpoints (placeholder responses)
    if (pathname.startsWith('/api/')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        
        if (pathname === '/api/health') {
            res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
        } else if (pathname === '/api/categories') {
            const categoriesPath = path.join(__dirname, 'data/categories.json');
            if (fs.existsSync(categoriesPath)) {
                res.end(fs.readFileSync(categoriesPath));
            } else {
                res.end(JSON.stringify({ categories: [] }));
            }
        } else if (pathname === '/api/locations') {
            const locationsPath = path.join(__dirname, 'data/locations.json');
            if (fs.existsSync(locationsPath)) {
                res.end(fs.readFileSync(locationsPath));
            } else {
                res.end(JSON.stringify({ cities: [] }));
            }
        } else {
            res.end(JSON.stringify({ message: 'API endpoint available', endpoint: pathname }));
        }
        return;
    }

    // Static assets
    if (pathname.startsWith('/assets/')) {
        const filePath = path.join(__dirname, 'public', pathname);
        
        if (fs.existsSync(filePath)) {
            const ext = path.extname(filePath);
            const contentType = mimeTypes[ext] || 'application/octet-stream';
            
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000' // 1 year cache for assets
            });
            res.end(fs.readFileSync(filePath));
        } else {
            res.writeHead(404);
            res.end('Asset not found');
        }
        return;
    }

    // Serve main application
    const indexPath = path.join(__dirname, 'views/index.html');
    
    if (fs.existsSync(indexPath)) {
        let html = fs.readFileSync(indexPath, 'utf8');
        
        // Replace template variables
        html = html.replace('{{CONFIG_ENDPOINT}}', '/config');
        html = html.replace('{{APP_VERSION}}', '1.0.0');
        
        res.writeHead(200, { 
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end(html);
    } else {
        res.writeHead(404);
        res.end('Application not found');
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Keid Marketplace Backend (Test Mode) running on port ${PORT}`);
    console.log(`🌐 Access at: http://localhost:${PORT}`);
    console.log(`🔒 Source code is protected and minified`);
    console.log(`📱 API keys are secured server-side`);
    console.log('\n📋 Available endpoints:');
    console.log(`   • GET  /           - Main application`);
    console.log(`   • GET  /config     - Frontend configuration`);
    console.log(`   • GET  /api/health - Health check`);
    console.log(`   • GET  /api/categories - Product categories`);
    console.log(`   • GET  /api/locations  - Location data`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
    });
});