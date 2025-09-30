// js/auth.js
import { userAPI, setToken, removeToken, getToken } from './api.js'; // <-- getToken imported directly
import { setCurrentUser, currentUser } from './state.js';
import DOMElements from './dom.js';
import { showMessage, showLoadingDialog, hideLoadingDialog } from './utils.js';
import { closeModal, openModal } from './modals.js';
import { openOTPModal } from './otp-password.js';
import { renderView } from './views/core.js';
import { validatePassword, checkPasswordMatch } from './utils.js';

async function handleLogin(e) {
    e.preventDefault();

    const email = DOMElements.loginEmail.value;
    const password = DOMElements.loginPassword.value;
    showLoadingDialog();
    try {
        const response = await userAPI.login(email, password);
        setCurrentUser(response.user);

        // Store the JWT token
        setToken(response.token);

        updateAuthUI();
        closeModal(DOMElements.loginModal);
        //renderView('home');
        showMessage('Welcome back!', 'success');
    } catch (error) {
        showMessage(error.message || 'Invalid email or password', 'error');
    } finally {
        hideLoadingDialog();
    }
}

async function handleSignup(e) {
    e.preventDefault();

    const name = DOMElements.signupName.value;
    const email = DOMElements.signupEmail.value;
    const password = DOMElements.signupPassword.value;
    const confirmPassword = DOMElements.signupConfirmPassword.value;

    // Validate password strength
    const { requirements, strength } = validatePassword(password);
    if (strength < 3) { // Require at least 3 out of 5 criteria
        showMessage('Password is too weak. Please make it stronger.', 'error');
        return;
    }

    // Check password match
    // FIX: Pass the DOMElements.passwordMatchFeedback to the function
    if (!checkPasswordMatch(password, confirmPassword, DOMElements.passwordMatchFeedback)) {
        showMessage('Passwords do not match', 'error');
        return;
    }

    showLoadingDialog(); // Show loading before making the API call
    try {
        // First, call the signup API to send the OTP
        const response = await userAPI.signup(name, email, password);
        showMessage(response.message || 'OTP sent successfully to your email', 'success');

        // Store the signup data temporarily
        const signupData = {
            name,
            email,
            password,
        };

        // Open OTP modal for verification, indicating OTP has already been sent
        openOTPModal(email, signupData, true); // Pass true for otpAlreadySent
    } catch (error) {
        showMessage(error.message || 'Error creating account', 'error');
    } finally {
        hideLoadingDialog(); // Hide loading after API call completes or fails
    }
}

async function createAccount(signupData) {
    showLoadingDialog();
    try {
        const { name, email, password } = signupData;
        // This function is now primarily for completing the signup after OTP verification
        // The actual signup (sending OTP) is handled in handleSignup
        const response = await userAPI.login(email, password); // After OTP, user should be able to log in directly

        setCurrentUser(response.user);

        // Store the JWT token
        setToken(response.token);

        closeModal(DOMElements.signupModal);

        updateAuthUI();
        renderView('profile', currentUser._id);
        showMessage('Welcome to Keid!', 'success');
    } catch (error) {
        showMessage(error.message || 'Error creating account', 'error');
    } finally {
        hideLoadingDialog();
    }
}

function handleLogout() {
    const confirmLogout = confirm("Are you sure you want to log out?");
    if (confirmLogout) {
        setCurrentUser(null);

        // Remove the JWT token
        removeToken();

        updateAuthUI();
        renderView('home');
        showMessage('Logged out successfully', 'success');
    }
}

async function checkAuthState() {
    const token = getToken(); // <-- Corrected: Directly call getToken()
    if (token) {
        try {
            const response = await userAPI.verifyAuth();
            if (response.isValid) {
                setCurrentUser(response.user);
                updateAuthUI();
                return true;
            } else {
                removeToken();
                return false;
            }
        } catch (error) {
            console.error('Auth validation failed:', error);
            removeToken();
            return false;
        }
    }
    return false;
}

function updateAuthUI() {
    if (currentUser) {
        DOMElements.userActions.style.display = 'none';
        DOMElements.userProfile.style.display = 'flex';
        DOMElements.navProfileImg.src = currentUser.profilePic;
    } else {
        DOMElements.userActions.style.display = 'flex';
        DOMElements.userProfile.style.display = 'none';
    }
}

export { handleLogin, handleSignup, createAccount, handleLogout, checkAuthState, updateAuthUI };
