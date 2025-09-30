// js/views/settings.js
import {
    currentUser,
    setCurrentUser,
    currentActiveRenderId,
    setCachedUserProfile,
} from '../state.js';
import DOMElements, { initializeDOMElements } from '../dom.js';
import { userAPI } from '../api.js';
import {
    showMessage,
    updatePasswordStrength,
    checkPasswordMatch,
    hideLoadingDialog,
    showLoadingDialog,
    validatePassword,
} from '../utils.js';
import { renderView, updatePageTitle } from './core.js'; // Import from core

export async function renderSettings(renderId) {
    if (renderId !== currentActiveRenderId) return;

    updatePageTitle('Settings - Keid'); // Ensure title is set

    if (!currentUser) {
        if (renderId !== currentActiveRenderId) return;
        DOMElements.mainContent.innerHTML = '<p>Please login to access settings</p>';
        initializeDOMElements();
        return;
    }

    const html = `
    <div class="form-container">
    <h2 class="form-title">Settings</h2>
    <form id="settings-form">
    <div class="form-group">
    <label for="settings-name">Full Name</label>
    <input type="text" maxlength="30" id="settings-name" value="${currentUser.name}" required disabled>
    </div>
    <div class="form-group">
    <label for="settings-email">Email</label>
    <input type="email" id="settings-email" value="${currentUser.email}" disabled>
    </div>
    <div class="form-group">
    <label for="settings-password">Password</label>
    <input type="password" minlength="8" id="settings-password" placeholder="Enter new password">
    <div class="password-strength-meter">
    <div class="strength-bar"></div>
    </div>
    <div class="password-requirements">
    <p class="requirement" data-requirement="length"><i class="fas fa-circle"></i> At least 8 characters</p>
    <p class="requirement" data-requirement="uppercase"><i class="fas fa-circle"></i> Contains uppercase letter</p>
    <p class="requirement" data-requirement="lowercase"><i class="fas fa-circle"></i> Contains lowercase letter</p>
    <p class="requirement" data-requirement="number"><i class="fas fa-circle"></i> Contains number</p>
    <p class="requirement" data-requirement="special"><i class="fas fa-circle"></i> Contains special character</p>
    </div>
    </div>
    <div class="form-group">
    <label for="settings-confirm-password">Confirm Password</label>
    <input type="password" minlength="8" id="settings-confirm-password" placeholder="Confirm new password">
    <div id="settings-password-match-feedback" style="display: none; margin-top: 5px; font-size: 12px;"></div>
    </div>
    <button type="submit" class="btn-primary">Save Changes</button>
    </form>
    </div>
    `;

    if (renderId !== currentActiveRenderId) return;
    DOMElements.mainContent.innerHTML = html;
    initializeDOMElements();

    DOMElements.settingsPassword = document.getElementById('settings-password');
    DOMElements.settingsConfirmPassword = document.getElementById('settings-confirm-password');
    DOMElements.settingsPasswordMatchFeedback = document.getElementById('settings-password-match-feedback');

    updatePasswordStrength(DOMElements.settingsPassword.value, 'settings-password');
    checkPasswordMatch(DOMElements.settingsPassword.value, DOMElements.settingsConfirmPassword.value, DOMElements.settingsPasswordMatchFeedback);

    DOMElements.settingsPassword.addEventListener('input', () => {
        updatePasswordStrength(DOMElements.settingsPassword.value, 'settings-password');
        checkPasswordMatch(DOMElements.settingsPassword.value, DOMElements.settingsConfirmPassword.value, DOMElements.settingsPasswordMatchFeedback);
    });

    DOMElements.settingsConfirmPassword.addEventListener('input', () => {
        updatePasswordStrength(DOMElements.settingsPassword.value, 'settings-password');
        checkPasswordMatch(DOMElements.settingsPassword.value, DOMElements.settingsConfirmPassword.value, DOMElements.settingsPasswordMatchFeedback);
    });

    document.getElementById('settings-form')?.addEventListener('submit', handleSettingsUpdate);
}

export async function handleSettingsUpdate(e) {
    e.preventDefault();

    const name = DOMElements.settingsName.value; // Currently disabled by design
    const password = DOMElements.settingsPassword.value;
    const confirmPassword = DOMElements.settingsConfirmPassword.value;

    showLoadingDialog();
    try {
        if (password) {
            if (password !== confirmPassword) {
                showMessage('Passwords do not match', 'error');
                hideLoadingDialog();
                return;
            }
            const { strength } = validatePassword(password);
            if (strength < 3) {
                showMessage('Password is too weak. Please make it stronger.', 'error');
                hideLoadingDialog();
                return;
            }

            await userAPI.updatePassword(currentUser._id, password);
            showMessage('Password updated!', 'success');
            DOMElements.settingsPassword.value = '';
            DOMElements.settingsConfirmPassword.value = '';
            updatePasswordStrength('', 'settings-password');
            checkPasswordMatch('', '', DOMElements.settingsPasswordMatchFeedback);
        }

        renderView('profile', currentUser.slug);
    } catch (error) {
        console.error('Error updating settings:', error);
        showMessage(error.message || 'Error updating settings', 'error');
    } finally {
        hideLoadingDialog();
    }
}
