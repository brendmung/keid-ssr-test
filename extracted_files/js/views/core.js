// js/views/core.js
import {
    currentUser,
    setCurrentUser,
    currentView,
    setCurrentView,
    currentSortBy,
    setCurrentSortBy,
    filterLocation,
    currentCategory,
    setCurrentCategory,
    currentListing,
    setCurrentListing,
    categories, // <--- This is the object containing the categories array
    locations,
    currentActiveRenderId,
    setCurrentActiveRenderId,
    cachedProducts,
    cachedServices,
    cachedCombinedListings,
    cachedUserListings,
    cachedUserFavorites,
    cachedUserProfile,
    cachedListingDetails,
    CACHE_DURATION,
    setCachedProducts,
    setCachedServices,
    setCachedCombinedListings,
    setCachedUserListings,
    setCachedUserFavorites,
    setCachedUserProfile,
    setCachedListingDetails,
} from '../state.js';
import DOMElements, { initializeDOMElements } from '../dom.js';
import {
    showMessage,
    updateActiveNavTab,
    failedFetchDisplay,
} from '../utils.js';

// Import individual view render functions
import { renderHome } from './home.js';
import { renderProducts, renderServices, renderCategory, handleSearch, renderSearchResults, renderBrowseListings } from './listings.js';
import { renderListingDetail, updateMetaTags } from './listing-detail.js'; // Import updateMetaTags from listing-detail.js
import { renderProfile } from './profile.js';
import { renderDashboard } from './dashboard.js';
import { renderFavorites } from './favorites.js';
import { renderSettings } from './settings.js';
import { renderAbout, renderContact } from './static-pages.js';

// NEW: Temporary cache for full listing objects when rendering lists
const tempListingCache = new Map();

// NEW: Helper function to update the browser tab title
function updatePageTitle(title) {
    document.title = title;
}

// NEW HELPER FUNCTION: To safely get the category name from the array structure
function getCategoryNameById(categoryId) {
    if (!categories || !categories.categories || !categoryId) return 'Category';
    
    // Find the category object in the array by its ID
    const category = categories.categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Category';
}


function updateURL(view, params = {}) {
    let url = '/';

    switch (view) {
        case 'home': url = '/'; break;
        case 'products': url = '/products'; break;
        case 'services': url = '/services'; break;
        case 'category': url = `/category/${params.category}`; break;
        case 'listing-detail':
            let listingIdentifier = '';
            if (typeof params === 'object' && params !== null) {
                listingIdentifier = params.slug || params._id;
            } else if (typeof params === 'string') {
                listingIdentifier = params;
            }

            if (currentListing && currentListing._id === (params._id || params)) {
                url = `/${currentListing.type}/${currentListing.slug}`;
            } else if (listingIdentifier) {
                url = `/listing/${listingIdentifier}`;
            }
            break;
        case 'profile':
            if (currentUser && currentUser.slug === params) {
                url = `/profile/${currentUser.slug}`;
            } else if (typeof params === 'string') {
                url = `/profile/${params}`;
            }
            break;
        case 'dashboard': url = '/dashboard'; break;
        case 'favorites': url = '/favorites'; break;
        case 'settings': url = '/settings'; break;
        case 'about': url = '/about'; break;
        case 'contact': url = '/contact'; break;
        case 'search':
            const query = DOMElements.searchInput.value.trim();
            const category = DOMElements.categorySelect.value;
            let searchUrl = `/search?query=${encodeURIComponent(query)}`;
            if (category) { searchUrl += `&category=${encodeURIComponent(category)}`; }
            url = searchUrl;
            break;
        case 'browse-listings': url = '/browse'; break;
        default: url = '/';
    }

    const currentScrollY = window.scrollY;
    if (window.location.pathname !== url) {
        history.pushState({ view, params, scrollY: currentScrollY }, '', url);
    } else {
        history.replaceState({ view, params, scrollY: currentScrollY }, '', url);
    }
}

// Function to parse URL and render the appropriate view on page load
function parseURL() {
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);

    const state = history.state;
    if (state && state.view && state.scrollY !== undefined) {
        renderView(state.view, state.params, false, state.scrollY);
        return;
    }

    const segments = path.replace(/^\/|\/$/g, '').split('/').map(s => s.toLowerCase());

    if (segments[0] === '') {
        return renderView('home');
    }

    switch (segments[0]) {
        case 'products': renderView('products'); break;
        case 'services': renderView('services'); break;
        case 'product':
        case 'service':
        case 'listing':
            if (segments[1]) { renderView('listing-detail', segments[1]); }
            else { renderView('home'); }
            break;
        case 'category':
            if (segments[1]) renderView('category', { category: segments[1] });
            else renderView('home');
            break;
        case 'profile':
            if (segments[1]) { renderView('profile', segments[1]); }
            else { currentUser ? renderView('profile', currentUser.slug || currentUser._id) : renderView('home'); }
            break;
        case 'dashboard': renderView('dashboard'); break;
        case 'favorites': renderView('favorites'); break;
        case 'settings': renderView('settings'); break;
        case 'about': renderView('about'); break;
        case 'contact': renderView('contact'); break;
        case 'search':
            const query = searchParams.get('query') || '';
            const category = searchParams.get('category') || '';
            if (query) DOMElements.searchInput.value = query;
            if (category) DOMElements.categorySelect.value = category;
            renderView('search');
        break;
        case 'browse': renderView('browse-listings'); break;
        default: renderView('home');
    }
}


async function renderView(view, params = {}, scrollToTop = true, initialScrollY = 0) {
    const thisRenderId = Date.now();
    setCurrentActiveRenderId(thisRenderId);

    updateURL(view, params);

    setCurrentView(view);
    DOMElements.mainContent.dataset.currentView = view;
    DOMElements.mainContent.dataset.currentListingId = null;
    DOMElements.mainContent.dataset.currentListingType = null;
    DOMElements.mainContent.dataset.currentProfileIdentifier = null;

    if (view === 'category') {
        setCurrentCategory(params.category);
        DOMElements.mainContent.dataset.currentCategory = params.category;
    }

    if (view !== 'search') {
        DOMElements.searchInput.removeAttribute('data-search-type');
    }

    updateActiveNavTab();

    DOMElements.mainContent.innerHTML = `
    <div class="not-found-container" style="background-color: transparent; box-shadow: none;">
    <div class="page-loading-spinner"></div>
    </div>
    `;

    if (!scrollToTop && initialScrollY !== undefined) {
        window.scrollTo(0, initialScrollY);
    } else if (scrollToTop) {
        window.scrollTo({ top: 0 });
    }

    try {
        switch (view) {
            case 'home': updatePageTitle('Keid List - Local Marketplace'); await renderHome(thisRenderId); break;
            case 'products': updatePageTitle('Products - Keid'); await renderProducts({ ...params, location: filterLocation }, thisRenderId); break;
            case 'services': updatePageTitle('Services - Keid'); await renderServices({ ...params, location: filterLocation }, thisRenderId); break;
            case 'category':
                // FIX APPLIED HERE: Use the new helper function to look up the category name
                const categoryName = getCategoryNameById(params.category);
                updatePageTitle(`${categoryName} - Keid`);
                await renderCategory(params, thisRenderId);
                break;
            case 'search':
                const query = DOMElements.searchInput.value.trim();
                updatePageTitle(`${query} - Keid Search`);
                await handleSearch(thisRenderId);
                break;
            case 'listing-detail': await renderListingDetail(params, thisRenderId); break; // No longer passing updateMetaTags
            case 'profile': await renderProfile(params, thisRenderId); break;
            case 'browse-listings': updatePageTitle('Browse - Keid'); await renderBrowseListings(thisRenderId); break;
            case 'dashboard': updatePageTitle('Dashboard - Keid'); await renderDashboard(thisRenderId); break;
            case 'favorites': updatePageTitle('Saved Listings - Keid'); await renderFavorites(thisRenderId); break;
            case 'settings': updatePageTitle('Settings - Keid'); await renderSettings(thisRenderId); break;
            case 'about': updatePageTitle('About Us - Keid'); renderAbout(thisRenderId); break;
            case 'contact': updatePageTitle('Contact Us - Keid'); renderContact(thisRenderId); break;
            default: updatePageTitle('Keid List - Local Marketplace'); await renderHome(thisRenderId);
        }

    } catch (error) {
        if (thisRenderId !== currentActiveRenderId) {
            console.warn(`Ignoring error for outdated render ID ${thisRenderId}. Current active ID is ${currentActiveRenderId}.`);
            return;
        }

        showMessage(error.message || 'Error loading content', 'error');
        console.error('Error rendering view:', error);
        DOMElements.mainContent.innerHTML = `
        <div class="error-container">
        <div class="not-found-content">
        <i class="fas fa-exclamation-triangle not-found-icon"></i>
        <h2 class="not-found-title">Oops! Something Went Wrong</h2>
        <p class="not-found-message">Something went wrong while loading this page. Please try again later.</p>
        <button class="btn-primary" id="go-home-btn">
        <i class="fas fa-home"></i> Go Back Home
        </button>
        </div>
        </div>
        `;
        document.getElementById('go-home-btn')?.addEventListener('click', () => {
            renderView('home');
        });
        initializeDOMElements();
    }
}

export {
    renderView,
    parseURL,
    updateURL,
    tempListingCache,
    updatePageTitle
};
