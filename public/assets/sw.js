// _worker.js

// Define your backend API base URL
const API_BASE_URL = 'https://keid-43qv.onrender.com/api';

// Function to fetch listing data by slug/ID
async function getListingData(identifier) {
    try {
        const response = await fetch(`${API_BASE_URL}/listings/${identifier}`);
        if (!response.ok) {
            // If listing not found, throw an error to be caught by the handler
            if (response.status === 404) {
                throw new Error('Listing not found');
            }
            throw new Error(`Failed to fetch listing: ${response.statusText}`);
        }
        const data = await response.json();
        return data.listing; // Assuming the API returns { success: true, listing: {...} }
    } catch (error) {
        console.error('Error fetching listing data:', error);
        return null;
    }
}

// Function to fetch user data by slug/ID
async function getUserData(identifier) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${identifier}`);
        if (!response.ok) {
            // If user not found, throw an error to be caught by the handler
            if (response.status === 404) {
                throw new Error('User not found');
            }
            throw new Error(`Failed to fetch user: ${response.statusText}`);
        }
        const data = await response.json();
        return data.user; // Assuming the API returns { success: true, user: {...} }
    } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
    }
}

// Main event listener for fetch requests
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;

        let data = null;
        let type = null; // 'listing' or 'profile'
        let identifier = null;

        // 1. Check for dynamic routes that need SSR meta tags
        // FIXED: Updated regex patterns to match your URL structure
        // Listing detail pages (e.g., /product/slug, /service/slug, /listing/slug)
        const listingMatch = path.match(/^\/(product|service|listing)\/([a-zA-Z0-9_-]+)$/);
        if (listingMatch) {
            identifier = listingMatch[2];
            data = await getListingData(identifier);
            if (data) {
                type = 'listing';
            }
        }

        // Profile pages (e.g., /profile/slug)
        const profileMatch = path.match(/^\/profile\/([a-zA-Z0-9_-]+)$/);
        if (profileMatch) {
            identifier = profileMatch[1];
            data = await getUserData(identifier);
            if (data) {
                type = 'profile';
            }
        }

        // 2. If dynamic data was found, inject meta tags into index.html
        if (data && type) {
            let titleContent, descriptionContent, imageUrl, urlContent, ogType, twitterCardType;

            if (type === 'listing') {
                titleContent = data.title || 'Listing on Keid';

                // Format description with labels separated by new lines: Price: $X \n Location: Y \n Description: Z
                let formattedDescription = '';

                if (data.price) {
                    formattedDescription += `Price: $${data.price}`;
                }

                if (data.location) {
                    if (formattedDescription) formattedDescription += '\n | ';
                    // Capitalize first letter of location
                    const capitalizedLocation = data.location.charAt(0).toUpperCase() + data.location.slice(1);
                    formattedDescription += `Location: ${capitalizedLocation}`;
                }

                if (data.description) {
                    if (formattedDescription) formattedDescription += '\n | ';
                    formattedDescription += 'Description: ';

                    const desc = data.description.trim();
                    const remainingLength = 200 - formattedDescription.length;

                    if (desc.length > remainingLength && remainingLength > 0) {
                        formattedDescription += desc.substring(0, remainingLength) + '...';
                    } else {
                        formattedDescription += desc;
                    }
                }

                descriptionContent = formattedDescription || 'Check out this listing on Keid Marketplace';
                imageUrl = (data.images && data.images.length > 0) ? data.images[0] : '';
                urlContent = `${url.origin}/${data.type || 'listing'}/${data.slug}`;
                ogType = 'product';
                twitterCardType = 'summary_large_image';
            } else if (type === 'profile') {
                titleContent = `${data.displayName || 'User'} on Keid Marketplace`;
                descriptionContent = data.bio ?
                    data.bio.substring(0, 200) + (data.bio.length > 200 ? '...' : '') :
                    `Find ${data.displayName || 'this user'}'s listings on Keid Marketplace.`;
                imageUrl = data.profilePic || '';
                urlContent = `${url.origin}/profile/${data.slug}`;
                ogType = 'profile';
                twitterCardType = 'summary';
            }

            // Fetch the default index.html from the static assets
            const assetResponse = await env.ASSETS.fetch(new Request(`${url.origin}/index.html`));
            if (!assetResponse.ok) {
                // Fallback if index.html is not found
                return new Response('Internal Server Error', { status: 500 });
            }

            const html = await assetResponse.text();

            // Helper function to escape HTML attributes
            function escapeHtml(text) {
                return text
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            }

            // FIXED: Improved HTMLRewriter configuration
            const rewriter = new HTMLRewriter()
                // Replace the existing title content
                .on('title', {
                    element(element) {
                        element.setInnerContent(escapeHtml(titleContent));
                    }
                })
                // Remove existing meta tags that we'll replace
                .on('meta[property="og:title"], meta[property="og:description"], meta[property="og:image"], meta[property="og:url"], meta[property="og:type"]', {
                    element(element) {
                        element.remove();
                    }
                })
                .on('meta[name="twitter:card"], meta[name="twitter:title"], meta[name="twitter:description"], meta[name="twitter:image"]', {
                    element(element) {
                        element.remove();
                    }
                })
                .on('meta[name="description"]', {
                    element(element) {
                        element.remove();
                    }
                })
                // Inject new meta tags into head
                .on('head', {
                    element(element) {
                        // Add description meta tag
                        element.append(`<meta name="description" content="${escapeHtml(descriptionContent)}">`, { html: true });
                        
                        // Inject Open Graph meta tags
                        element.append(`<meta property="og:title" content="${escapeHtml(titleContent)}">`, { html: true });
                        element.append(`<meta property="og:description" content="${escapeHtml(descriptionContent)}">`, { html: true });
                        if (imageUrl) {
                            element.append(`<meta property="og:image" content="${escapeHtml(imageUrl)}">`, { html: true });
                        }
                        element.append(`<meta property="og:url" content="${escapeHtml(urlContent)}">`, { html: true });
                        element.append(`<meta property="og:type" content="${ogType}">`, { html: true });

                        // Inject Twitter Card meta tags
                        element.append(`<meta name="twitter:card" content="${twitterCardType}">`, { html: true });
                        element.append(`<meta name="twitter:title" content="${escapeHtml(titleContent)}">`, { html: true });
                        element.append(`<meta name="twitter:description" content="${escapeHtml(descriptionContent)}">`, { html: true });
                        if (imageUrl) {
                            element.append(`<meta name="twitter:image" content="${escapeHtml(imageUrl)}">`, { html: true });
                        }
                    }
                });

            // Return the transformed HTML
            return rewriter.transform(new Response(html, {
                headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
                }
            }));
        }

        // 3. If no dynamic data was found (or it's a static asset), serve the default Pages asset
        // This is crucial: Pages Functions run *before* the static asset server.
        // If the Worker doesn't return a response, Pages will serve the static asset.
        // For dynamic routes where data was NOT found (e.g., /product/non-existent-slug),
        // we should explicitly return a 404 or redirect to a generic 404 page.
        if ((listingMatch || profileMatch) && !data) {
            // If it matched a dynamic route pattern but data wasn't found
            // Serve the default index.html with a 404 status for SPA routing
            const assetResponse = await env.ASSETS.fetch(new Request(`${url.origin}/index.html`));
            if (assetResponse.ok) {
                const html = await assetResponse.text();
                return new Response(html, {
                    status: 404,
                    headers: { 'Content-Type': 'text/html; charset=utf-8' }
                });
            } else {
                return new Response('404 Not Found - The requested item/profile does not exist.', { status: 404 });
            }
        }

        // For all other requests (static assets, base paths like /, /products, /about),
        // let Cloudflare Pages serve the static file.
        return env.ASSETS.fetch(request);
    },
};
