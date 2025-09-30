// js/views/profile.js
import {
    currentUser,
    setCurrentUser,
    currentActiveRenderId,
    cachedUserProfile,
    cachedUserListings,
    cachedUserFavorites,
    CACHE_DURATION,
    setCachedUserProfile,
    setCachedUserListings,
    setCachedUserFavorites,
} from '../state.js';
import { updateAuthUI } from '../auth.js';
import DOMElements, { initializeDOMElements } from '../dom.js';
import { userAPI, followerAPI, reportAPI } from '../api.js'; // Import reportAPI
import {
    showMessage,
    createSkeletonCards,
    compressImage,
    formatDescriptionForDisplay,
        showLoadingDialog,
        hideLoadingDialog
} from '../utils.js';
import { createListingCard, addListingCardEventListeners } from '../listing-cards.js';
import { getLocationName } from '../locations-categories.js';
import { openContactModal } from '../contact.js'; // From new contact module
import { toggleFollowStatus } from '../interactions.js';
import { openModal, closeModal } from '../modals.js';
import { IMGBB_API_KEY } from '../config.js';
import { renderView, updatePageTitle } from './core.js'; // Import from core

// Helper function to check if cache is fresh
function isCacheFresh(timestamp) {
    return (Date.now() - timestamp) < CACHE_DURATION;
}

// Helper function to open full image view
function openFullImage(imageSrc) {
    if (DOMElements.fullImageView && DOMElements.fullImage) {
        DOMElements.fullImage.src = imageSrc;
        DOMElements.fullImageView.style.display = 'flex';

        const closeHandler = () => {
            DOMElements.fullImageView.style.display = 'none';
            DOMElements.fullImageView.removeEventListener('click', closeHandler);
            if (DOMElements.closeFullImage) {
                DOMElements.closeFullImage.removeEventListener('click', closeHandler);
            }
        };

        DOMElements.fullImageView.addEventListener('click', closeHandler);
        if (DOMElements.closeFullImage) {
            DOMElements.closeFullImage.addEventListener('click', closeHandler);
        }
    }
}

// Modified to accept identifier (slug or ID)
export async function renderProfile(identifier, renderId) {
    if (renderId !== currentActiveRenderId) return;

    let profileIdentifier = identifier;
    if (typeof identifier === 'object' && identifier !== null) {
        if (identifier.slug) {
            profileIdentifier = identifier.slug;
        } else if (identifier._id) {
            profileIdentifier = identifier._id;
        } else {
            console.error('renderProfile received an object without slug or _id:', identifier);
            showMessage('Invalid profile identifier. Cannot load profile.', 'error');
            DOMElements.mainContent.innerHTML = `
            <div class="not-found-container">
            <div class="not-found-content">
            <i class="fas fa-exclamation-triangle not-found-icon"></i>
            <h2 class="not-found-title">Invalid Profile Link</h2>
            <p class="not-found-message">The link you followed is invalid or incomplete.</p>
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
            return;
        }
    } else if (typeof identifier !== 'string') {
        console.error('renderProfile received unexpected identifier type:', identifier);
        showMessage('Invalid profile identifier. Cannot load profile.', 'error');
        DOMElements.mainContent.innerHTML = `
        <div class="not-found-container">
        <div class="not-found-content">
        <i class="fas fa-exclamation-triangle not-found-icon"></i>
        <h2 class="not-found-title">Invalid Profile Link</h2>
        <p class="not-found-message">The link you followed is invalid or incomplete.</p>
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
        return;
    }

    // Check if user is logged in and trying to view a profile that isn't their own
    if (!currentUser && profileIdentifier !== (currentUser?.slug || currentUser?._id)) {
        showMessage('Please login to view this profile.', 'error');
        if (renderId !== currentActiveRenderId) return;
        DOMElements.mainContent.innerHTML = '<p>You need to be logged in to view this profile.</p>';
        initializeDOMElements();
        return;
    }


    DOMElements.mainContent.dataset.currentProfileIdentifier = profileIdentifier;

    const renderContent = async (user, listings, favorites, followerCount, isFollowing, isOwnProfile) => {
        if (renderId !== currentActiveRenderId) return;

        updatePageTitle(`${user.displayName} - Keid`);

        const hasListings = listings && listings.length > 0;
        const html = `
        <div class="profile-header">
        <img src="${user.profilePic}" alt="Profile Picture" class="profile-avatar" id="profile-pic-display">
        <div class="profile-info">
        <h1 class="profile-name">${user.displayName}</h1>
        <div class="profile-meta">
        <div><i class="fas fa-calendar-alt"></i> Joined ${new Date(user.joinedDate).toLocaleDateString()}</div>
        <div><i class="fas fa-map-marker-alt"></i> ${getLocationName(user.location)}</div>
        </div>
        <div class="profile-stats">
        <div class="profile-stat">
        <i class="fas fa-user-friends"></i> <span id="follower-count">${followerCount === 1 ? '1 Follower' : `${followerCount || 0} Followers`}</span>
        </div>
        <div class="profile-stat">
        <i class="fas fa-list"></i> ${user.totalListings === 1 ? '1 Listing' : `${user.totalListings || 0} Listings`}
        </div>
        </div>
        <div class="profile-actions">
        ${!isOwnProfile ? `
            <button class="btn-primary" id="contact-user-btn">
            <i class="fas fa-envelope"></i> Contact
            </button>
            <button class="btn-success ${isFollowing ? 'active' : ''}" id="follow-profile-btn">
            <i class="${isFollowing ? 'fas' : 'far'} fa-user"></i> ${isFollowing ? 'Following' : 'Follow'}
            </button>
            <button class="btn-danger" id="report-user-btn" data-reported-user-id="${user._id}" data-reported-user-name="${user.displayName}">
            <i class="fas fa-flag"></i>
            </button>
            ` : `
            <button class="btn-info" id="edit-profile-btn">
            <i class="fas fa-edit"></i> Edit Profile
            </button>
            <button class="btn-info" id="share-profile-btn">
            <i class="fas fa-share-alt"></i> Share
            </button>
            `}
            </div>
            </div>
            </div>

            <div class="tab-container">
            <div class="tabs">
            <div class="tab active" id="tab-listings">Listings</div>
            ${isOwnProfile ? `<div class="tab" id="tab-saved">Saved</div>` : ''}
            <div class="tab" id="tab-about">About</div>
            </div>
            <div class="tab-content active" id="tab-content-listings">
            <h2 class="section-title">Listings</h2>
            ${hasListings ? `
                <div class="listings-grid">
                ${listings.map(listing => createListingCard(listing, { hideListedBy: true })).join('')}
                </div>
                ` : `
                <div class="not-found-compressed">
                <div class="not-found-content">
                <i class="fas fa-box-open not-found-icon"></i>
                <h2 class="not-found-title">No Listings Yet</h2>
                <p class="not-found-message">
                ${isOwnProfile ? `
                    You haven't added any listings yet. Use the dashboard when ready!
                    ` : `
                    ${user.displayName} hasn't added any listings yet.
                    `}
                    </p>
                    </div>
                    </div>
                    `}
                    </div>
                    ${isOwnProfile ? `
                        <div class="tab-content" id="tab-content-saved">
                        <h3 class="section-title">Saved Listings</h3>
                        ${favorites && favorites.length > 0 ? `
                            <div class="listings-grid">
                            ${favorites.map(listing => createListingCard(listing)).join('')}
                            </div>
                            ` : `
                            <div class="not-found-compressed">
                            <div class="not-found-content">
                            <i class="fas fa-bookmark not-found-icon"></i>
                            <h2 class="not-found-title">No Saved Listings Yet</h2>
                            <p class="not-found-message">You haven't saved any listings yet.</p>
                            <button class="btn-primary" id="browse-listings-from-profile-btn">
                            <i class="fas fa-search"></i> Browse Listings
                            </button>
                            </div>
                            </div>
                            `}
                            </div>
                            ` : ''}
                            <div class="tab-content" id="tab-content-about">
                            <h2 class="section-title">About</h2>
                            <p>${formatDescriptionForDisplay(user.bio || 'No bio available')}</p>
                            </div>
                            </div>
                            `;

                            if (renderId !== currentActiveRenderId) return;
                            DOMElements.mainContent.innerHTML = html;
        initializeDOMElements();

        document.getElementById('profile-pic-display')?.addEventListener('click', () => {
            openFullImage(user.profilePic);
        });

        if (!isOwnProfile) {
            document.getElementById('contact-user-btn')?.addEventListener('click', () => {
                openContactModal(user);
            });
            document.getElementById('follow-profile-btn')?.addEventListener('click', () => {
                toggleFollowStatus(user._id);
            });
            // NEW: Event listener for Report User button
            document.getElementById('report-user-btn')?.addEventListener('click', () => {
                openReportUserModal(user);
            });
        }

        if (isOwnProfile) {
            document.getElementById('edit-profile-btn')?.addEventListener('click', () => {
                openEditProfileModal(user);
            });
            document.getElementById('share-profile-btn')?.addEventListener('click', () => {
                openShareProfileModal(user);
            });
            document.getElementById('browse-listings-from-profile-btn')?.addEventListener('click', () => {
                renderView('browse-listings');
            });
        }

        const switchProfileTab = (tabId, contentId) => {
            document.querySelectorAll('.profile-header + .tab-container .tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.profile-header + .tab-container .tab-content').forEach(content => content.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            document.getElementById(contentId).classList.add('active');
        };

        document.getElementById('tab-listings')?.addEventListener('click', () => {
            switchProfileTab('tab-listings', 'tab-content-listings');
        });
        document.getElementById('tab-about')?.addEventListener('click', () => {
            switchProfileTab('tab-about', 'tab-content-about');
        });
        if (isOwnProfile) {
            document.getElementById('tab-saved')?.addEventListener('click', () => {
                switchProfileTab('tab-saved', 'tab-content-saved');
            });
        }

        addListingCardEventListeners();
    };

    const skeletonHtml = `
    <div class="profile-header">
    <div class="profile-avatar" style="background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); border: none; background-size: 200% 100%; animation: shimmer 1.5s infinite;"></div>
    <div class="profile-info">
    <div class="profile-meta">
    <div class="skeleton-title" style="width: 60%; height: 30px; margin-bottom: 10px;"></div>
    <div style="width: 40%; height: 20px; background-color: #f0f0f0;;"></div>
    </div>
    <div class="profile-actions">
    <div style="width: 50%; height: 40px; background-color: #f0f0f0; border-radius: 8px;"></div>
    </div>
    </div>
    </div>

    <div class="tab-container">
    <div class="tabs">
    <div class="tab" style="width: 200px; height: 40px; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite;"></div>
    </div>
    <div class="tab-content active">
    <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
    <div style="width: 30%; height: 30px; background-color: #f0f0f0;"></div>
    </div>
    <div class="listings-grid">
    ${createSkeletonCards()}
    </div>
    </div>
    </div>
    `;
    if (renderId !== currentActiveRenderId) return;
    DOMElements.mainContent.innerHTML = skeletonHtml;
    initializeDOMElements();


    let user = null;
    let listings = [];
    let favorites = [];
    let followerCount = 0;
    let isFollowing = false; // Initialize for potential cached data
    let isOwnProfile = currentUser && (currentUser._id === profileIdentifier || currentUser.slug === profileIdentifier);
    let useCached = false;

    if (cachedUserProfile[profileIdentifier] && isCacheFresh(cachedUserProfile[profileIdentifier].timestamp)) {
        user = cachedUserProfile[profileIdentifier].data;
        // Retrieve isFollowing from cached user data
        isFollowing = user.isFollowing || false;
        if (isOwnProfile && cachedUserListings.data && isCacheFresh(cachedUserListings.timestamp)) {
            listings = cachedUserListings.data;
        }
        if (isOwnProfile && cachedUserFavorites.data && isCacheFresh(cachedUserFavorites.timestamp)) {
            favorites = cachedUserFavorites.data;
        }
        useCached = true;
        // Render with cached data
        renderContent(user, listings, favorites, user.followerCount || 0, isFollowing, isOwnProfile);
    }

    try {
        // Use fetchAPIWithAuth for getProfile to retrieve isFollowing status
        const latestUser = await userAPI.getProfile(profileIdentifier);
        if (renderId !== currentActiveRenderId) return;

        if (!latestUser) {
            if (renderId !== currentActiveRenderId) return;
            throw new Error("User not found."); // Throw an error if user not found
        }

        const latestListings = await userAPI.getUserListings(latestUser._id);
        if (renderId !== currentActiveRenderId) return;

        let latestFavorites = [];
        if (isOwnProfile) {
            latestFavorites = await userAPI.getUserFavorites(currentUser._id);
            if (renderId !== currentActiveRenderId) return;
        }

        const latestFollowerCount = latestUser.followerCount || 0;

        // Get isFollowing directly from the latestUser object returned by the API
        const latestIsFollowing = latestUser.isFollowing || false;

        setCachedUserProfile(latestUser.slug, { ...latestUser, isFollowing: latestIsFollowing }); // Cache isFollowing status
        if (isOwnProfile) {
            setCachedUserListings(latestListings);
            setCachedUserFavorites(latestFavorites);
        }

        // Only re-render if data has changed or if not using cached data initially
        if (!useCached ||
            JSON.stringify(user) !== JSON.stringify(latestUser) ||
            JSON.stringify(listings) !== JSON.stringify(latestListings) ||
            JSON.stringify(favorites) !== JSON.stringify(latestFavorites) ||
            followerCount !== latestFollowerCount ||
            isFollowing !== latestIsFollowing)
        {
            await renderContent(latestUser, latestListings, latestFavorites, latestFollowerCount, latestIsFollowing, isOwnProfile);
        }

    } catch (error) {
        if (renderId !== currentActiveRenderId) return;
        console.error('Error rendering profile:', error);
        showMessage(error.message || 'Error loading profile page', 'error');
        if (error.message == "User not found.") {
            DOMElements.mainContent.innerHTML = `
            <div class="not-found-container">
            <div class="not-found-content">
            <i class="fas fa-user-times not-found-icon"></i>
            <h2 class="not-found-title">Oops! User Not Found</h2>
            <p class="not-found-message">The user profile you're looking for doesn't exist or may have been removed.</p>
            <button class="btn-primary" id="go-home-btn">
            <i class="fas fa-home"></i> Go Back Home
            </button>
            </div>
            </div>
            `;
            document.getElementById('go-home-btn')?.addEventListener('click', () => {
                renderView('home');
            });
        } else {
            DOMElements.mainContent.innerHTML = `
            <div class="not-found-container">
            <div class="not-found-content">
            <i class="fas fa-exclamation-triangle not-found-icon"></i>
            <p class="not-found-message">Failed to load profile.</p>
            <button class="btn-primary retry-fetch-btn">Try Again</button>
            </div>
            </div>`;
            document.getElementById('retry-fetch-btn')?.addEventListener('click', () => {
                renderView('profile', profileIdentifier);
            });
        }
        initializeDOMElements();
    }
}

export async function openEditProfileModal(user) {
    const editProfileModal = DOMElements.editProfileModal;
    const editProfileForm = DOMElements.editProfileForm;
    const editProfilePicPreview = DOMElements.editProfilePicPreview;
    const locationName = getLocationName(user.location);

    const phoneNumber = user.phone?.startsWith('+263') ? user.phone.slice(4) : user.phone || '';
    const whatsappNumber = user.whatsapp?.startsWith('+263') ? user.whatsapp.slice(4) : user.whatsapp || '';

    DOMElements.editProfileDisplayName.value = user.displayName;
    DOMElements.editProfileLocationName.value = locationName;
    DOMElements.editProfileLocationId.value = user.location;
    DOMElements.editProfilePhone.value = phoneNumber;
    DOMElements.editProfileWhatsapp.value = whatsappNumber;
    DOMElements.editProfileBio.value = user.bio;

    DOMElements.enablePhone.checked = !!user.phone;
    DOMElements.enableWhatsapp.checked = !!user.whatsapp;
    DOMElements.editProfilePhone.disabled = !DOMElements.enablePhone.checked;
    DOMElements.editProfileWhatsapp.disabled = !DOMElements.enableWhatsapp.checked;

    // Add event listeners for enable/disable checkboxes
    DOMElements.enablePhone.addEventListener('change', function() {
        DOMElements.editProfilePhone.disabled = !this.checked;
        if (!this.checked) {
            DOMElements.editProfilePhone.value = '';
        }
    });

    DOMElements.enableWhatsapp.addEventListener('change', function() {
        DOMElements.editProfileWhatsapp.disabled = !this.checked;
        if (!this.checked) {
            DOMElements.editProfileWhatsapp.value = '';
        }
    });

    editProfilePicPreview.innerHTML = `
    <div class="image-preview-item">
    <img src="${user.profilePic}" alt="Profile Picture" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
    </div>
    `;

    DOMElements.editProfilePicUpload.onclick = () => {
        DOMElements.editProfilePicInput.click();
    };

    let newProfilePic = null;

    DOMElements.editProfilePicInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            showLoadingDialog();
            try {
                const compressedBlob = await compressImage(file);
                const formData = new FormData();
                formData.append('image', compressedBlob, file.name);

                const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (result.success) {
                    newProfilePic = result.data.url;
                    editProfilePicPreview.innerHTML = `
                    <div class="image-preview-item">
                    <img src="${newProfilePic}" alt="Profile Picture" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
                    </div>
                    `;
                } else {
                    throw new Error(result.error?.message || 'Failed to upload image');
                }
            } catch (error) {
                console.error('Error uploading image:', error);
                showMessage(error.message || 'Error uploading profile picture', 'error');
            } finally {
                hideLoadingDialog();
            }
        }
    };

    editProfileForm.onsubmit = async (e) => {
        e.preventDefault();
        showLoadingDialog();

        try {
            const displayName = DOMElements.editProfileDisplayName.value.trim();
            const location = DOMElements.editProfileLocationId.value;

            if (!displayName) {
                showMessage('Please enter a profile name', 'error');
                return;
            }

            if (!location) {
                showMessage('Please select a location', 'error');
                return;
            }

            const phone = DOMElements.enablePhone.checked && DOMElements.editProfilePhone.value.trim()
            ? '+263' + DOMElements.editProfilePhone.value.trim()
            : '';
            const whatsapp = DOMElements.enableWhatsapp.checked && DOMElements.editProfileWhatsapp.value.trim()
            ? '+263' + DOMElements.editProfileWhatsapp.value.trim()
            : '';

            const bio = DOMElements.editProfileBio.value.trim();
            const profilePic = newProfilePic || user.profilePic;

            if (!phone && !whatsapp) {
                showMessage('Please provide at least one contact method', 'error');
                return;
            }

            const updatedUserData = {
                displayName,
                location,
                phone,
                whatsapp,
                bio,
                profilePic
            };

            const updatedUser = await userAPI.updateProfile(currentUser._id, updatedUserData);

            setCurrentUser(updatedUser);
            setCachedUserProfile(updatedUser.slug, updatedUser);

            showMessage('Profile updated!', 'success');
            closeModal(editProfileModal);
            updateAuthUI();
            renderView('profile', currentUser.slug || currentUser._id);
        } catch (error) {
            console.error('Error updating profile:', error);
            showMessage(error.message || 'Error updating profile', 'error');
        } finally {
            hideLoadingDialog();
        }
    };

    openModal(editProfileModal);
}

// NEW: Function to open and populate the share profile modal
export async function openShareProfileModal(user) {
    if (!user || !user.slug) {
        showMessage('Profile information missing for sharing.', 'error');
        return;
    }

    const profileUrl = `${window.location.origin}/profile/${user.slug}`;
    const shareText = `Check out ${user.displayName}'s profile on Keid:`;

    DOMElements.shareProfileUrl.value = profileUrl;

    DOMElements.shareProfileFacebook.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`;
    DOMElements.shareProfileTwitter.href = `https://twitter.com/intent/tweet?url=${encodeURIComponent(profileUrl)}&text=${encodeURIComponent(shareText)}`;
    DOMElements.shareProfileWhatsapp.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + profileUrl)}`;

    openModal(DOMElements.shareProfileModal);

    // Remove any existing event listeners and add a new one
    const copyBtn = DOMElements.copyProfileUrlBtn;
    if (copyBtn) {
        copyBtn.replaceWith(copyBtn.cloneNode(true));
        const newCopyBtn = DOMElements.copyProfileUrlBtn;

        newCopyBtn.addEventListener('click', () => {
            DOMElements.shareProfileUrl.select();
            navigator.clipboard.writeText(DOMElements.shareProfileUrl.value)
            .then(() => {
                showMessage('Profile link copied to clipboard!', 'success');
                const btn = DOMElements.copyProfileUrlBtn;
                btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => {
                    btn.innerHTML = '<i class="fas fa-copy"></i> Copy';
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy profile URL: ', err);
                showMessage('Failed to copy profile link', 'error');
            });
        });
    }
}

// NEW: Function to open the report user modal
export function openReportUserModal(user) {
    if (!currentUser) {
        showMessage('Please login to report a user.', 'error');
        return;
    }
    if (currentUser._id === user._id) {
        showMessage('You cannot report yourself.', 'error');
        return;
    }

    DOMElements.reportedUserName.textContent = user.displayName;
    DOMElements.reportedUserIdInput.value = user._id;
    openModal(DOMElements.reportUserModal);

    // Add event listener for form submission
    DOMElements.reportUserForm.onsubmit = (e) => handleReportUserSubmit(e, user._id);
}

// NEW: Function to handle report user form submission
async function handleReportUserSubmit(e, reportedUserId) {
    e.preventDefault();

    const reason = DOMElements.reportReason.value;
    const description = DOMElements.reportDescription.value;

    if (!reason) {
        showMessage('Please select a reason for reporting.', 'error');
        return;
    }

    showLoadingDialog();
    try {
        const response = await reportAPI.submitReport(reportedUserId, reason, description);
        showMessage(response.message, 'success');
        closeModal(DOMElements.reportUserModal);
    } catch (error) {
        console.error('Error submitting report:', error);
        showMessage(error.message || 'Failed to submit report.', 'error');
    } finally {
        hideLoadingDialog();
    }
}
