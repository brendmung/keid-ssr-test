// js/main.js
import DOMElements, { initializeDOMElements } from './dom.js';
import {
    fetchCategories,
    fetchLocations,
    populateCategoryDropdown,
    updateLocationIcon,
    getSelectedLocation,
    openLocationModal,
    openCategoryModal,
    renderLocationLists,
    getLocationName,
    renderCategoryList,
    selectLocation,
    autoSelectLocation
} from './locations-categories.js';
import { openModal, closeModal, loadModals } from './modals.js';
import { handleLogin, handleSignup, handleLogout, checkAuthState, updateAuthUI } from './auth.js';
import { handleAddListing, handleDeleteListing, openEditListingModal } from './listing-management.js';
import { handleOTPInput, startResendTimer, openOTPModal, resetOTPInputs } from './otp-password.js';
import {
    toggleRequiredAttribute,
    updatePasswordStrength,
    checkPasswordMatch,
    closeAllDropdowns,
    compressImage,
    showMessage,
    showLoadingDialog,
    hideLoadingDialog,
    renderImagePreviews,
    closeFullImage // Ensure this is imported
} from './utils.js';
import { currentUser, addUploadedImage, uploadedImages } from './state.js';
import { API_BASE_URL, IMGBB_API_KEY } from './config.js';
import { userAPI } from './api.js';

// NEW IMPORTS FOR MODULAR VIEWS
import { renderView, parseURL } from './views/core.js';
import { openContactModal } from './contact.js'; // Import openContactModal from the new module

// --- Initial Setup and Event Listeners ---
document.addEventListener('DOMContentLoaded', async () => {
    const modalsLoadedPromise = loadModals();

    initializeDOMElements();

    const authLoadingSkeleton = document.getElementById('auth-loading-skeleton');
    if (authLoadingSkeleton) {
        authLoadingSkeleton.style.display = 'flex';
    }

    await Promise.all([fetchCategories(), fetchLocations()]);

    populateCategoryDropdown('category-select');

    await modalsLoadedPromise;
    initializeDOMElements();

    DOMElements.closeFullImage?.addEventListener('click', closeFullImage);

    populateCategoryDropdown('listing-category');
    populateCategoryDropdown('edit-listing-category');

    await checkAuthState().then(() => {
        updateAuthUI();
    }).finally(() => {
        if (authLoadingSkeleton) {
            authLoadingSkeleton.style.display = 'none';
        }
    });

    autoSelectLocation();

    const selectedLocation = getSelectedLocation();
    const locationName = selectedLocation === 'all' ? 'All' : getLocationName(selectedLocation);
    updateLocationIcon(locationName);

    parseURL();

    updatePasswordStrength('', 'signup-password');
    checkPasswordMatch('', '', DOMElements.passwordMatchFeedback);
    if (DOMElements.newPassword) {
        updatePasswordStrength('', 'new-password');
    }
    if (DOMElements.newPasswordMatchFeedback) {
        checkPasswordMatch('', '', DOMElements.newPasswordMatchFeedback);
    }


    const navLinks = document.querySelectorAll('nav a, .dropdown-content a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const url = link.getAttribute('href');

            if (url === '#' || url.startsWith('#')) {
                return;
            }

            history.pushState({}, '', url);
            parseURL();
        });
    });

    DOMElements.logoHomeLink?.addEventListener('click', () => {
        renderView('home', {}, true);
    });

    // --- Global Event Listeners ---

    window.addEventListener('scroll', function() {
        const header = document.querySelector('header');
        if (window.scrollY > 10) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    const header = document.querySelector('header');
    if (window.scrollY > 10) {
        header.classList.add('scrolled');
    }

    DOMElements.mobileSearchIcon?.addEventListener('click', (e) => {
        DOMElements.searchContainer.classList.toggle('active');
        if (DOMElements.searchContainer.classList.contains('active')) {
            DOMElements.searchInput.focus();
        }
    });

    document.addEventListener('click', (e) => {
        if (!DOMElements.searchContainer.contains(e.target) && !DOMElements.mobileSearchIcon.contains(e.target)) {
            DOMElements.searchContainer.classList.remove('active');
        }
    });

    document.querySelector('.user-profile.dropdown')?.addEventListener('click', function(e) {
        if (e.target.closest('.dropdown-content') === null) {
            const dropdown = this.querySelector('.dropdown-content');
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        }
    });

    DOMElements.guestUserIcon?.addEventListener('click', function(e) {
        DOMElements.guestDropdown.style.display = DOMElements.guestDropdown.style.display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.dropdown') && !e.target.closest('#guest-user-icon')) {
            closeAllDropdowns();
        }
    });

    DOMElements.mobileLoginLink?.addEventListener('click', () => {
        openModal(DOMElements.loginModal);
    });

    DOMElements.mobileSignupLink?.addEventListener('click', () => {
        openModal(DOMElements.signupModal);
    });

    document.querySelectorAll('.user-profile .dropdown-content a').forEach(item => {
        item.addEventListener('click', (e) => {
            closeAllDropdowns();
        });
    });

    document.querySelectorAll('#guest-dropdown a').forEach(item => {
        item.addEventListener('click', (e) => {
            closeAllDropdowns();
        });
    });

    DOMElements.mainContent.addEventListener('click', async (e) => {
        const deleteButton = e.target.closest('#delete-listing-btn');
        const editButton = e.target.closest('#edit-listing-btn');

        if (deleteButton) {
            e.stopPropagation();
            const listingId = deleteButton.getAttribute('data-id');
            if (listingId) {
                if (confirm("Are you sure you want to delete this listing? This action cannot be undone.")) {
                    await handleDeleteListing(listingId);
                }
            }
        } else if (editButton) {
            e.stopPropagation();
            const listingId = editButton.getAttribute('data-id');
            if (listingId) {
                await openEditListingModal(listingId);
            }
        }
    });

    // --- Modal Event Listeners ---

    DOMElements.loginButton?.addEventListener('click', () => {
        openModal(DOMElements.loginModal);
    });
    DOMElements.signupButton?.addEventListener('click', () => {
        openModal(DOMElements.signupModal);
    });

    DOMElements.closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            closeModal(modal);
        });
    });

    DOMElements.switchToSignup?.addEventListener('click', () => {
        closeModal(DOMElements.loginModal);
        openModal(DOMElements.signupModal);
    });

    DOMElements.switchToLogin?.addEventListener('click', () => {
        closeModal(DOMElements.signupModal);
        openModal(DOMElements.loginModal);
    });

    DOMElements.forgotPasswordLink?.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal(DOMElements.loginModal);
        openModal(DOMElements.forgotPasswordModal);
    });

    DOMElements.backToLoginLink?.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal(DOMElements.forgotPasswordModal);
        openModal(DOMElements.loginModal);
    });

    DOMElements.otpModal.querySelector('.modal-close')?.addEventListener('click', () => {
        clearInterval(DOMElements.resendTimer);
        closeModal(DOMElements.otpModal);
    });

    // --- Form Submissions ---
    DOMElements.loginForm?.addEventListener('submit', handleLogin);
    DOMElements.signupForm?.addEventListener('submit', handleSignup);
    DOMElements.addListingForm?.addEventListener('submit', handleAddListing);

    DOMElements.forgotPasswordForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = DOMElements.forgotPasswordEmail.value;

        showLoadingDialog();

        try {
            await userAPI.forgotPassword(email);
            DOMElements.otpEmailForReset.value = email;
            openOTPModal(email, null, true);
        } catch (error) {
            showMessage(error.message || 'Email not found', 'error');
        } finally {
            hideLoadingDialog();
        }
    });

    // --- Search & Category/Location Selection ---
    DOMElements.searchButton?.addEventListener('click', () => {
        renderView('search');
    });

    DOMElements.locationIcon?.addEventListener('click', () => {
        openLocationModal('filter');
    });
    DOMElements.addListingLocationBtn?.addEventListener('click', () => {
        openLocationModal('add-listing');
    });
    DOMElements.editListingLocationBtn?.addEventListener('click', () => {
        openLocationModal('edit-listing');
    });
    DOMElements.editProfileLocationBtn?.addEventListener('click', () => {
        openLocationModal('edit-profile');
    });

    DOMElements.locationSearch?.addEventListener('input', (e) => {
        renderLocationLists(e.target.value);
    });

    DOMElements.defaultToAllButton?.addEventListener('click', () => {
        const purpose = DOMElements.locationModal.getAttribute('data-purpose');
        if (purpose === 'filter') {
            selectLocation('all', 'All');
        }
    });

    DOMElements.autoDetectLocationButton?.addEventListener('click', () => {
        DOMElements.autoDetectLocationButton.classList.add('clicked');
        showMessage('Finding your location...', 'info');
        autoSelectLocation();
        closeModal(DOMElements.locationModal);
    });

    document.querySelectorAll('.location-tabs .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.location-tabs .tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.location-section').forEach(section => section.classList.remove('active'));
            document.getElementById(`${tab.getAttribute('data-tab')}-list-section`)?.classList.add('active');
        });
    });

    DOMElements.listingCategory?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openCategoryModal('add-listing');
        DOMElements.listingCategory.blur();
    });

    DOMElements.editListingCategory?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const currentCategory = DOMElements.editListingCategory.value;
        openCategoryModal('edit-listing', currentCategory);
        DOMElements.editListingCategory.blur();
    });

    DOMElements.categorySelect?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const currentValue = DOMElements.categorySelect.value;
        openCategoryModal('select-only', currentValue);
        DOMElements.categorySelect.blur();
    });

    DOMElements.categorySearch?.addEventListener('input', (e) => {
        renderCategoryList(e.target.value);
    });

    // --- Image Uploads ---

    DOMElements.imageUpload?.addEventListener('click', () => {
        DOMElements.listingImageInput.click();
    });

    DOMElements.listingImageInput?.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);

        if (files.length === 0) {
            return;
        }

        if (uploadedImages.length + files.length > 5) {
            showMessage('You can upload a maximum of 5 images in total', 'error');
            e.target.value = '';
            return;
        }

        showLoadingDialog();

        try {
            for (const file of files) {
                if (file.type.startsWith('image/')) {
                    const compressedBlob = await compressImage(file);

                    if (!compressedBlob || compressedBlob.size === 0) {
                        showMessage(`Failed to process image: ${file.name}`, 'error');
                        continue;
                    }

                    const imageUrl = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            resolve(event.target.result);
                        };
                        reader.onerror = (error) => {
                            reject(error);
                        };
                        reader.readAsDataURL(compressedBlob);
                    });

                    addUploadedImage(imageUrl);

                    renderImagePreviews();
                } else {
                }
            }
        } catch (error) {
            showMessage('An unexpected error occurred during image processing.', 'error');
        } finally {
            hideLoadingDialog();
            e.target.value = '';
        }
    });

    // --- OTP Verification ---
    if (DOMElements.otpInputs && DOMElements.otpInputs.length > 0) {
        DOMElements.otpInputs.forEach(input => {
            input.addEventListener('input', handleOTPInput);
            input.addEventListener('keydown', handleOTPInput);
        });
    }

    DOMElements.resendOtpBtn?.addEventListener('click', async () => {
        const email = DOMElements.otpEmail.textContent;
        const isSignup = DOMElements.otpModal.getAttribute('data-signup-data') !== null;

        showLoadingDialog();

        try {
            if (isSignup) {
                await userAPI.signup(null, email, null);
            } else {
                await userAPI.forgotPassword(email);
            }

            clearInterval(DOMElements.resendTimer);
            startResendTimer();
            resetOTPInputs();
            DOMElements.otpError.style.display = 'none';

            showMessage('OTP resent successfully!', 'success');
        } catch (error) {
            showMessage('Error resending OTP. Please try again.', 'error');
        } finally {
            hideLoadingDialog();
        }
    });

    // --- Profile & Settings ---
    toggleRequiredAttribute('enable-phone', 'edit-profile-phone');
    toggleRequiredAttribute('enable-whatsapp', 'edit-profile-whatsapp');

    DOMElements.signupPassword?.addEventListener('input', (e) => {
        updatePasswordStrength(e.target.value, 'signup-password');
        checkPasswordMatch(e.target.value, DOMElements.signupConfirmPassword.value, DOMElements.passwordMatchFeedback);
    });

    DOMElements.signupConfirmPassword?.addEventListener('input', (e) => {
        checkPasswordMatch(DOMElements.signupPassword.value, e.target.value, DOMElements.passwordMatchFeedback);
    });

    // --- Navigation Links ---
    DOMElements.homeLink?.addEventListener('click', () => renderView('home', {}, true));
    DOMElements.productsLink?.addEventListener('click', () => renderView('products', {}, true));
    DOMElements.servicesLink?.addEventListener('click', () => renderView('services', {}, true));
    DOMElements.aboutLink?.addEventListener('click', () => renderView('about'));
    DOMElements.contactLink?.addEventListener('click', () => renderView('contact'));

    DOMElements.navProfileLink?.addEventListener('click', () => renderView('profile', currentUser?.slug || currentUser?._id));
    DOMElements.navDashboardLink?.addEventListener('click', () => renderView('dashboard'));
    DOMElements.navFavoritesLink?.addEventListener('click', () => renderView('favorites'));
    DOMElements.navSettingsLink?.addEventListener('click', () => renderView('settings'));

    DOMElements.logoutLink?.addEventListener('click', handleLogout);

    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.view) {
            renderView(event.state.view, event.state.params, false, event.state.scrollY);
        } else {
            parseURL();
        }
    });
});
