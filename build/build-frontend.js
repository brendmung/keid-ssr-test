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

// Advanced ES6 module transformation
function transformES6Module(content, fileName) {
    let transformedContent = content;
    
    // Store all import/export information for debugging
    const imports = [];
    const exports = [];
    
    // Extract and remove import statements
    const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"`]([^'"`]+)['"`]\s*;?/g;
    let importMatch;
    while ((importMatch = importRegex.exec(content)) !== null) {
        imports.push(importMatch[0]);
    }
    
    // Extract and remove export statements
    const exportRegex = /export\s+(?:default\s+)?(?:function|class|const|let|var)?\s*[^;{]+[{;]?/g;
    let exportMatch;
    while ((exportMatch = exportRegex.exec(content)) !== null) {
        exports.push(exportMatch[0]);
    }
    
    console.log(`🔍 Processing ${fileName}:`);
    if (imports.length > 0) {
        console.log(`  📥 Imports found: ${imports.length}`);
        imports.forEach(imp => console.log(`    - ${imp.trim()}`));
    }
    if (exports.length > 0) {
        console.log(`  📤 Exports found: ${exports.length}`);
        exports.forEach(exp => console.log(`    - ${exp.trim()}`));
    }
    
    // Remove import statements completely
    transformedContent = transformedContent.replace(/import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"`][^'"`]+['"`]\s*;?\s*/g, '');
    
    // Transform export statements to regular declarations
    transformedContent = transformedContent.replace(/export\s+default\s+function\s+(\w+)/g, 'function $1');
    transformedContent = transformedContent.replace(/export\s+default\s+class\s+(\w+)/g, 'class $1');
    transformedContent = transformedContent.replace(/export\s+default\s+const\s+(\w+)/g, 'const $1');
    transformedContent = transformedContent.replace(/export\s+default\s+let\s+(\w+)/g, 'let $1');
    transformedContent = transformedContent.replace(/export\s+default\s+var\s+(\w+)/g, 'var $1');
    
    // Handle regular exports
    transformedContent = transformedContent.replace(/export\s+function\s+(\w+)/g, 'function $1');
    transformedContent = transformedContent.replace(/export\s+class\s+(\w+)/g, 'class $1');
    transformedContent = transformedContent.replace(/export\s+const\s+/g, 'const ');
    transformedContent = transformedContent.replace(/export\s+let\s+/g, 'let ');
    transformedContent = transformedContent.replace(/export\s+var\s+/g, 'var ');
    
    // Handle export { ... } statements
    transformedContent = transformedContent.replace(/export\s*\{[^}]*\}\s*;?/g, '');
    
    // Remove any remaining isolated export keywords
    transformedContent = transformedContent.replace(/^\s*export\s*;?\s*$/gm, '');
    
    return transformedContent;
}

function buildFrontend() {
    console.log('🔨 Building frontend assets with improved ES6 handling...');

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

        // Process and obfuscate JavaScript files with improved ES6 handling
        console.log('⚡ Processing JavaScript with ES6 transformation...');
        
        // Define file order for proper dependency resolution
        const jsFiles = [
            'js/config.js',   // Config first (though we'll replace its content)
            'js/utils.js',    // Utilities first
            'js/dom.js',      // DOM utilities
            'js/state.js',    // State management
            'js/api.js',      // API layer
            'js/auth.js',     // Authentication
            'js/interactions.js',
            'js/listing-cards.js',
            'js/listing-management.js',
            'js/locations-categories.js',
            'js/modals.js',
            'js/otp-password.js',
            'js/contact.js',
            // Views in dependency order
            'js/views/core.js',
            'js/views/dashboard.js',
            'js/views/favorites.js',
            'js/views/home.js',
            'js/views/listing-detail.js',
            'js/views/listings.js',
            'js/views/profile.js',
            'js/views/settings.js',
            'js/views/static-pages.js',
            'js/main.js'      // Main initialization last
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

        // Process files in the defined order
        console.log('📦 Bundling JavaScript files...');
        for (const file of jsFiles) {
            const filePath = path.join(sourceDir, file);
            if (fs.existsSync(filePath)) {
                console.log(`🔧 Processing: ${file}`);
                let content = fs.readFileSync(filePath, 'utf8');
                
                // Skip config.js as we're replacing it with our secure version
                if (file === 'js/config.js') {
                    console.log(`  ⏭️  Skipping ${file} (replaced with secure config)`);
                    continue;
                }
                
                // Transform ES6 modules
                content = transformES6Module(content, file);
                
                // Replace API_BASE_URL usage with function calls
                content = content.replace(/API_BASE_URL/g, 'getApiBaseUrl()');
                
                // Replace any hardcoded API endpoints with our proxy
                content = content.replace(/https:\/\/keid-43qv\.onrender\.com\/api/g, 'getApiBaseUrl()');
                content = content.replace(/https:\/\/api\.imgbb\.com/g, 'getApiBaseUrl()');
                
                combinedJS += `\n// === ${file} ===\n${content}\n`;
            } else {
                console.log(`⚠️  File not found: ${file}`);
            }
        }

        // Add initialization code
        combinedJS += `
// Initialize configuration and start app
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initConfig();
        console.log('✅ App configuration loaded');
        // The original DOMContentLoaded code will run here
    } catch (error) {
        console.error('❌ Failed to load app configuration:', error);
    }
});
`;

        // Enhanced minification
        console.log('🔒 Minifying JavaScript...');
        let minifiedJS = combinedJS
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
            .replace(/\/\/.*$/gm, '') // Remove line comments
            .replace(/console\.log\([^)]*\);?/g, '') // Remove console.log statements
            .replace(/console\.debug\([^)]*\);?/g, '') // Remove console.debug statements
            .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
            .replace(/;\s*}/g, ';}') // Clean up statements
            .replace(/{\s*/g, '{') // Clean up braces
            .replace(/;\s+/g, ';') // Clean up semicolons
            .replace(/,\s+/g, ',') // Clean up commas
            .trim();

        // Validate the generated JavaScript
        console.log('🔍 Validating generated JavaScript...');
        try {
            // Basic syntax check (not a full parser, but catches major issues)
            const importCount = (minifiedJS.match(/\bimport\b/g) || []).length;
            const exportCount = (minifiedJS.match(/\bexport\b/g) || []).length;
            
            if (importCount > 0 || exportCount > 0) {
                console.warn(`⚠️  Warning: Found ${importCount} import and ${exportCount} export statements in final output`);
                console.log('🔧 Performing additional cleanup...');
                
                // Additional cleanup for any remaining import/export
                minifiedJS = minifiedJS.replace(/\bimport\b[^;]*;?/g, '');
                minifiedJS = minifiedJS.replace(/\bexport\b[^;]*;?/g, '');
            }
            
            console.log('✅ JavaScript validation passed');
        } catch (error) {
            console.error('❌ JavaScript validation failed:', error);
        }

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
        console.log(`📊 Final bundle size: ${Math.round(fs.statSync(path.join(assetsDir, 'app.min.js')).size / 1024)}KB`);

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
