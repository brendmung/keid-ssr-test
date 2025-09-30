// js/listing-cards.js
import { currentUser } from './state.js';
import { getLocationName } from './locations-categories.js';
import { setupLikeButtons } from './interactions.js';
import { renderView, tempListingCache } from './views/core.js'; // Updated import path for renderView and tempListingCache
import { setupRevealAnimation } from './utils.js';
// Import the necessary functions for edit/delete
import { openEditListingModal, handleDeleteListing } from './listing-management.js'; // ADD THIS IMPORT

function createListingCard(listing, options = {}) {
    if (!listing) return '';

    const {
        isDashboard = false,
        hideLikes = false,
        hideListedBy = false,
        hideLocation = false
    } = options;

    const isLiked = currentUser && listing.isLiked;
    const isFavorited = currentUser && listing.isFavorited;

    const userProfileIdentifier = listing.userId?.slug || listing.userId?._id || listing.userId;

    return `
    <div class="listing-card" data-id="${listing._id}">
    <div class="listing-image" style="background-image: url('${listing.images[0]}')">
    <div class="listing-type ${listing.type === 'product' ? 'type-product' : 'type-service'}">${listing.type}</div>
    </div>
    <div class="listing-content">
    <h3 class="listing-title">${listing.title}</h3>
    <p class="listing-price">$${listing.price}</p>
    ${!hideLocation ? `
        <p class="listing-location"><i class="fas fa-map-marker-alt"></i> ${getLocationName(listing.location)}</p>
        ` : ''}
        ${!hideListedBy ? `
            <p class="listing-lister"><i class="fas fa-user"></i> Listed by: <a href="#" class="view-owner-profile-link" data-user-identifier="${userProfileIdentifier}">${listing.userId?.displayName || 'View Profile'}</a></p>
            ` : ''}
            <div class="listing-actions">
            ${isDashboard ? `
                <button class="btn-info btn-sm edit-listing-card-btn" data-id="${listing._id}">Edit</button>
                <button class="btn-danger btn-sm delete-listing-card-btn" data-id="${listing._id}">Delete</button>
                ` : `
                ${!hideLikes ? `
                    <button class="listing-like ${isLiked ? 'active' : ''}" data-id="${listing._id}">
                    <i class="${isLiked ? 'fas' : 'far'} fa-thumbs-up ${isLiked ? 'liked-icon' : ''}"></i> ${listing.likesCount || 0}
                    </button>
                    <button class="listing-favorite ${isFavorited ? 'active' : ''}" data-id="${listing._id}">
                    <i class="${isFavorited ? 'fas' : 'far'} fa-bookmark ${isFavorited ? 'favorited-icon' : ''}"></i>
                    </button>
                    ` : ''}
                    `}
                    </div>
                    </div>
                    </div>
                    `;
}

function createUserCard(user) {
    if (!user) return '';
    const userProfileIdentifier = user.slug || user._id;
    return `
    <div class="user-card" data-user-identifier="${userProfileIdentifier}">
    <img src="${user.profilePic || '/default-profile.png'}" alt="${user.displayName}" class="user-card-avatar">
    <h3 class="user-card-name">${user.displayName}</h3>
    <p class="user-card-stats">${user.totalListings || 0} Listings | ${user.likesReceived || 0} Listing Likes</p>
    <button class="btn-primary btn-sm view-profile-btn">View Profile</button>
    </div>
    `;
}

function addListingCardEventListeners() {
    setupLikeButtons();

    // Event listener for the entire listing card (to view details)
    document.querySelectorAll('.listing-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Prevent opening detail view if a specific button inside the card was clicked
            if (!e.target.closest('.listing-like, .listing-favorite, .edit-listing-card-btn, .delete-listing-card-btn, .view-owner-profile-link')) {
                const listingId = card.getAttribute('data-id');
                if (listingId) {
                    const fullListingObject = tempListingCache.get(listingId);
                    if (fullListingObject) {
                        renderView('listing-detail', fullListingObject);
                    } else {
                        console.warn(`Listing with ID ${listingId} not found in tempListingCache, fetching from API.`);
                        renderView('listing-detail', listingId);
                    }
                }
            }
        });
    });

    // ADDED: Event listeners for edit buttons on listing cards
    document.querySelectorAll('.edit-listing-card-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation(); // Prevent the parent listing-card click event
            const listingId = button.getAttribute('data-id');
            if (listingId) {
                await openEditListingModal(listingId);
            }
        });
    });

    // ADDED: Event listeners for delete buttons on listing cards
    document.querySelectorAll('.delete-listing-card-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation(); // Prevent the parent listing-card click event
            const listingId = button.getAttribute('data-id');
            if (listingId) {
                if (confirm("Are you sure you want to delete this listing? This action cannot be undone.")) {
                    await handleDeleteListing(listingId);
                }
            }
        });
    });

    document.querySelectorAll('.view-owner-profile-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const userIdentifier = link.getAttribute('data-user-identifier');
            renderView('profile', userIdentifier);
        });
    });

    document.querySelectorAll('.user-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.view-profile-btn')) {
                const userIdentifier = card.getAttribute('data-user-identifier');
                renderView('profile', userIdentifier);
            }
        });
    });

    document.querySelectorAll('.user-card .view-profile-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const userIdentifier = button.closest('.user-card').getAttribute('data-user-identifier');
            renderView('profile', userIdentifier);
        });
    });

    setupRevealAnimation();
}

export { createListingCard, createUserCard, addListingCardEventListeners };
