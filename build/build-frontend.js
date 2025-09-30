const fs = require('fs');
const path = require('path');

// Helper function to ensure directory exists
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Helper function to copy file
function copyFile(src, dest) {
    const data = fs.readFileSync(src);
    fs.writeFileSync(dest, data);
}

// Helper function to copy directory recursively
function copyDir(src, dest) {
    ensureDir(dest);
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            copyFile(srcPath, destPath);
        }
    }
}

function buildFrontend() {
    console.log('🔨 Building frontend assets...');

    const sourceDir = path.join(__dirname, '../../extracted_files');
    const buildDir = path.join(__dirname, '../views');
    const assetsDir = path.join(__dirname, '../public/assets');

    try {
        // Ensure directories exist
        ensureDir(buildDir);
        ensureDir(assetsDir);

        // Process HTML
        console.log('📄 Processing HTML...');
        let html = fs.readFileSync(path.join(sourceDir, 'index.html'), 'utf8');
        
        // Replace config references with secure backend endpoint
        html = html.replace(/\/js\/config\.js/g, '{{CONFIG_ENDPOINT}}');
        html = html.replace(/const API_BASE_URL[^;]+;/, '');
        html = html.replace(/const IMGBB_API_KEY[^;]+;/, '');
        
        // Add cache busting and security headers
        html = html.replace(/<head>/i, `<head>
    <meta name="version" content="{{APP_VERSION}}">
    <meta http-equiv="X-Content-Type-Options" content="nosniff">
    <meta http-equiv="X-Frame-Options" content="DENY">
    <meta http-equiv="X-XSS-Protection" content="1; mode=block">`);

        fs.writeFileSync(path.join(buildDir, 'index.html'), html);

        // Process and minify CSS
        console.log('🎨 Processing CSS...');
        const css = fs.readFileSync(path.join(sourceDir, 'styles.css'), 'utf8');
        // Simple CSS minification (remove comments and extra whitespace)
        const minifiedCSS = css
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\s+/g, ' ')
            .replace(/;\s*}/g, '}')
            .replace(/{\s*/g, '{')
            .replace(/:\s*/g, ':')
            .replace(/,\s*/g, ',')
            .trim();
        
        fs.writeFileSync(path.join(assetsDir, 'styles.min.css'), minifiedCSS);

        // Process and obfuscate JavaScript files
        console.log('⚡ Processing JavaScript...');
        const jsFiles = [
            'js/main.js', 'js/auth.js', 'js/api.js', 'js/dom.js', 
            'js/interactions.js', 'js/listing-cards.js', 'js/listing-management.js',
            'js/locations-categories.js', 'js/modals.js', 'js/otp-password.js',
            'js/state.js', 'js/utils.js', 'js/contact.js'
        ];

        const viewFiles = [
            'js/views/core.js', 'js/views/dashboard.js', 'js/views/favorites.js',
            'js/views/home.js', 'js/views/listing-detail.js', 'js/views/listings.js',
            'js/views/profile.js', 'js/views/settings.js', 'js/views/static-pages.js'
        ];

        let combinedJS = '';

        // Add secure config at the top
        combinedJS += `
// Secure configuration - fetched from backend
let APP_CONFIG = null;
async function initConfig() {
    if (!APP_CONFIG) {
        const response = await fetch('/config');
        APP_CONFIG = await response.json();
    }
    return APP_CONFIG;
}

// Secure API base URL getter
function getApiBaseUrl() {
    return APP_CONFIG?.apiBaseUrl || '/api';
}

// Replace all API_BASE_URL references
const API_BASE_URL = '/api';
const IMGBB_API_KEY = null; // No longer needed on client side

`;

        // Process main JS files
        for (const file of jsFiles) {
            const filePath = path.join(sourceDir, file);
            if (fs.existsSync(filePath)) {
                let content = fs.readFileSync(filePath, 'utf8');
                
                // Remove import/export statements and config imports
                content = content.replace(/^import.*from.*$/gm, '');
                content = content.replace(/^export.*$/gm, '');
                content = content.replace(/import.*config\.js.*$/gm, '');
                
                // Replace API_BASE_URL usage with function calls
                content = content.replace(/API_BASE_URL/g, 'getApiBaseUrl()');
                
                combinedJS += `\n// === ${file} ===\n${content}\n`;
            }
        }

        // Process view files
        for (const file of viewFiles) {
            const filePath = path.join(sourceDir, file);
            if (fs.existsSync(filePath)) {
                let content = fs.readFileSync(filePath, 'utf8');
                content = content.replace(/^import.*from.*$/gm, '');
                content = content.replace(/^export.*$/gm, '');
                combinedJS += `\n// === ${file} ===\n${content}\n`;
            }
        }

        // Add initialization code
        combinedJS += `
// Initialize configuration and start app
document.addEventListener('DOMContentLoaded', async () => {
    await initConfig();
    // The original DOMContentLoaded code will run here
});
`;

        // Simple minification (removing comments and extra whitespace)
        console.log('🔒 Processing JavaScript...');
        const minifiedJS = combinedJS
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
            .replace(/\/\/.*$/gm, '') // Remove line comments
            .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
            .replace(/;\s*}/g, ';}') // Clean up statements
            .replace(/{\s*/g, '{') // Clean up braces
            .replace(/;\s+/g, ';') // Clean up semicolons
            .trim();

        fs.writeFileSync(path.join(assetsDir, 'app.min.js'), minifiedJS);

        // Copy static assets
        console.log('📁 Copying static assets...');
        copyFile(path.join(sourceDir, 'logo.svg'), path.join(assetsDir, 'logo.svg'));
        
        // Copy modals directory
        copyDir(path.join(sourceDir, 'modals'), path.join(assetsDir, 'modals'));

        // Copy service worker
        if (fs.existsSync(path.join(sourceDir, '_worker.js'))) {
            copyFile(path.join(sourceDir, '_worker.js'), path.join(assetsDir, 'sw.js'));
        }

        // Update HTML to use minified assets
        html = html.replace(/\/styles\.css/g, '/assets/styles.min.css');
        html = html.replace(/<script.*src.*js\/.*<\/script>/g, '');
        html = html.replace('</body>', '<script src="/assets/app.min.js"></script></body>');
        
        fs.writeFileSync(path.join(buildDir, 'index.html'), html);

        console.log('✅ Frontend build completed successfully!');
        console.log(`📦 Assets saved to: ${assetsDir}`);
        console.log(`📄 HTML template saved to: ${buildDir}`);

    } catch (error) {
        console.error('❌ Build error:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    buildFrontend();
}

module.exports = { buildFrontend };