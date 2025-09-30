// js/utils.js
import DOMElements from './dom.js';
import { uploadedImages, addUploadedImage, removeUploadedImage } from './state.js';

const failedFetchDisplay = `
<div class="not-found-container" style="background: transparent; box-shadow: none;">
<div class="not-found-content">
<i class="fas fa-exclamation-triangle not-found-icon"></i>
<h2 class="not-found-title">Oops! Something Went Wrong</h2>
<p class="not-found-message">Something went wrong while loading this page. Please try again later.</p>
<button class="btn-primary" id="retry-fetch-btn">
<i class="fas fa-sync-alt"></i> Retry
</button>
</div>
</div>
`;

function formatDescriptionForDisplay(text) {
    if (!text) return '';

    let formattedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

    formattedText = formattedText.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
    formattedText = formattedText.replace(/_(.*?)_/g, '<em>$1</em>');
    formattedText = formattedText.replace(/~(.*?)~/g, '<del>$1</del>');

    return formattedText;
}


function showMessage(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.position = 'fixed';
        toastContainer.style.bottom = '20px';
        toastContainer.style.right = '20px';
        toastContainer.style.display = 'flex';
        toastContainer.style.flexDirection = 'column-reverse';
        toastContainer.style.gap = '10px';
        toastContainer.style.zIndex = '1002';
        document.body.appendChild(toastContainer);
    }

    if (toastContainer.children.length >= 3) {
        toastContainer.removeChild(toastContainer.children[0]);
    }

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.remove();
        if (toastContainer.children.length === 0) {
            toastContainer.remove();
        }
    }, 3000);
}

function showLoadingDialog() {
    DOMElements.loadingModal.style.display = 'flex';
}

function hideLoadingDialog() {
    DOMElements.loadingModal.style.display = 'none';
}

function createSkeletonCards() {
    const viewportWidth = window.innerWidth;
    let cardsPerRow;

    if (viewportWidth >= 1100) {
        cardsPerRow = 4;
    } else if (viewportWidth >= 830) {
        cardsPerRow = 3;
    } else {
        cardsPerRow = 2;
    }

    let skeletons = '';
    for (let i = 0; i < cardsPerRow; i++) {
        skeletons += `
        <div class="skeleton-card">
        <div class="skeleton-image"></div>
        <div class="skeleton-content">
        <div class="skeleton-title"></div>
        <div class="skeleton-price"></div>
        <div class="skeleton-meta"></div>
        <div class="skeleton-actions">
        <div class="skeleton-button"></div>
        <div class="skeleton-button"></div>
        </div>
        </div>
        </div>
        `;
    }
    return skeletons;
}

function renderImagePreviews() {
    const imagePreview = DOMElements.listingImagePreview;
    imagePreview.innerHTML = '';

    uploadedImages.forEach((image, index) => {
        imagePreview.innerHTML += `
        <div class="image-preview-item">
        <img src="${image}" alt="Preview ${index + 1}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
        <span class="remove" data-index="${index}">&times;</span>
        </div>
        `;
    });

    document.querySelectorAll('.image-preview-item .remove').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = button.getAttribute('data-index');
            removeUploadedImage(index);
            renderImagePreviews();
        });
    });
}

async function renderEditListingImagePreviews(images) {
    const editImagePreview = DOMElements.editImagePreview;
    editImagePreview.innerHTML = '';

    if (images && images.length > 0) {
        images.forEach((image, index) => {
            editImagePreview.innerHTML += `
            <div class="image-preview-item">
            <img src="${image}" alt="Preview ${index + 1}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
            <span class="remove" data-index="${index}">&times;</span>
            </div>
            `;
        });

        document.querySelectorAll('.image-preview-item .remove').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = button.getAttribute('data-index');
                images.splice(index, 1);
                renderEditListingImagePreviews(images);
            });
        });
    }
}

function openFullImage(imageUrl) {
    const fullImageView = DOMElements.fullImageView;
    const fullImage = DOMElements.fullImage;

    if (!fullImageView || !fullImage) {
        console.error('Full image view elements not found in DOM. Ensure full-image-modal.html is loaded.');
        return;
    }

    fullImage.src = imageUrl;
    fullImageView.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeFullImage() {
    const fullImageView = DOMElements.fullImageView;
    if (!fullImageView) {
        console.error('Full image view element not found in DOM for closing.');
        return;
    }
    fullImageView.style.display = 'none';
    document.body.style.overflow = '';
}

function normalize(value, max) {
    return value / max;
}

function calculateScore(listing, maxLikes, maxDate) {
    const likesScore = normalize(listing.likesCount || 0, maxLikes) * 0.5;
    const dateScore = normalize(new Date(listing.createdAt).getTime(), maxDate) * 0.5;
    return likesScore + dateScore;
}

function sortListings(listings, sortBy) {
    let sortedListings = [...listings];

    switch (sortBy) {
        case 'recommended':
            const maxLikes = Math.max(...sortedListings.map(item => item.likesCount || 0), 1);
            const maxDate = Math.max(...sortedListings.map(item => new Date(item.createdAt).getTime()), 1);

            sortedListings.forEach(item => {
                item.score = calculateScore(item, maxLikes, maxDate);
            });

            sortedListings.sort((a, b) => b.score - a.score);
            break;

        case 'latest':
            sortedListings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;

        case 'name':
            sortedListings.sort((a, b) => a.title.localeCompare(b.title));
            break;

        case 'price-low-to-high':
            sortedListings.sort((a, b) => a.price - b.price);
            break;

        case 'price-high-to-low':
            sortedListings.sort((a, b) => b.price - a.price);
            break;

        default:
            break;
    }

    return sortedListings;
}

function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-content').forEach(dropdown => {
        dropdown.style.display = 'none';
    });
    if (DOMElements.guestDropdown) DOMElements.guestDropdown.style.display = 'none';
}

function updateActiveNavTab() {
    document.querySelectorAll('nav ul li a').forEach(link => {
        link.classList.remove('active');
    });

    if (DOMElements.mainContent.dataset.currentView === 'listing-detail') {
        if (DOMElements.mainContent.dataset.currentListingType) {
            if (DOMElements.mainContent.dataset.currentListingType === 'product') {
                DOMElements.productsLink.classList.add('active');
            } else if (DOMElements.mainContent.dataset.currentListingType === 'service') {
                DOMElements.servicesLink.classList.add('active');
            }
        }
    } else if (DOMElements.mainContent.dataset.currentView === 'search') {
        const searchType = DOMElements.searchInput.getAttribute('data-search-type');

        switch (searchType) {
            case 'products':
                DOMElements.productsLink.classList.add('active');
                break;
            case 'services':
                DOMElements.servicesLink.classList.add('active');
                break;
            case 'all':
            default:
                DOMElements.homeLink.classList.add('active');
                break;
        }
    } else {
        DOMElements.searchInput.placeholder = 'What are you looking for?';
        DOMElements.searchInput.setAttribute('data-search-type', 'all');
        switch (DOMElements.mainContent.dataset.currentView) {
            case 'home': DOMElements.homeLink.classList.add('active'); break;
            case 'products': DOMElements.productsLink.classList.add('active'); break;
            case 'services': DOMElements.servicesLink.classList.add('active'); break;
            case 'about': DOMElements.aboutLink.classList.add('active'); break;
            case 'contact': DOMElements.contactLink.classList.add('active'); break;
            case 'profile':
            case 'browse-listings':
            case 'dashboard':
            case 'favorites':
            case 'settings':
            default:
                // No specific nav tab for these views, or handled by default home
                break;
        }
    }
}

function validatePassword(password) {
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    const strength = Object.values(requirements).filter(Boolean).length;
    return { requirements, strength };
}

function updatePasswordStrength(password, passwordInputId) {
    let strengthBar;
    let requirementsElements;

    const passwordInput = document.getElementById(passwordInputId);
    if (!passwordInput) return;

    const formGroup = passwordInput.closest('.form-group');
    if (formGroup) {
        strengthBar = formGroup.querySelector('.password-strength-meter .strength-bar');
        requirementsElements = formGroup.querySelectorAll('.password-requirements .requirement');
    }

    if (!strengthBar || !requirementsElements) return;

    const { requirements, strength } = validatePassword(password);

    const strengthPercent = (strength / 5) * 100;
    let strengthColor = '#e74c3c';

    if (strength >= 4) {
        strengthColor = '#2ecc71';
    } else if (strength >= 2) {
        strengthColor = '#f39c12';
    }

    strengthBar.style.width = `${strengthPercent}%`;
    strengthBar.style.backgroundColor = strengthColor;

    Object.entries(requirements).forEach(([key, isValid]) => {
        const requirementElement = Array.from(requirementsElements).find(el => el.getAttribute('data-requirement') === key);
        if (requirementElement) {
            requirementElement.classList.toggle('valid', isValid);
            requirementElement.classList.toggle('invalid', !isValid);
        }
    });
}


function checkPasswordMatch(password, confirmPassword, feedbackElement) {
    if (!feedbackElement) return false;

    if (!password || !confirmPassword) {
        feedbackElement.style.display = 'none';
        return false;
    }

    feedbackElement.style.display = 'block';

    if (password === confirmPassword) {
        feedbackElement.textContent = 'Passwords match';
        feedbackElement.className = 'valid';
        return true;
    } else {
        feedbackElement.textContent = 'Passwords do not match';
        feedbackElement.className = 'invalid';
        return false;
    }
}

async function compressImage(file, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(
                    (blob) => resolve(blob),
                              'image/jpeg',
                              quality
                );
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval === 1 ? `${interval} year ago` : `${interval} years ago`;

    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval === 1 ? `${interval} month ago` : `${interval} months ago`;

    interval = Math.floor(seconds / 604800);
    if (interval >= 1) return interval === 1 ? `${interval} week ago` : `${interval} weeks ago`;

    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval === 1 ? `${interval} day ago` : `${interval} days ago`;

    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval === 1 ? `${interval} hour ago` : `${interval} hours ago`;

    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval === 1 ? `${interval} minute ago` : `${interval} minutes ago`;

    return 'just now';
}

function toggleRequiredAttribute(checkboxId, inputId) {
    const checkbox = document.getElementById(checkboxId);
    const input = document.getElementById(inputId);

    if (!checkbox || !input) return;

    checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
            input.disabled = false;
            input.setAttribute('required', true);
        } else {
            input.disabled = true;
            input.removeAttribute('required');
            input.value = '';
        }
    });

    if (checkbox.checked) {
        input.setAttribute('required', true);
    } else {
        input.removeAttribute('required');
    }
}

function setupRevealAnimation() {
    const revealElements = document.querySelectorAll('.listing-card, .user-card, .category-card');

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(element => {
        element.classList.add('reveal-item');
        observer.observe(element);
    });
}

export {
    showMessage,
    showLoadingDialog,
    hideLoadingDialog,
    createSkeletonCards,
    renderImagePreviews,
    renderEditListingImagePreviews,
    openFullImage,
    closeFullImage,
    sortListings,
    normalize,
    calculateScore,
    closeAllDropdowns,
    updateActiveNavTab,
    validatePassword,
    updatePasswordStrength,
    checkPasswordMatch,
    compressImage,
    getTimeAgo,
    toggleRequiredAttribute,
    failedFetchDisplay,
    formatDescriptionForDisplay,
        setupRevealAnimation
};
