// js/views/dashboard.js
import {
    currentUser,
    currentActiveRenderId,
    cachedUserProfile,
    cachedUserListings,
    cachedUserFavorites,
    CACHE_DURATION,
    setCachedUserProfile,
    setCachedUserListings,
    setCachedUserFavorites,
} from '../state.js';
import DOMElements, { initializeDOMElements } from '../dom.js';
import { userAPI } from '../api.js';
import {
    showMessage,
    createSkeletonCards,
} from '../utils.js';
import { createListingCard, addListingCardEventListeners } from '../listing-cards.js';
import { openListingCreator } from '../listing-management.js';
import { renderView, tempListingCache, updatePageTitle } from './core.js'; // Import from core

// Helper function to check if cache is fresh
function isCacheFresh(timestamp) {
    return (Date.now() - timestamp) < CACHE_DURATION;
}

export async function renderDashboard(renderId) {
    if (renderId !== currentActiveRenderId) return;

    updatePageTitle('Dashboard - Keid'); // Ensure title is set

    if (!currentUser) {
        if (renderId !== currentActiveRenderId) return;
        DOMElements.mainContent.innerHTML = '<p>Please login to access the dashboard</p>';
        initializeDOMElements();
        return;
    }

    const renderContent = (userProfile, userListings, favorites) => {
        if (renderId !== currentActiveRenderId) return;

        tempListingCache.clear();
        userListings.forEach(listing => tempListingCache.set(listing._id, listing));
        favorites.forEach(listing => tempListingCache.set(listing._id, listing));

        const hasListings = userListings && userListings.length > 0;
        const html = `
        <div class="dashboard-container">
        <div class="dashboard-sidebar">
        <ul class="dashboard-nav">
        <li><a href="#" class="active" id="dashboard-tab"><i class="fas fa-tachometer-alt"></i> Overview</a></li>
        <li><a href="#" id="listings-tab"><i class="fas fa-list"></i> My Listings</a></li>
        </ul>
        </div>
        <div class="dashboard-content">
        <div class="dashboard-header">
        <h2 class="dashboard-title">Dashboard</h2>
        <button class="btn-success" id="add-listing-btn">Add Listing</button>
        </div>

        <div id="overview-content" class="tab-content active">
        <div class="dashboard-stats">
        <div class="stat-card">
        <div class="stat-value">${userProfile.likesReceived || 0}</div>
        <div class="stat-label">Total Likes</div>
        </div>
        <div class="stat-card">
        <div class="stat-value">${userProfile.totalListings || 0}</div>
        <div class="stat-label">Total Listings</div>
        </div>
        <div class="stat-card">
        <div class="stat-value">${favorites && favorites.length || 0}</div>
        <div class="stat-label">Saved Listings</div>
        </div>
        <div class="stat-card">
        <div class="stat-value">${getMostPopularListing(userListings)}</div>
        <div class="stat-label">Your Popular Listing</div>
        </div>
        </div>
        </div>

        <div id="listings-content" class="tab-content">
        <h3 class="section-title">My Listings</h3>
        ${hasListings ? `
            <div class="listings-grid">
            ${userListings.map(listing => createListingCard(listing, { isDashboard: true, hideListedBy: true })).join('')}
            </div>
            ` : `
            <div class="not-found-compressed">
            <div class="not-found-content">
            <i class="fas fa-box-open not-found-icon"></i>
            <h2 class="not-found-title">No Listings</h2>
            <p class="not-found-message">
            You haven't added any listings yet.
            </p>
            </div>
            </div>
            `}
            </div>
            </div>
            </div>
            `;

            if (renderId !== currentActiveRenderId) return;
            DOMElements.mainContent.innerHTML = html;
        initializeDOMElements();

        document.getElementById('dashboard-tab')?.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('overview-content');
        });

        document.getElementById('listings-tab')?.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('listings-content');
        });

        document.getElementById('add-listing-btn')?.addEventListener('click', openListingCreator);
        document.getElementById('add-first-listing-btn')?.addEventListener('click', openListingCreator);
        addListingCardEventListeners();
    };

    const skeletonHtml = `
    <div class="dashboard-container">
    <div class="dashboard-sidebar">
    <ul class="dashboard-nav">
    <li><a href="#" class="active"><i class="fas fa-tachometer-alt"></i> Overview</a></li>
    <li><a href="#"><i class="fas fa-list"></i> My Listings</li>
    </ul>
    </div>
    <div class="dashboard-content">
    <div class="dashboard-header">
    <h2 class="dashboard-title">Dashboard</h2>
    <button class="btn-success" id="add-listing-btn">Add Listing</button>
    </div>
    <div id="overview-content" class="tab-content active">
    <div class="dashboard-stats">
    <div class="stat-card">
    <div class="skeleton-title" style="width: 70%; height: 36px; margin: 0 auto 5px auto;"></div>
    <div class="skeleton-meta" style="width: 50%; height: 16px; margin: 0 auto;"></div>
    </div>
    <div class="stat-card">
    <div class="skeleton-title" style="width: 70%; height: 36px; margin: 0 auto 5px auto;"></div>
    <div class="skeleton-meta" style="width: 50%; height: 16px; margin: 0 auto;"></div>
    </div>
    <div class="stat-card">
    <div class="skeleton-title" style="width: 70%; height: 36px; margin: 0 auto 5px auto;"></div>
    <div class="skeleton-meta" style="width: 50%; height: 16px; margin: 0 auto;"></div>
    </div>
    <div class="stat-card">
    <div class="skeleton-title" style="width: 70%; height: 36px; margin: 0 auto 5px auto;"></div>
    <div class="skeleton-meta" style="width: 50%; height: 16px; margin: 0 auto;"></div>
    </div>
    </div>
    </div>
    <div id="listings-content" class="tab-content">
    <h3 class="section-title">My Listings</h3>
    <div class="listings-grid">
    ${createSkeletonCards()}
    </div>
    </div>
    </div>
    </div>
    `;
    if (renderId !== currentActiveRenderId) return;
    DOMElements.mainContent.innerHTML = skeletonHtml;
    initializeDOMElements();

    document.getElementById('add-listing-btn')?.addEventListener('click', openListingCreator);


    let userProfile = null;
    let userListings = [];
    let favorites = [];
    let useCached = false;

    if (isCacheFresh(cachedUserProfile[currentUser.slug]?.timestamp) && cachedUserProfile[currentUser.slug]?.data &&
        isCacheFresh(cachedUserListings.timestamp) && cachedUserListings.data &&
        isCacheFresh(cachedUserFavorites.timestamp) && cachedUserFavorites.data) {
        userProfile = cachedUserProfile[currentUser.slug].data;
    userListings = cachedUserListings.data;
    favorites = cachedUserFavorites.data;
    useCached = true;
    renderContent(userProfile, userListings, favorites);
        }

        try {
            const latestUserProfile = await userAPI.getProfile(currentUser.slug);
            if (renderId !== currentActiveRenderId) return;

            const latestUserListings = await userAPI.getUserListings(currentUser.slug);
            if (renderId !== currentActiveRenderId) return;

            const latestFavorites = await userAPI.getUserFavorites(currentUser._id);
            if (renderId !== currentActiveRenderId) return;

            setCachedUserProfile(currentUser.slug, latestUserProfile);
            setCachedUserListings(latestUserListings);
            setCachedUserFavorites(latestFavorites);

            if (!useCached || JSON.stringify(userProfile) !== JSON.stringify(latestUserProfile) || JSON.stringify(userListings) !== JSON.stringify(latestUserListings) || JSON.stringify(favorites) !== JSON.stringify(latestFavorites)) {
                renderContent(latestUserProfile, latestUserListings, latestFavorites);
            }

        } catch (error) {
            if (renderId !== currentActiveRenderId) return;
            console.error('Error rendering dashboard:', error);
            showMessage(error.message || 'Error loading dashboard', 'error');
            DOMElements.mainContent.innerHTML = failedFetchDisplay;
            document.getElementById('retry-fetch-btn')?.addEventListener('click', () => {
                renderView('dashboard');
            });
            initializeDOMElements();
        }
}

export function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(tabId)?.classList.add('active');
    document.querySelectorAll('.dashboard-nav a').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`.dashboard-nav a[id="${tabId.replace('-content', '-tab')}"]`)?.classList.add('active');
}

export function getMostPopularListing(userListings) {
    if (!userListings || userListings.length === 0) return 'N/A';
    const mostPopular = userListings.reduce((prev, current) =>
    (prev.likesCount > current.likesCount) ? prev : current,
                                            { likesCount: -1, title: 'N/A' }
    );
    return mostPopular.title || 'N/A';
}
