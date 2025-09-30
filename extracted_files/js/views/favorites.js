// js/views/favorites.js
import {
    currentUser,
    currentActiveRenderId,
    cachedUserFavorites,
    CACHE_DURATION,
    setCachedUserFavorites,
} from '../state.js';
import DOMElements, { initializeDOMElements } from '../dom.js';
import { userAPI } from '../api.js';
import {
    showMessage,
    createSkeletonCards,
} from '../utils.js';
import { createListingCard, addListingCardEventListeners } from '../listing-cards.js';
import { renderView, tempListingCache, updatePageTitle } from './core.js'; // Import from core

// Helper function to check if cache is fresh
function isCacheFresh(timestamp) {
    return (Date.now() - timestamp) < CACHE_DURATION;
}

export async function renderFavorites(renderId) {
    if (renderId !== currentActiveRenderId) return;

    updatePageTitle('Saved Listings - Keid'); // Ensure title is set

    if (!currentUser) {
        if (renderId !== currentActiveRenderId) return;
        DOMElements.mainContent.innerHTML = '<p>Please login to view your favorites</p>';
        initializeDOMElements();
        return;
    }

    const renderContent = async (validListings) => {
        if (renderId !== currentActiveRenderId) return;

        tempListingCache.clear();
        validListings.forEach(listing => tempListingCache.set(listing._id, listing));

        let listingsGrid = DOMElements.mainContent.querySelector('.listings-grid');
        if (!listingsGrid) {
            listingsGrid = document.createElement('div');
            listingsGrid.className = 'listings-grid';
            DOMElements.mainContent.appendChild(listingsGrid);
        }

        if (validListings && validListings.length > 0) {
            listingsGrid.innerHTML = validListings.map(listing =>
            createListingCard(listing)
            ).join('');
        } else {
            DOMElements.mainContent.innerHTML = `
            <div class="error-container">
            <div class="not-found-content">
            <i class="fas fa-bookmark not-found-icon"></i>
            <h2 class="not-found-title">No Saved Listings Yet</h2>
            <p class="not-found-message">You haven't saved any listings yet.</p>
            <button class="btn-primary" id="browse-listings-btn">
            <i class="fas fa-search"></i> Browse Listings
            </button>
            </div>
            </div>
            `;
        }
        addListingCardEventListeners();
        document.getElementById('browse-listings-btn')?.addEventListener('click', () => {
            renderView('home');
        });
    };

    const skeletonHtml = `
    <h2 class="section-title">Saved Listings</h2>
    <div class="listings-grid">${createSkeletonCards()}</div>
    `;
    if (renderId !== currentActiveRenderId) return;
    DOMElements.mainContent.innerHTML = skeletonHtml;
    initializeDOMElements();

    let favorites = [];
    let validListings = [];
    let useCached = false;

    if (isCacheFresh(cachedUserFavorites.timestamp) && cachedUserFavorites.data) {
        favorites = cachedUserFavorites.data;
        useCached = true;
        renderContent([]);
    }

    try {
        const latestFavorites = await userAPI.getUserFavorites(currentUser._id);
        if (renderId !== currentActiveRenderId) return;

        const latestValidListings = latestFavorites;

        setCachedUserFavorites(latestValidListings);

        if (!useCached || JSON.stringify(validListings) !== JSON.stringify(latestValidListings)) {
            await renderContent(latestValidListings);
        }

    } catch (error) {
        if (renderId !== currentActiveRenderId) return;
        console.error('Error rendering favorites:', error);
        showMessage('Failed to load favorites. Please try again.', 'error');

        DOMElements.mainContent.innerHTML = `
        <div class="error-container">
        <div class="not-found-content">
        <i class="fas fa-exclamation-triangle not-found-icon"></i>
        <p class="not-found-message">Error loading saved listings.</p>
        </div>
        <button class="btn-primary retry-favorites-btn">
        <i class="fas fa-sync-alt"></i> Try Again
        </button>
        </div>
        `;
        document.querySelector('.retry-favorites-btn')?.addEventListener('click', () => {
            renderView('favorites');
        });
        initializeDOMElements();
    }
}
