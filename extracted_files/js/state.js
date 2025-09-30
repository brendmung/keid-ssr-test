// js/state.js
let currentUser = null;
let currentView = 'home';
let uploadedImages = [];
let currentSortBy = 'recommended'; // Default sorting option
let filterLocation = localStorage.getItem('selectedLocation') || 'all';
let currentCategory = '';
let currentListing = null;
let categories = {};
let locations = {};

let otpTimer;
let resendTimer;

// NEW: Add a variable to track the currently active render operation ID
let currentActiveRenderId = null;

// NEW: Caching variables
let cachedProducts = { data: null, timestamp: 0 };
let cachedServices = { data: null, timestamp: 0 };
let cachedCombinedListings = { data: null, timestamp: 0 }; // For browse-listings and home featured
let cachedUserListings = { data: null, timestamp: 0 }; // For dashboard/profile listings
let cachedUserFavorites = { data: null, timestamp: 0 }; // For favorites view
// Changed to cache by slug instead of _id for profiles and listings
let cachedUserProfile = {}; // Object to store profiles by userId/slug: { identifier: { data: userObject, timestamp: 0 } }
let cachedListingDetails = {}; // Object to store listing details by listingId/slug: { identifier: { data: listingObject, timestamp: 0 } }

// NEW: Caching variables for static data (categories and locations)
let cachedStaticCategories = { data: null, version: null };
let cachedStaticLocations = { data: null, version: null };


const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export {
    currentUser,
    currentView,
    uploadedImages,
    currentSortBy,
    filterLocation,
    currentCategory,
    currentListing,
    categories,
    locations,
    otpTimer,
    resendTimer,
    currentActiveRenderId,
    cachedProducts,
    cachedServices,
    cachedCombinedListings,
    cachedUserListings,
    cachedUserFavorites,
    cachedUserProfile,
    cachedListingDetails,
    cachedStaticCategories, // Export new static cache variables
    cachedStaticLocations,  // Export new static cache variables
    CACHE_DURATION,
};

export function setCurrentUser(user) {
    currentUser = user;
}

export function setCurrentView(view) {
    currentView = view;
}

export function setUploadedImages(images) {
    uploadedImages = images;
}

export function addUploadedImage(image) {
    uploadedImages.push(image);
}

export function removeUploadedImage(index) {
    uploadedImages.splice(index, 1);
}

export function setCurrentSortBy(sortBy) {
    currentSortBy = sortBy;
}

export function setFilterLocation(location) {
    filterLocation = location;
    localStorage.setItem('selectedLocation', location);
}

export function setCurrentCategory(category) {
    currentCategory = category;
}

export function setCurrentListing(listing) {
    currentListing = listing;
}

export function setCategories(data) {
    categories = data;
}

export function setLocations(data) {
    locations = data;
}

export function setOtpTimer(timer) {
    otpTimer = timer;
}

export function setResendTimer(timer) {
    resendTimer = timer;
}

export function setCurrentActiveRenderId(id) {
    currentActiveRenderId = id;
}

// NEW: Cache setters
export function setCachedProducts(data) {
    cachedProducts = { data, timestamp: Date.now() };
}

export function setCachedServices(data) {
    cachedServices = { data, timestamp: Date.now() };
}

export function setCachedCombinedListings(data) {
    cachedCombinedListings = { data, timestamp: Date.now() };
}

export function setCachedUserListings(data) {
    cachedUserListings = { data, timestamp: Date.now() };
}

export function setCachedUserFavorites(data) {
    cachedUserFavorites = { data, timestamp: Date.now() };
}

// Store user profile by slug (or _id if slug is not available, though it should be)
export function setCachedUserProfile(identifier, data) {
    cachedUserProfile[identifier] = { data, timestamp: Date.now() };
}

// Store listing details by slug (or _id if slug is not available)
export function setCachedListingDetails(identifier, data) {
    cachedListingDetails[identifier] = { data, timestamp: Date.now() };
}

// NEW: Setters for static cache
export function setCachedStaticCategories(data, version) {
    cachedStaticCategories = { data, version };
    localStorage.setItem('cachedStaticCategories', JSON.stringify({ data, version }));
}

export function setCachedStaticLocations(data, version) {
    cachedStaticLocations = { data, version };
    localStorage.setItem('cachedStaticLocations', JSON.stringify({ data, version }));
}
