// js/interactions.js
import { currentUser } from './state.js';
import { interactionAPI, followerAPI, listingAPI } from './api.js';
import { showMessage, showLoadingDialog, hideLoadingDialog } from './utils.js';
import { openModal } from './modals.js';
import DOMElements from './dom.js';

async function handleLikeListing(listingId, event) {
    // Get the button from the event if available
    const button = event?.currentTarget || document.querySelector(`[data-id="${listingId}"] .listing-like, #like-listing-btn`);

    if (!button) {
        console.error('Like button not found for listing:', listingId);
        return;
    }

    if (!currentUser?._id) {
        showMessage('Please login to like listings', 'error');
        // Optionally open login modal
        openModal(DOMElements.loginModal);
        return;
    }

    // Set loading state
    button.disabled = true;
    const originalContent = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        // Use the new toggleLike function
        const response = await interactionAPI.toggleLike({ listingId: listingId });
        const isCurrentlyLiked = response.isLiked; // The API response tells us the new state

        // Fetch the updated listing to get the latest likes count
        // Note: The backend's toggleLike should ideally return the updated count directly.
        // If not, a separate fetch is needed. For now, we'll fetch the listing.
        const updatedListing = await listingAPI.getListing(listingId);
        const currentLikes = updatedListing.likesCount || 0; // Use likesCount from new backend

        // Update UI with the actual latest count from server
        updateLikeButtonUI(button, isCurrentlyLiked, listingId, currentLikes);
        showMessage(isCurrentlyLiked ? 'Liked!' : 'Removed like', 'success');

    } catch (error) {
        console.error('Like error:', error);
        showMessage(error.message || 'Failed to like', 'error');
        button.innerHTML = originalContent; // Restore original content on error
    } finally {
        button.disabled = false;
    }
}

// Updated UI updater to accept an explicit count
function updateLikeButtonUI(button, isLiked, listingId, likesCount) {
    // Use solid icon for liked, regular for unliked
    const iconClass = isLiked ? 'fas fa-thumbs-up liked-icon' : 'far fa-thumbs-up';

    // Use the provided count from server instead of calculating
    const newCount = likesCount;
    const likeText = newCount === 1 ? '1 Like' : `${newCount} Likes`;

    // Update button based on context
    if (button.id === 'like-listing-btn') {
        // Detail page button
        button.innerHTML = `
        <i class="${iconClass}"></i>
        ${likeText}
        `;
    } else {
        // Card view button
        button.innerHTML = '';
        const icon = document.createElement('i');
        icon.className = iconClass;
        button.appendChild(icon);
        button.appendChild(document.createTextNode(` ${likeText}`));
    }

    button.classList.toggle('active', isLiked);

    // Sync state across all buttons for this listing
    document.querySelectorAll(`.listing-like[data-id="${listingId}"]`).forEach(btn => {
        if (btn !== button) {
            btn.innerHTML = '';
            const newIcon = document.createElement('i');
            newIcon.className = iconClass;
            btn.appendChild(newIcon);
            btn.appendChild(document.createTextNode(` ${likeText}`));
            btn.classList.toggle('active', isLiked);
        }
    });
}

// Event listener for listing cards
function setupLikeButtons() {
    document.querySelectorAll('.listing-like').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            const listingId = button.closest('.listing-card')?.getAttribute('data-id') ||
            button.getAttribute('data-id');
            if (listingId) {
                await handleLikeListing(listingId, e);
            }
        });
    });

    // Like detail page
    DOMElements.mainContent.querySelector('#like-listing-btn')?.addEventListener('click', async (e) => {
        const currentListingId = DOMElements.mainContent.dataset.currentListingId;
        if (currentListingId) {
            await handleLikeListing(currentListingId, e);
        }
    });

    // Favorite button handlers
    document.querySelectorAll('.listing-favorite').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.stopPropagation();
            const listingId = button.closest('.listing-card')?.getAttribute('data-id') ||
            button.getAttribute('data-id');
            if (listingId) await handleFavoriteListing(listingId, e);
        });
    });

    // Detail page favorite button
    DOMElements.mainContent.querySelector('#favorite-listing-btn')?.addEventListener('click', async (e) => {
        const currentListingId = DOMElements.mainContent.dataset.currentListingId;
        if (currentListingId) await handleFavoriteListing(currentListingId, e);
    });
}

async function handleFavoriteListing(listingId, event) {
    // Get the button from event or DOM
    const button = event?.currentTarget ||
    document.querySelector(`[data-id="${listingId}"] .listing-favorite, #favorite-listing-btn`);

    if (!button) {
        console.error('Favorite button not found');
        return;
    }

    if (!currentUser?._id) {
        showMessage('Please login to save listings', 'error');
        // Optionally open login modal
        openModal(DOMElements.loginModal);
        return;
    }

    // Set loading state
    button.disabled = true;
    const originalContent = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        // Use the new toggleFavorite function
        const response = await interactionAPI.toggleFavorite({ listingId: listingId });
        const isCurrentlyFavorited = response.isFavorited; // The API response tells us the new state

        // Update UI
        updateFavoriteButtonUI(button, isCurrentlyFavorited, listingId);
        showMessage(isCurrentlyFavorited ? 'Saved!' : 'Unsaved', 'success');

    } catch (error) {
        console.error('Favorite error:', error);
        showMessage(error.message || 'Failed to save', 'error');
        button.innerHTML = originalContent; // Restore original content on error
    } finally {
        button.disabled = false;
    }
}

function updateFavoriteButtonUI(button, isFavorited, listingId) {
    // Use solid icon for favorited, regular for unfavorited
    const iconClass = isFavorited ? 'fas fa-bookmark favorited-icon' : 'far fa-bookmark';

    // Update button based on context
    if (button.id === 'favorite-listing-btn') {
        // Detail page button
        button.innerHTML = `
        <i class="${iconClass}"></i>
        <span>${isFavorited ? 'Saved' : 'Save'}</span>
        `;
    } else {
        // Card view button
        button.innerHTML = '';
        const icon = document.createElement('i');
        icon.className = iconClass;
        button.appendChild(icon);
    }

    button.classList.toggle('active', isFavorited);

    // Sync state across all buttons for this listing
    document.querySelectorAll(`.listing-favorite[data-id="${listingId}"]`).forEach(btn => {
        if (btn !== button) {
            btn.innerHTML = '';
            const newIcon = document.createElement('i');
            newIcon.className = iconClass;
            btn.appendChild(newIcon);
            btn.classList.toggle('active', isFavorited);
        }
    });
}

// Toggle follow status (follow/unfollow)
async function toggleFollowStatus(profileId) {
    // console.log('toggleFollowStatus called for profileId:', profileId); // Debugging
    // console.log('Current user:', currentUser); // Debugging

    if (!currentUser) {
        showMessage('Please login to follow users', 'error'); // Changed message
        openModal(DOMElements.loginModal);
        return;
    }

    const followBtn = document.getElementById('follow-profile-btn');
    const followerCountElement = document.getElementById('follower-count');
    // Extract number from text, handle "Followers" vs "Follower"
    let currentFollowerCount = parseInt(followerCountElement.textContent.split(' ')[0]) || 0;

    // Prevent multiple clicks
    if (followBtn.disabled) return;
    followBtn.disabled = true;
    followBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        // Use the new toggleFollow function
        const response = await followerAPI.toggleFollow(profileId);
        // console.log('toggleFollow API response:', response); // Debugging
        const isCurrentlyFollowing = response.isFollowing; // The API response tells us the new state

        if (isCurrentlyFollowing) {
            followBtn.classList.add('active');
            followBtn.innerHTML = '<i class="fas fa-user"></i> Following';
            currentFollowerCount += 1;
            showMessage('You are now following this user', 'success');
        } else {
            followBtn.classList.remove('active');
            followBtn.innerHTML = '<i class="far fa-user"></i> Follow';
            currentFollowerCount = Math.max(0, currentFollowerCount - 1); // Ensure not negative
            showMessage('You have unfollowed this user', 'success');
        }
        followerCountElement.textContent = `${currentFollowerCount === 1 ? '1 Follower' : `${currentFollowerCount} Followers`}`;

    } catch (error) {
        console.error('Error toggling follow status:', error);
        showMessage(error.message || 'Failed to update follow status. Please try again.', 'error');
    } finally {
        // Re-enable button
        followBtn.disabled = false;
    }
}

export { setupLikeButtons, handleLikeListing, handleFavoriteListing, toggleFollowStatus };
