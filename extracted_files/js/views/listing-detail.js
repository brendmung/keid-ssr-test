// js/views/listing-detail.js
import {
    currentUser,
    currentListing,
    setCurrentListing,
    categories,
    currentActiveRenderId,
    cachedListingDetails,
    cachedUserProfile,
    CACHE_DURATION,
    setCachedListingDetails,
    setCachedUserProfile,
} from '../state.js';
import DOMElements, { initializeDOMElements } from '../dom.js';
import { userAPI, listingAPI } from '../api.js';
import {
    showMessage,
    openFullImage,
    closeFullImage,
    updateActiveNavTab,
    getTimeAgo,
    formatDescriptionForDisplay,
} from '../utils.js';
import { addListingCardEventListeners } from '../listing-cards.js';
import { getLocationName } from '../locations-categories.js';
import { openContactModal } from '../contact.js'; // From new contact module
import { renderView, tempListingCache, updatePageTitle } from './core.js'; // Import from core

// Helper function to check if cache is fresh
function isCacheFresh(timestamp) {
    return (Date.now() - timestamp) < CACHE_DURATION;
}

// Function to update meta tags for social media preview (moved from core.js)
export function updateMetaTags() {
    if (!currentListing) return;

    let ogTitle = document.querySelector('meta[property="og:title"]');
    let description = document.querySelector('meta[property="og:description"]');
    let image = document.querySelector('meta[property="og:image"]');
    let url = document.querySelector('meta[property="og:url"]');
    let type = document.querySelector('meta[property="og:type"]');

    if (!ogTitle) { ogTitle = document.createElement('meta'); ogTitle.setAttribute('property', 'og:title'); document.head.appendChild(ogTitle); }
    if (!description) { description = document.createElement('meta'); description.setAttribute('property', 'og:description'); document.head.appendChild(description); }
    if (!image) { image = document.createElement('meta'); image.setAttribute('property', 'og:image'); document.head.appendChild(image); }
    if (!url) { url = document.createElement('meta'); url.setAttribute('property', 'og:url'); document.head.appendChild(url); }
    if (!type) { type = document.createElement('meta'); type.setAttribute('property', 'og:type'); document.head.appendChild(type); }

    ogTitle.setAttribute('content', currentListing.title);
    description.setAttribute('content', currentListing.description.substring(0, 200) + (currentListing.description.length > 200 ? '...' : ''));
    image.setAttribute('content', currentListing.images[0]);
    url.setAttribute('content', `${window.location.origin}/${currentListing.type}/${currentListing.slug}`);
    type.setAttribute('content', 'product');

    let twitterCard = document.querySelector('meta[name="twitter:card"]');
    let twitterTitle = document.querySelector('meta[name="twitter:title"]');
    let twitterDescription = document.querySelector('meta[name="twitter:description"]');
    let twitterImage = document.querySelector('meta[name="twitter:image"]');

    if (!twitterCard) { twitterCard = document.createElement('meta'); twitterCard.setAttribute('name', 'twitter:card'); document.head.appendChild(twitterCard); }
    if (!twitterTitle) { twitterTitle = document.createElement('meta'); twitterTitle.setAttribute('name', 'twitter:title'); document.head.appendChild(twitterTitle); }
    if (!twitterDescription) { twitterDescription = document.createElement('meta'); twitterDescription.setAttribute('name', 'twitter:description'); document.head.appendChild(twitterDescription); }
    if (!twitterImage) { twitterImage = document.createElement('meta'); twitterImage.setAttribute('name', 'twitter:image'); document.head.appendChild(twitterImage); }

    twitterCard.setAttribute('content', 'summary_large_image');
    twitterTitle.setAttribute('content', currentListing.title);
    twitterDescription.setAttribute('content', currentListing.description.substring(0, 200) + (currentListing.description.length > 200 ? '...' : '') );
    twitterImage.setAttribute('content', currentListing.images[0]);
}


// Modified to accept identifier (slug or ID) or a full listing object
export async function renderListingDetail(identifierOrListingObject, renderId) { // Removed updateMetaTags from parameters
    if (renderId !== currentActiveRenderId) return;

    let listing = null;
    let owner = null;
    let actualIdentifier = '';

    if (typeof identifierOrListingObject === 'object' && identifierOrListingObject !== null) {
        listing = identifierOrListingObject;
        actualIdentifier = listing.slug || listing._id;
        owner = listing.userId;
    } else {
        actualIdentifier = identifierOrListingObject;
        if (cachedListingDetails[actualIdentifier] && isCacheFresh(cachedListingDetails[actualIdentifier].timestamp)) {
            listing = cachedListingDetails[actualIdentifier].data;
            if (cachedUserProfile[listing.userId.slug || listing.userId._id] && isCacheFresh(cachedUserProfile[listing.userId.slug || listing.userId._id].timestamp)) {
                owner = cachedUserProfile[listing.userId.slug || listing.userId._id].data;
            }
        }
    }

    const renderContent = async (listingToRender, ownerToRender) => {
        if (renderId !== currentActiveRenderId) return;

        setCurrentListing(listingToRender);
        DOMElements.mainContent.dataset.currentListingId = listingToRender._id;
        DOMElements.mainContent.dataset.currentListingType = listingToRender.type;

        updatePageTitle(`${listingToRender.title} - Keid`);

        const formattedCategory = categories[listingToRender.category]?.name ||
        listingToRender.category
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

        const isOwnListing = currentUser && currentUser._id === listingToRender.userId._id;
        const isLiked = listingToRender.isLiked || false;
        const isFavorited = listingToRender.isFavorited || false;

        const html = `
        <div class="detail-container">
        <div class="detail-card image-details-card">
        <div class="image-header-container" id="image-slider-container">
        <div class="image-slider" id="image-slider">
        ${listingToRender.images.map((image, index) => `
            <div class="slide" data-index="${index}">
            <img src="${image}" alt="${listingToRender.title} - Image ${index + 1}">
            </div>
            `).join('')}
            </div>
            <div class="nav-arrow prev-arrow" id="prev-arrow" style="display: ${listingToRender.images.length > 1 ? 'flex' : 'none'}">
            <i class="fas fa-chevron-left"></i>
            </div>
            <div class="nav-arrow next-arrow" id="next-arrow" style="display: ${listingToRender.images.length > 1 ? 'flex' : 'none'}">
            <i class="fas fa-chevron-right"></i>
            </div>
            <div class="dots-container" id="dots-container" style="display: ${listingToRender.images.length > 1 ? 'flex' : 'none'}">
            ${listingToRender.images.map((_, index) => `
                <div class="dot" data-index="${index}"></div>
                `).join('')}
                </div>
                </div>

                <div class="details-section">
                <div class="detail-title-row">
                <h1 class="detail-title">${listingToRender.title}</h1>
                <div class="detail-price">$${listingToRender.price}</div>
                </div>

                <div class="detail-meta-grid">
                <div class="detail-meta-item">
                <i class="fas fa-map-marker-alt"></i>
                <span>
                <span class="location">${getLocationName(listingToRender.location)}</span>,
                <span class="time-ago">${getTimeAgo(listingToRender.createdAt)}</span>
                </span>
                </div>
                <div class="detail-meta-item">
                <i class="fas fa-tag"></i>
                <span>${formattedCategory}</span>
                </div>
                <div class="detail-meta-item">
                <i class="fas fa-user"></i>
                <span>Listed by: <a href="#" id="view-owner-profile-link">${ownerToRender ? ownerToRender.displayName : 'Unknown'}</a></span>
                </div>
                </div>
                </div>
                </div>

                <div class="detail-card actions-card">
                <div class="actions-card">
                ${isOwnListing ? `
                    <button class="btn-edit action-button" id="edit-listing-btn" data-id="${listingToRender._id}">
                    <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-danger action-button" id="delete-listing-btn" data-id="${listingToRender._id}">
                    <i class="fas fa-trash-alt"></i> Delete
                    </button>
                    ` : `
                    <button class="btn-primary action-button" id="contact-seller-btn">
                    <i class="fas fa-envelope"></i> Contact
                    </button>
                    `}
                    <button class="btn-info action-button" id="like-listing-btn">
                    <i class="${isLiked ? 'fas' : 'far'} fa-thumbs-up ${isLiked ? 'liked-icon' : ''}"></i>
                    ${(listingToRender.likesCount || 0) === 1 ? '1 Like' : `${listingToRender.likesCount || 0} Likes`}
                    </button>
                    <button class="btn-info action-button" id="favorite-listing-btn">
                    <i class="${isFavorited ? 'fas' : 'far'} fa-bookmark ${isFavorited ? 'favorited-icon' : ''}"></i>
                    <span>${isFavorited ? 'Saved' : 'Save'}</span>
                    </button>
                    <button class="btn-info action-button" id="share-listing-btn">
                    <i class="fas fa-share-alt"></i>
                    <span>Share</span>
                    </button>
                    </div>
                    </div>

                    <div class="detail-card description-card">
                    <h3>Description</h3>
                    <div class="detail-description">${formatDescriptionForDisplay(listingToRender.description)}</div>
                    </div>
                    `;

                    if (renderId !== currentActiveRenderId) return;
                    DOMElements.mainContent.innerHTML = html;
        initializeDOMElements();

        const sliderContainer = document.getElementById('image-slider-container');
        const slider = document.getElementById('image-slider');
        const prevArrow = document.getElementById('prev-arrow');
        const nextArrow = document.getElementById('next-arrow');
        const dots = Array.from(document.querySelectorAll('.dot'));
        const slides = Array.from(document.querySelectorAll('.slide'));

        let currentIndex = 0;
        let isDragging = false;
        let startPos = 0;
        let currentTranslate = 0;
        let prevTranslate = 0;
        let animationID;

        if (listingToRender.images.length <= 1) {
            if (prevArrow) prevArrow.style.display = 'none';
            if (nextArrow) nextArrow.style.display = 'none';
            if (dots.length > 0) dots[0].style.display = 'none';
            if (document.getElementById('dots-container')) document.getElementById('dots-container').style.display = 'none';
        }

        updateSliderPosition();
        updateDots();
        updateArrowVisibility();

        sliderContainer?.addEventListener('touchstart', touchStart);
        sliderContainer?.addEventListener('touchmove', touchMove);
        sliderContainer?.addEventListener('touchend', touchEnd);

        sliderContainer?.addEventListener('mousedown', touchStart);
        sliderContainer?.addEventListener('mousemove', touchMove);
        sliderContainer?.addEventListener('mouseup', touchEnd);
        sliderContainer?.addEventListener('mouseleave', touchEnd);

        if (prevArrow) prevArrow.addEventListener('click', () => navigate(-1));
        if (nextArrow) nextArrow.addEventListener('click', () => navigate(1));

        dots.forEach(dot => {
            dot.addEventListener('click', () => {
                const dotIndex = parseInt(dot.getAttribute('data-index'));
                goToSlide(dotIndex);
            });
        });

        slides.forEach(slide => {
            slide.addEventListener('click', () => {
                const imgSrc = slide.querySelector('img').src;
                openFullImage(imgSrc);
            });
        });

        function touchStart(e) {
            if (listingToRender.images.length <= 1) return;
            if (e.type === 'touchstart') {
                startPos = e.touches[0].clientX;
            } else {
                startPos = e.clientX;
                e.preventDefault();
            }
            isDragging = true;
            slider.style.transition = 'none';
            animationID = requestAnimationFrame(animation);
        }

        function touchMove(e) {
            if (!isDragging || listingToRender.images.length <= 1) return;
            const currentPosition = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
            const diff = currentPosition - startPos;
            if ((currentIndex === 0 && diff > 0) || (currentIndex === listingToRender.images.length - 1 && diff < 0)) {
                currentTranslate = prevTranslate + diff * 0.2;
            } else {
                currentTranslate = prevTranslate + diff;
            }
        }

        function touchEnd() {
            if (!isDragging || listingToRender.images.length <= 1) return;
            cancelAnimationFrame(animationID);
            isDragging = false;
            const movedBy = currentTranslate - prevTranslate;
            if (movedBy < -50 && currentIndex < listingToRender.images.length - 1) {
                navigate(1);
            } else if (movedBy > 50 && currentIndex > 0) {
                navigate(-1);
            } else {
                goToSlide(currentIndex);
            }
        }

        function animation() {
            setSliderPosition();
            if (isDragging) {
                animationID = requestAnimationFrame(animation);
            }
        }

        function setSliderPosition() {
            slider.style.transform = `translateX(${currentTranslate}px)`;
        }

        function navigate(direction) {
            const newIndex = currentIndex + direction;
            if (newIndex >= 0 && newIndex < listingToRender.images.length) {
                goToSlide(newIndex);
            }
        }

        function goToSlide(index) {
            currentIndex = index;
            prevTranslate = currentTranslate = -currentIndex * sliderContainer.offsetWidth;
            slider.style.transition = 'transform 0.5s ease';
            updateSliderPosition();
            updateDots();
            updateArrowVisibility();
        }

        function updateSliderPosition() {
            slider.style.transform = `translateX(${-currentIndex * sliderContainer.offsetWidth}px)`;
        }

        function updateDots() {
            dots.forEach((dot, index) => {
                dot.classList.toggle('active', index === currentIndex);
            });
        }

        function updateArrowVisibility() {
            if (listingToRender.images.length <= 1) return;
            if (prevArrow) prevArrow.style.visibility = currentIndex > 0 ? 'visible' : 'hidden';
            if (nextArrow) nextArrow.style.visibility = currentIndex < listingToRender.images.length - 1 ? 'visible' : 'hidden';
        }

        updateMetaTags(); // Called directly
        updateActiveNavTab();

        if (!isOwnListing) {
            document.getElementById('contact-seller-btn')?.addEventListener('click', () => {
                openContactModal(listingToRender.userId, listingToRender);
            });
        }

        document.getElementById('share-listing-btn')?.addEventListener('click', () => {
            const shareModal = document.getElementById('share-modal');
            const shareUrl = `${window.location.origin}/${currentListing.type}/${currentListing.slug}`;
            const shareText = `Check out this listing on Keid: ${currentListing.title}`;

            // FIX: Set social share links
            const facebookLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
            const twitterLink = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
            const whatsappLink = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;

            shareModal.querySelector('.social-share-buttons .facebook').href = facebookLink;
            shareModal.querySelector('.social-share-buttons .twitter').href = twitterLink;
            shareModal.querySelector('.social-share-buttons .whatsapp').href = whatsappLink;

            // Set direct link
            document.getElementById('share-url').value = shareUrl;

            // Open modal
            shareModal.style.display = 'flex';
        });

        document.getElementById('copy-url-btn')?.addEventListener('click', () => {
            const shareUrl = document.getElementById('share-url');
            shareUrl.select();
            navigator.clipboard.writeText(shareUrl.value)
            .then(() => {
                showMessage('Link copied to clipboard!', 'success');
                const btn = document.getElementById('copy-url-btn');
                btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => {
                    btn.innerHTML = '<i class="fas fa-copy"></i> Copy';
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy URL: ', err);
                showMessage('Failed to copy link', 'error');
            });
        });

        document.querySelector('#share-modal .modal-close')?.addEventListener('click', () => {
            document.getElementById('share-modal').style.display = 'none';
        });

        if (ownerToRender) {
            document.getElementById('view-owner-profile-link')?.addEventListener('click', (e) => {
                e.preventDefault();
                renderView('profile', ownerToRender.slug);
            });
        }

        addListingCardEventListeners();
    };

    const skeletonHtml = `
    <div class="detail-container">
    <div class="detail-card image-details-card">
    <div class="image-header-container">
    <div class="skeleton-image" style="height: 100%;"></div>
    </div>
    <div class="details-section">
    <div class="detail-title-row">
    <div class="skeleton-title" style="width: 70%; height: 40px;"></div>
    <div class="skeleton-price" style="width: 30%; height: 20px;"></div>
    </div>
    <div class="detail-meta-grid">
    <div class="skeleton-meta" style="width: 100%; height: 20px; margin-bottom: 10px;"></div>
    <div class="skeleton-meta" style="width: 100%; height: 20px; margin-bottom: 10px;"></div>
    <div class="skeleton-meta" style="width: 100%; height: 20px;"></div>
    </div>
    </div>
    </div>

    <div class="detail-card">
    <div style="display: flex; gap: 10px;">
    <div class="skeleton-button" style="width: 100%; height: 40px;"></div>
    <div class="skeleton-button" style="width: 100%; height: 40px;"></div>
    <div class="skeleton-button" style="width: 100%; height: 40px;"></div>
    </div>
    </div>

    <div class="detail-card description-card">
    <div class="skeleton-title" style="width: 30%; height: 20px; margin-bottom: 15px;"></div>
    <div class="skeleton-meta" style="width: 100%; height: 150px;"></div>
    </div>
    </div>
    `;

    if (renderId !== currentActiveRenderId) return;
    DOMElements.mainContent.innerHTML = skeletonHtml;
    initializeDOMElements();

    if (listing && owner) {
        await renderContent(listing, owner);
    }

    try {
        let latestListing = listing;
        let latestOwner = owner;

        if (!latestListing) {
            latestListing = await listingAPI.getListing(actualIdentifier);
            if (renderId !== currentActiveRenderId) return;
            if (!latestListing) {
                throw new Error("Listing not found.");
            }
            latestOwner = latestListing.userId;
        } else if (!latestOwner) {
            latestOwner = await userAPI.getProfile(latestListing.userId._id);
            if (renderId !== currentActiveRenderId) return;
        }

        setCachedListingDetails(latestListing.slug, latestListing);
        setCachedListingDetails(latestListing._id, latestListing);
        setCachedUserProfile(latestOwner.slug, latestOwner);
        setCachedUserProfile(latestOwner._id, latestOwner);

        if (!listing || JSON.stringify(listing) !== JSON.stringify(latestListing) || JSON.stringify(owner) !== JSON.stringify(latestOwner)) {
            await renderContent(latestListing, latestOwner);
        }

    } catch (error) {
        if (renderId !== currentActiveRenderId) return;
        console.error('Error rendering listing detail:', error);
        showMessage(error.message || 'Error loading listing details', 'error');

        if (error.message == "Listing not found.") {
            DOMElements.mainContent.innerHTML = `
            <div class="not-found-container">
            <div class="not-found-content">
            <i class="fas fa-exclamation-triangle not-found-icon"></i>
            <h2 class="not-found-title">Oops! Listing Not Found</h2>
            <p class="not-found-message">The listing you're looking for doesn't exist or may have been removed.</p>
            <button class="btn-primary" id="go-home-btn">
            <i class="fas fa-home"></i> Go Back Home
            </button>
            </div>
            </div>
            `;
            document.getElementById('go-home-btn')?.addEventListener('click', () => {
                renderView('home');
            });;
        } else {

            DOMElements.mainContent.innerHTML = `
            <div class="not-found-container">
            <div class="not-found-content">
            <i class="fas fa-exclamation-triangle not-found-icon"></i>
            <p class="not-found-message">Failed to load listing details.</p>
            <button class="btn-primary retry-listing-detail-btn" data-id="${actualIdentifier}">Try Again</button>
            </div>
            </div>`;
            document.querySelector('.retry-listing-detail-btn')?.addEventListener('click', (e) => {
                renderView('listing-detail', e.target.dataset.id);
            });
        }
        initializeDOMElements();
    }
}
