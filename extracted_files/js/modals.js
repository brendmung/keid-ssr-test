// js/modals.js
import DOMElements from './dom.js';
import { setUploadedImages } from './state.js';
import { updatePasswordStrength, checkPasswordMatch } from './utils.js';

async function loadModals() {
    const modalFiles = [
        '/modals/login-modal.html',
        '/modals/signup-modal.html',
        '/modals/add-listing-modal.html',
        '/modals/contact-modal.html',
        '/modals/edit-profile-modal.html',
        '/modals/edit-listing-modal.html',
        '/modals/location-modal.html',
        '/modals/otp-modal.html',
        '/modals/forgot-password-modal.html',
        '/modals/category-modal.html',
        '/modals/loading-modal.html',
        '/modals/terms-modal.html',
        '/modals/privacy-modal.html',
        '/modals/share-modal.html',
        '/modals/full-image-modal.html',
        '/modals/reset-password-modal.html',
        '/modals/share-profile-modal.html',
        '/modals/report-user-modal.html' // ADD THIS LINE
    ];

    const fetchPromises = modalFiles.map(file => fetch(file).then(res => res.text()));
    const modalHtmls = await Promise.all(fetchPromises);

    const modalsContainer = document.createElement('div');
    modalsContainer.id = 'dynamic-modals-container'; // Optional: a container for all modals
    modalHtmls.forEach(html => {
        modalsContainer.innerHTML += html;
    });
    document.body.appendChild(modalsContainer);
}

function openModal(modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Disable scrolling
}

function resetForgotPasswordModal() {
    DOMElements.forgotPasswordEmail.value = '';
}

function resetLoginModal() {
    DOMElements.loginEmail.value = '';
    DOMElements.loginPassword.value = '';
}

function resetSignupModal() {
    DOMElements.signupName.value = '';
    DOMElements.signupEmail.value = '';
    DOMElements.signupPassword.value = '';
    DOMElements.signupConfirmPassword.value = '';
    updatePasswordStrength(''); // Reset strength meter
    checkPasswordMatch('', ''); // Reset password match feedback
}

function resetAddListingModal() {
    DOMElements.listingType.value = '';
    DOMElements.listingTitle.value = '';
    DOMElements.listingPrice.value = '';
    DOMElements.listingLocationName.value = '';
    DOMElements.listingLocationId.value = '';
    DOMElements.listingCategory.value = '';
    DOMElements.listingDescription.value = '';
    DOMElements.listingImagePreview.innerHTML = '';
    setUploadedImages([]); // Clear uploaded images array
}

// NEW: Function to reset the new password modal
function resetResetPasswordModal() {
    DOMElements.resetTokenInput.value = '';
    DOMElements.newPassword.value = '';
    DOMElements.confirmNewPassword.value = '';
    updatePasswordStrength(''); // Reset strength meter
    checkPasswordMatch('', ''); // Reset password match feedback
}

// NEW: Function to reset the share profile modal
function resetShareProfileModal() {
    if (DOMElements.shareProfileUrl) {
        DOMElements.shareProfileUrl.value = '';
    }
    // No other dynamic content needs explicit reset
}

// NEW: Function to reset the report user modal
function resetReportUserModal() {
    if (DOMElements.reportedUserName) {
        DOMElements.reportedUserName.textContent = '';
    }
    if (DOMElements.reportedUserIdInput) {
        DOMElements.reportedUserIdInput.value = '';
    }
    if (DOMElements.reportReason) {
        DOMElements.reportReason.value = '';
    }
    if (DOMElements.reportDescription) {
        DOMElements.reportDescription.value = '';
    }
}

function closeModal(modal) {
    modal.style.display = 'none';
    document.body.style.overflow = ''; // Enable scrolling

    // Reset the modal content based on the modal ID
    switch (modal.id) {
        case 'forgot-password-modal':
            resetForgotPasswordModal();
            break;
        case 'login-modal':
            resetLoginModal();
            break;
        case 'signup-modal':
            resetSignupModal();
            break;
        case 'add-listing-modal':
            resetAddListingModal();
            break;
        case 'reset-password-modal':
            resetResetPasswordModal();
            break;
        case 'share-profile-modal':
            resetShareProfileModal();
            break;
        case 'report-user-modal': // NEW: Reset report user modal
            resetReportUserModal();
            break;
            // No explicit reset needed for other modals like contact, edit profile/listing, location, OTP, category
        default:
            break;
    }
}

export { openModal, closeModal, resetForgotPasswordModal, resetLoginModal, resetSignupModal, resetAddListingModal, loadModals };
