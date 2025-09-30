const express = require('express');
const axios = require('axios');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Multer configuration for image uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// External API configuration (secured on server)
const EXTERNAL_API_BASE_URL = process.env.API_BASE_URL || 'https://keid-43qv.onrender.com/api';
const IMGBB_API_KEY = process.env.IMGBB_API_KEY || '3fd4d8a5ac9be720f1838259d0ca24b4';

// Validation middleware
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Helper function to proxy requests to external API
const proxyToExternalAPI = async (req, res, endpoint, method = 'GET', data = null) => {
    try {
        const config = {
            method,
            url: `${EXTERNAL_API_BASE_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': req.headers.authorization || ''
            }
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        res.json(response.data);
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error.message);
        res.status(error.response?.status || 500).json({
            error: 'External API error',
            message: error.response?.data?.message || 'Service temporarily unavailable'
        });
    }
};

// Image upload endpoint (secured)
router.post('/upload-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        const formData = new FormData();
        const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
        formData.append('image', blob);

        const response = await axios.post(
            `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error('Image upload error:', error.message);
        res.status(500).json({
            error: 'Image upload failed',
            message: 'Please try again later'
        });
    }
});

// Authentication endpoints
router.post('/auth/register', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('firstName').notEmpty().escape(),
    body('lastName').notEmpty().escape(),
    validateRequest
], (req, res) => {
    proxyToExternalAPI(req, res, '/auth/register', 'POST', req.body);
});

router.post('/auth/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    validateRequest
], (req, res) => {
    proxyToExternalAPI(req, res, '/auth/login', 'POST', req.body);
});

router.post('/auth/verify-otp', [
    body('email').isEmail().normalizeEmail(),
    body('otp').isLength({ min: 4, max: 6 }),
    validateRequest
], (req, res) => {
    proxyToExternalAPI(req, res, '/auth/verify-otp', 'POST', req.body);
});

router.post('/auth/resend-otp', [
    body('email').isEmail().normalizeEmail(),
    validateRequest
], (req, res) => {
    proxyToExternalAPI(req, res, '/auth/resend-otp', 'POST', req.body);
});

router.post('/auth/forgot-password', [
    body('email').isEmail().normalizeEmail(),
    validateRequest
], (req, res) => {
    proxyToExternalAPI(req, res, '/auth/forgot-password', 'POST', req.body);
});

router.post('/auth/reset-password', [
    body('token').notEmpty(),
    body('newPassword').isLength({ min: 6 }),
    validateRequest
], (req, res) => {
    proxyToExternalAPI(req, res, '/auth/reset-password', 'POST', req.body);
});

// User management endpoints
router.get('/users/profile', (req, res) => {
    proxyToExternalAPI(req, res, '/users/profile');
});

router.put('/users/profile', [
    body('firstName').optional().notEmpty().escape(),
    body('lastName').optional().notEmpty().escape(),
    body('phone').optional().isMobilePhone(),
    validateRequest
], (req, res) => {
    proxyToExternalAPI(req, res, '/users/profile', 'PUT', req.body);
});

router.delete('/users/profile', (req, res) => {
    proxyToExternalAPI(req, res, '/users/profile', 'DELETE');
});

// Listings endpoints
router.get('/listings', (req, res) => {
    const queryString = new URLSearchParams(req.query).toString();
    const endpoint = `/listings${queryString ? '?' + queryString : ''}`;
    proxyToExternalAPI(req, res, endpoint);
});

router.get('/listings/:id', (req, res) => {
    proxyToExternalAPI(req, res, `/listings/${req.params.id}`);
});

router.post('/listings', [
    body('title').notEmpty().escape(),
    body('description').notEmpty().escape(),
    body('price').isNumeric(),
    body('category').notEmpty().escape(),
    body('location').notEmpty().escape(),
    validateRequest
], (req, res) => {
    proxyToExternalAPI(req, res, '/listings', 'POST', req.body);
});

router.put('/listings/:id', [
    body('title').optional().notEmpty().escape(),
    body('description').optional().notEmpty().escape(),
    body('price').optional().isNumeric(),
    validateRequest
], (req, res) => {
    proxyToExternalAPI(req, res, `/listings/${req.params.id}`, 'PUT', req.body);
});

router.delete('/listings/:id', (req, res) => {
    proxyToExternalAPI(req, res, `/listings/${req.params.id}`, 'DELETE');
});

// Categories and locations (serve from local data for performance)
router.get('/categories', (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const categoriesPath = path.join(__dirname, '../data/categories.json');
        const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
        res.json(categories);
    } catch (error) {
        console.error('Categories error:', error.message);
        res.status(500).json({ error: 'Unable to load categories' });
    }
});

router.get('/locations', (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const locationsPath = path.join(__dirname, '../data/locations.json');
        const locations = JSON.parse(fs.readFileSync(locationsPath, 'utf8'));
        res.json(locations);
    } catch (error) {
        console.error('Locations error:', error.message);
        res.status(500).json({ error: 'Unable to load locations' });
    }
});

// Favorites endpoints
router.get('/favorites', (req, res) => {
    proxyToExternalAPI(req, res, '/favorites');
});

router.post('/favorites/:listingId', (req, res) => {
    proxyToExternalAPI(req, res, `/favorites/${req.params.listingId}`, 'POST');
});

router.delete('/favorites/:listingId', (req, res) => {
    proxyToExternalAPI(req, res, `/favorites/${req.params.listingId}`, 'DELETE');
});

// Contact/messaging endpoints
router.post('/contact', [
    body('listingId').notEmpty(),
    body('message').notEmpty().escape(),
    validateRequest
], (req, res) => {
    proxyToExternalAPI(req, res, '/contact', 'POST', req.body);
});

router.get('/messages', (req, res) => {
    proxyToExternalAPI(req, res, '/messages');
});

// Health check
router.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: process.env.APP_VERSION || '1.0.0'
    });
});

module.exports = router;