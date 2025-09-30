// js/api.js
import { API_BASE_URL } from './config.js';

// Token handling functions (no change needed here)
function setToken(token) {
    localStorage.setItem('userToken', token);
}

function getToken() {
    return localStorage.getItem('userToken');
}

function removeToken() {
    localStorage.removeItem('userToken');
}

// Base fetch API function - handles consistent backend response format
async function fetchAPI(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        const result = await response.json(); // All backend responses will have JSON data

        if (!response.ok) {
            // Backend now consistently returns { message: "Error details" } on !ok
            throw new Error(result.message || 'API request failed');
        }

        return result; // Successful responses also contain `success: true` and data
    } catch (error) {
        console.error('API Error:', error);
        throw error; // Re-throw to be caught by calling functions (e.g., in views)
    }
}

// Authenticated fetch API function - adds Authorization header
async function fetchAPIWithAuth(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers,
            ...options
        });

        const result = await response.json(); // All backend responses will have JSON data

        if (!response.ok) {
            // Backend now consistently returns { message: "Error details" } on !ok
            throw new Error(result.message || 'API request failed');
        }

        return result;
    } catch (error) {
        console.error('API Error (Auth):', error);
        throw error;
    }
}

// User API functions - Updated to new backend structure
const userAPI = {
    login: async (email, password) => {
        const res = await fetchAPI('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        return res; // Returns { success: true, user: {...}, token: "..." }
    },

    signup: async (name, email, password) => {
        const res = await fetchAPI('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });
        return res; // Returns { success: true, message: "OTP sent..." }
    },

    // New: Pass `isSignup` flag to backend for OTP verification context
    verifyOTP: async (email, otp, isSignup = false) => {
        const res = await fetchAPI(`/auth/verify-otp${isSignup ? '?signup=true' : ''}`, {
            method: 'POST',
            body: JSON.stringify({ email, otp })
        });
        return res; // For signup: { success: true, user: {...}, token: "..." }, for forgot-password: { success: true, resetToken: "..." }
    },

    forgotPassword: async (email) => {
        const res = await fetchAPI('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
        return res; // Returns { success: true, message: "OTP sent..." }
    },

    resetPassword: async (resetToken, password) => {
        const res = await fetchAPI('/auth/reset-password/' + resetToken, {
            method: 'PUT',
            body: JSON.stringify({ password })
        });
        return res; // Returns { success: true, message: "Password reset..." }
    },

    verifyAuth: async () => {
        const res = await fetchAPIWithAuth('/auth/verify');
        return res; // Returns { success: true, isValid: true, user: {...} }
    },

    // Modified to accept identifier (ID or slug)
    // *** CHANGE: Use fetchAPIWithAuth to get isFollowing status if authenticated ***
    getProfile: async (identifier) => {
        const res = await fetchAPIWithAuth(`/users/${identifier}`);
        return res.user; // Backend returns { success: true, user: {...}, isFollowing: boolean (if authenticated and target is followed) }
    },

    // NEW: Function to get a list of users with filtering/sorting/pagination
    getUsers: async (params = {}) => {
        const queryParams = new URLSearchParams(params);
        const res = await fetchAPIWithAuth(`/users?${queryParams.toString()}`);
        return res.users; // Returns array of users
    },

    updateProfile: async (userId, userData) => {
        const res = await fetchAPIWithAuth(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
        return res.user; // Backend returns { success: true, user: {...} }
    },

    updatePassword: async (userId, password) => { // New function for password update
        const res = await fetchAPIWithAuth(`/users/${userId}/password`, {
            method: 'PUT',
            body: JSON.stringify({ password })
        });
        return res; // Returns { success: true, message: "Password updated..." }
    },

    // Modified to accept identifier (ID or slug)
    getUserListings: async (identifier) => {
        // FIX: Changed to use fetchAPIWithAuth to get user-specific like/favorite status
        const res = await fetchAPIWithAuth(`/users/${identifier}/listings`);
        return res.listings; // Returns { success: true, listings: [...] }
    },

    getUserFavorites: async (userId) => {
        const res = await fetchAPIWithAuth(`/users/${userId}/favorites`); // Private endpoint
        return res.listings; // Returns { success: true, listings: [...] }
    },
};


// Listings API functions - Consolidated to one /api/listings endpoint
const listingAPI = {
    // New consolidated function to get all listings (products or services) with filters
    getAllListings: async (type = null, category = null, location = null, query = null, sort = null) => {
        const queryParams = new URLSearchParams();
        if (type) queryParams.append('type', type);
        if (category) queryParams.append('category', category);
        if (location) queryParams.append('location', location);
        if (query) queryParams.append('query', query);
        if (sort) queryParams.append('sort', sort);
        const res = await fetchAPIWithAuth(`/listings?${queryParams.toString()}`); // Using Auth for `isLiked/isFavorited` flags
        return res.listings; // Returns { success: true, listings: [...] }
    },

    // Modified to accept identifier (ID or slug)
    getListing: async (identifier) => {
        const res = await fetchAPIWithAuth(`/listings/${identifier}`); // Using Auth for `isLiked/isFavorited` flags
        return res.listing; // Returns { success: true, listing: {...} }
    },

    createListing: async (listingData) => {
        const res = await fetchAPIWithAuth('/listings', {
            method: 'POST',
            body: JSON.stringify(listingData)
        });
        return res.listing; // Returns { success: true, listing: {...} }
    },

    updateListing: async (id, listingData) => {
        const res = await fetchAPIWithAuth(`/listings/${id}`, { // Still uses ID for update
            method: 'PUT',
            body: JSON.stringify(listingData)
        });
        return res.listing; // Returns { success: true, listing: {...} }
    },

    deleteListing: async (id) => {
        const res = await fetchAPIWithAuth(`/listings/${id}`, { // Still uses ID for delete
            method: 'DELETE'
        });
        return res; // Returns { success: true, message: "..." }
    },

    // Frontend search will now call the general getAllListings with query parameters
    search: async (query, category, location) => {
        const res = await listingAPI.getAllListings(null, category, location, query, null);
        return res; // Returns array of listings
    }
};

// Interactions API functions - Updated to new backend toggle logic
const interactionAPI = {
    // Toggles favorite status, handles creation/deletion on backend
    toggleFavorite: async ({ listingId }) => {
        const res = await fetchAPIWithAuth('/interactions/favorite', {
            method: 'POST',
            body: JSON.stringify({ listingId })
        });
        return res; // Returns { success: true, isFavorited: boolean, message: "..." }
    },

    // Checks current favorite status for a listing by the current user
    getFavoriteStatus: async (listingId) => {
        const res = await fetchAPIWithAuth(`/interactions/favorite/status/${listingId}`);
        return res; // Returns { success: true, isFavorited: boolean, favoriteId: string|null }
    },

    // Toggles like status for a listing or profile, handles creation/deletion on backend
    toggleLike: async ({ listingId = null, profileId = null }) => {
        const body = listingId ? { listingId } : { profileId };
        const res = await fetchAPIWithAuth('/interactions/like', {
            method: 'POST',
            body: JSON.stringify(body)
        });
        return res; // Returns { success: true, isLiked: boolean, message: "..." }
    },

    // Checks current like status for a listing or profile by the current user
    getLikeStatus: async (targetId) => { // targetId can be listingId or profileId
        const res = await fetchAPIWithAuth(`/interactions/like/status/${targetId}`);
        return res; // Returns { success: true, isLiked: boolean, likeId: string|null }
    },
};

// Followers API functions - Updated to new backend toggle logic
const followerAPI = {
    // Toggles follow status, handles creation/deletion on backend
    toggleFollow: async (followedId) => {
        const res = await fetchAPIWithAuth('/interactions/follow', {
            method: 'POST',
            body: JSON.stringify({ followedId })
        });
        return res; // Returns { success: true, isFollowing: boolean, message: "..." }
    },

    // Checks current follow status between current user and target user
    getFollowStatus: async (followedId) => {
        const res = await fetchAPIWithAuth(`/interactions/follow/status/${followedId}`);
        return res; // Returns { success: true, isFollowing: boolean, followId: string|null }
    },
    // Follower and following counts are now part of the user profile directly
    getFollowerCount: async (userId) => {
        const user = await userAPI.getProfile(userId); // Get full profile
        return user.followerCount || 0;
    },
    getFollowingCount: async (userId) => {
        const user = await userAPI.getProfile(userId); // Get full profile
        return user.followingCount || 0;
    },
    // These methods are not directly mapped to backend now, but can be derived from user profile if needed
    getUserFollowers: async (userId) => {
        console.warn('getUserFollowers is not directly supported by new backend API structure for public display.');
        return []; // Placeholder or remove if not used for detailed lists
    },
    getUserFollowing: async (userId) => {
        console.warn('getUserFollowing is not directly supported by new backend API structure for public display.');
        return []; // Placeholder or remove if not used for detailed lists
    }
};

// NEW: Report API functions
const reportAPI = {
    submitReport: async (reportedUserId, reason, description) => {
        const res = await fetchAPIWithAuth('/reports', {
            method: 'POST',
            body: JSON.stringify({ reportedUserId, reason, description })
        });
        return res; // Returns { success: true, message: "..." }
    }
};

export { setToken, getToken, removeToken, userAPI, listingAPI, interactionAPI, followerAPI, reportAPI };
