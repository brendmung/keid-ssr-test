// js/dom.js
const DOMElements = {}; // Initialize as an empty object

export function initializeDOMElements() {
    // Header Elements
    DOMElements.mainContent = document.getElementById('main-content');
    DOMElements.loginButton = document.getElementById('login-button');
    DOMElements.signupButton = document.getElementById('signup-button');
    DOMElements.mobileSearchIcon = document.getElementById('mobile-search-icon');
    DOMElements.searchContainer = document.getElementById('search-container');
    DOMElements.searchInput = document.getElementById('search-input');
    DOMElements.guestUserIcon = document.getElementById('guest-user-icon');
    DOMElements.guestDropdown = document.getElementById('guest-dropdown');
    DOMElements.userActions = document.getElementById('user-actions');
    DOMElements.userProfile = document.getElementById('user-profile');
    DOMElements.navProfileImg = document.getElementById('nav-profile-img');
    DOMElements.mobileLoginLink = document.getElementById('mobile-login-link');
    DOMElements.mobileSignupLink = document.getElementById('mobile-signup-link');
    DOMElements.logoHomeLink = document.getElementById('logo-home-link');

    // Navigation Links
    DOMElements.homeLink = document.getElementById('home-link');
    DOMElements.productsLink = document.getElementById('products-link');
    DOMElements.servicesLink = document.getElementById('services-link');
    DOMElements.aboutLink = document.getElementById('about-link');
    DOMElements.contactLink = document.getElementById('contact-link');
    DOMElements.navProfileLink = document.getElementById('nav-profile-link');
    DOMElements.navDashboardLink = document.getElementById('nav-dashboard-link');
    DOMElements.navFavoritesLink = document.getElementById('nav-favorites-link');
    DOMElements.navSettingsLink = document.getElementById('nav-settings-link');
    DOMElements.logoutLink = document.getElementById('logout-link');
    DOMElements.locationIcon = document.getElementById('location-icon');
    DOMElements.locationText =  document.getElementById('location-text'),
    DOMElements.categorySelect = document.getElementById('category-select');
    DOMElements.searchButton = document.getElementById('search-button');

    // Modals and Forms
    DOMElements.loginModal = document.getElementById('login-modal');
    DOMElements.signupModal = document.getElementById('signup-modal');
    DOMElements.forgotPasswordModal = document.getElementById('forgot-password-modal');
    DOMElements.otpModal = document.getElementById('otp-modal');
    DOMElements.addListingModal = document.getElementById('add-listing-modal');
    DOMElements.editListingModal = document.getElementById('edit-listing-modal');
    DOMElements.locationModal = document.getElementById('location-modal');
    DOMElements.categoryModal = document.getElementById('category-modal');
    DOMElements.editProfileModal = document.getElementById('edit-profile-modal');
    DOMElements.contactModal = document.getElementById('contact-modal');
    DOMElements.loadingModal = document.getElementById('loading-modal');
    // NEW: Add references to Terms and Privacy Policy modals
    DOMElements.termsModal = document.getElementById('terms-modal');
    DOMElements.privacyModal = document.getElementById('privacy-modal');
    DOMElements.shareModal = document.getElementById('share-modal'); // Assuming share-modal is also a global modal
    DOMElements.fullImageView = document.getElementById('full-image-view'); // ADD THIS LINE
    DOMElements.fullImage = document.getElementById('full-image'); // ADD THIS LINE
    DOMElements.closeFullImage = document.getElementById('close-full-image'); // ADD THIS LINE
    DOMElements.resetPasswordModal = document.getElementById('reset-password-modal'); // ADD THIS LINE
    DOMElements.shareProfileModal = document.getElementById('share-profile-modal'); // ADD THIS LINE
    DOMElements.shareProfileFacebook = document.getElementById('share-profile-facebook'); // ADD THIS LINE
    DOMElements.shareProfileTwitter = document.getElementById('share-profile-twitter'); // ADD THIS LINE
    DOMElements.shareProfileWhatsapp = document.getElementById('share-profile-whatsapp'); // ADD THIS LINE
    DOMElements.shareProfileUrl = document.getElementById('share-profile-url'); // ADD THIS LINE
    DOMElements.copyProfileUrlBtn = document.getElementById('copy-profile-url-btn'); // ADD THIS LINE
    // NEW: Report User Modal Elements
    DOMElements.reportUserModal = document.getElementById('report-user-modal');
    DOMElements.reportUserForm = document.getElementById('report-user-form');
    DOMElements.reportedUserName = document.getElementById('reported-user-name');
    DOMElements.reportedUserIdInput = document.getElementById('reported-user-id-input');
    DOMElements.reportReason = document.getElementById('report-reason');
    DOMElements.reportDescription = document.getElementById('report-description');


    DOMElements.closeButtons = document.querySelectorAll('.modal-close, .modal-close-btn');
    DOMElements.switchToSignup = document.getElementById('switch-to-signup');
    DOMElements.switchToLogin = document.getElementById('switch-to-login');
    DOMElements.forgotPasswordLink = document.getElementById('forgot-password-link');
    DOMElements.backToLoginLink = document.getElementById('back-to-login');

    // Login Form
    DOMElements.loginForm = document.getElementById('login-form');
    DOMElements.loginEmail = document.getElementById('login-email');
    DOMElements.loginPassword = document.getElementById('login-password');

    // Signup Form
    DOMElements.signupForm = document.getElementById('signup-form');
    DOMElements.signupName = document.getElementById('signup-name');
    DOMElements.signupEmail = document.getElementById('signup-email');
    DOMElements.signupPassword = document.getElementById('signup-password');
    DOMElements.signupConfirmPassword = document.getElementById('signup-confirm-password');
    // ADD THIS LINE:
    DOMElements.passwordMatchFeedback = document.getElementById('password-match-feedback');

    // Forgot Password Form
    DOMElements.forgotPasswordForm = document.getElementById('forgot-password-form');
    DOMElements.forgotPasswordEmail = document.getElementById('forgot-password-email');

    // OTP Modal
    DOMElements.otpInputs = document.querySelectorAll('.otp-input');
    DOMElements.resendOtpBtn = document.getElementById('resend-otp-btn');
    DOMElements.resendText = document.getElementById('resend-text');
    DOMElements.resendTimer = document.getElementById('resend-timer');
    DOMElements.otpEmail = document.getElementById('otp-email');
    DOMElements.otpEmailForReset = document.getElementById('otp-email-for-reset');
    DOMElements.otpError = document.getElementById('otp-error');

    // NEW: Reset Password Modal Elements
    DOMElements.resetPasswordForm = document.getElementById('reset-password-form'); // ADD THIS LINE
    DOMElements.resetTokenInput = document.getElementById('reset-token-input'); // ADD THIS LINE
    DOMElements.newPassword = document.getElementById('new-password'); // ADD THIS LINE
    DOMElements.confirmNewPassword = document.getElementById('confirm-new-password'); // ADD THIS LINE
    DOMElements.newPasswordMatchFeedback = document.getElementById('new-password-match-feedback'); // ADD THIS LINE


    // Add Listing Form
    DOMElements.addListingForm = document.getElementById('add-listing-form');
    DOMElements.listingTitle = document.getElementById('listing-title');
    DOMElements.listingDescription = document.getElementById('listing-description');
    DOMElements.listingPrice = document.getElementById('listing-price');
    DOMElements.listingCategory = document.getElementById('listing-category');
    DOMElements.listingType = document.getElementById('listing-type');
    DOMElements.listingImageInput = document.getElementById('image-input');
    DOMElements.listingImagePreview = document.getElementById('image-preview');
    DOMElements.addListingLocationBtn = document.getElementById('add-listing-location-btn');
    DOMElements.listingLocationId = document.getElementById('listing-location-id');
    DOMElements.listingLocationName = document.getElementById('listing-location-name');

    // Edit Listing Form
    DOMElements.editListingForm = document.getElementById('edit-listing-form');
    DOMElements.editListingTitle = document.getElementById('edit-listing-title');
    DOMElements.editListingDescription = document.getElementById('edit-listing-description');
    DOMElements.editListingPrice = document.getElementById('edit-listing-price');
    DOMElements.editListingCategory = document.getElementById('edit-listing-category');
    DOMElements.editListingType = document.getElementById('edit-listing-type');
    DOMElements.editImageInput = document.getElementById('edit-image-input');
    DOMElements.editImagePreview = document.getElementById('edit-image-preview');
    DOMElements.editListingLocationBtn = document.getElementById('edit-listing-location-btn');
    DOMElements.editListingLocationId = document.getElementById('edit-listing-location-id');
    DOMElements.editListingLocationName = document.getElementById('edit-listing-location-name');

    // Location Modal
    DOMElements.locationSearch = document.getElementById('location-search');
    DOMElements.cityList = document.getElementById('city-list');
    DOMElements.campusList = document.getElementById('campus-list');
    DOMElements.defaultToAllButton = document.getElementById('default-to-all-button');
    DOMElements.autoDetectLocationButton = document.getElementById('auto-detect-location-button'); // NEW: Auto Detect Button

    // Category Modal
    DOMElements.categorySearch = document.getElementById('category-search');
    DOMElements.categoryList = document.getElementById('category-list');

    // Image Upload (for Add Listing)
    DOMElements.imageUpload = document.getElementById('image-upload');

    // Image Upload (for Edit Listing)
    DOMElements.editImageUpload = document.getElementById('edit-image-upload');


    // Settings Form
    DOMElements.settingsName = document.getElementById('settings-name');
    DOMElements.settingsEmail = document.getElementById('settings-email');
    DOMElements.settingsPassword = document.getElementById('settings-password');
    DOMElements.settingsConfirmPassword = document.getElementById('settings-confirm-password');

    // Edit Profile Modal
    DOMElements.editProfileForm = document.getElementById('edit-profile-form');
    DOMElements.editProfileDisplayName = document.getElementById('edit-profile-display-name');
    DOMElements.editProfileLocationName = document.getElementById('edit-profile-location-name');
    DOMElements.editProfileLocationBtn = document.getElementById('edit-profile-location-btn');
    DOMElements.editProfileLocationId = document.getElementById('edit-profile-location-id');
    DOMElements.editProfilePhone = document.getElementById('edit-profile-phone');
    DOMElements.editProfileWhatsapp = document.getElementById('edit-profile-whatsapp');
    DOMElements.editProfileBio = document.getElementById('edit-profile-bio');
    DOMElements.editProfilePicPreview = document.getElementById('edit-profile-pic-preview');
    DOMElements.editProfilePicUpload = document.getElementById('edit-profile-pic-upload');
    DOMElements.editProfilePicInput = document.getElementById('edit-profile-pic-input');
    DOMElements.enablePhone = document.getElementById('enable-phone');
    DOMElements.enableWhatsapp = document.getElementById('enable-whatsapp');

    // Contact Us Form
    DOMElements.contactUsForm = document.getElementById('contact-us-form');
    DOMElements.contactUsName = document.getElementById('contact-us-name');
    DOMElements.contactUsEmail = document.getElementById('contact-us-email');
    DOMElements.contactUsSubject = document.getElementById('contact-us-subject');
    DOMElements.contactUsMessage = document.getElementById('contact-us-message');

    // Contact Modal (for listing/profile contact)
    DOMElements.contactName = document.getElementById('contact-name');
    DOMElements.whatsappBtn = document.getElementById('whatsapp-btn');
    DOMElements.callBtn = document.getElementById('call-btn');
}

export default DOMElements; // Export the DOMElements object itself
