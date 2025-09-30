// js/otp-password.js
import DOMElements from './dom.js';
import { API_BASE_URL } from './config.js';
import { showMessage, showLoadingDialog, hideLoadingDialog, updatePasswordStrength, checkPasswordMatch } from './utils.js';
import { setOtpTimer, setResendTimer, otpTimer, resendTimer } from './state.js';
import { closeModal, openModal, resetForgotPasswordModal } from './modals.js';
import { createAccount, updateAuthUI } from './auth.js';
import { userAPI } from './api.js';
import { setCurrentUser } from './state.js';
import { renderView } from './views/core.js'; // Updated import path for renderView

async function openOTPModal(email, signupData = null, otpAlreadySent = false) {
    const otpModal = DOMElements.otpModal;

    if (!DOMElements.otpEmail) {
        console.error('Element with id "otp-email" not found.');
        return;
    }

    try {
        DOMElements.otpEmail.textContent = email;
        openModal(otpModal);

        resetOTPInputs();
        DOMElements.otpError.style.display = 'none';
        startResendTimer();

        if (signupData) {
            otpModal.setAttribute('data-signup-data', JSON.stringify(signupData));
        } else {
            otpModal.removeAttribute('data-signup-data');
        }

    } catch (error) {
        console.error('Error opening OTP modal:', error);
        showMessage('Error opening OTP verification. Please try again.', 'error');
    } finally {
        // No hideLoadingDialog here, as it's handled by the calling function
    }
}

function resetOTPInputs() {
    DOMElements.otpInputs.forEach(input => {
        input.value = '';
        input.classList.remove('error');
    });

    DOMElements.otpInputs[0].focus();
}

function startResendTimer() {
    let timeLeft = 30;
    const resendBtn = DOMElements.resendOtpBtn;
    const timerText = DOMElements.resendTimer;
    const resendText = DOMElements.resendText;

    if (!resendBtn || !timerText || !resendText) {
        console.error("Required elements not found.");
        return;
    }

    resendText.style.display = "inline";
    timerText.style.display = "inline";
    timerText.textContent = timeLeft;

    resendBtn.disabled = true;
    setResendTimer(setInterval(() => {
        timeLeft--;
        timerText.textContent = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(resendTimer);
            resendBtn.disabled = false;
            resendText.textContent = "Resend OTP";
            timerText.style.display = "none";
        }
    }, 1000));
}

function handleOTPInput(e) {
    const input = e.target;
    let value = input.value;

    value = value.replace(/[^0-9]/g, '');

    if (value.length > 1) {
        value = value.slice(0, 1);
    }

    input.value = value;

    const nextInput = input.getAttribute('data-next');
    const previousInput = input.getAttribute('data-previous');

    if (value.length === 1 && nextInput) {
        document.getElementById(nextInput).focus();
    }

    if (e.key === 'Backspace' && value.length === 0 && previousInput) {
        document.getElementById(previousInput).focus();
    }

    const otp = Array.from(DOMElements.otpInputs).map(otpInput => otpInput.value).join('');

    if (otp.length === 4) {
        closeModal(DOMElements.signupModal);
        verifyOTP(otp);
    }
}

async function verifyOTP(otp) {
    try {
        const forgotPasswordModal = DOMElements.forgotPasswordModal;
        const otpModal = DOMElements.otpModal;
        const email = DOMElements.otpEmail.textContent;
        const isSignupFlow = otpModal.getAttribute('data-signup-data') !== null;

        showLoadingDialog();

        const result = await userAPI.verifyOTP(email, otp, isSignupFlow);

        if (result.success) {
            closeModal(otpModal);
            clearInterval(resendTimer);
            closeModal(forgotPasswordModal);

            if (isSignupFlow) {
                setCurrentUser(result.user);
                localStorage.setItem('userToken', result.token);
                updateAuthUI();
                showMessage('Email verified and account created!', 'success');
                renderView('profile', result.user._id);
                closeModal(DOMElements.signupModal);
            } else {
                const resetToken = result.resetToken;
                if (resetToken) {
                    showMessage('OTP verified. Please set your new password.', 'success');
                    openModal(DOMElements.resetPasswordModal);
                    DOMElements.resetTokenInput.value = resetToken;
                    updatePasswordStrength(DOMElements.newPassword.value);
                    checkPasswordMatch(DOMElements.newPassword.value, DOMElements.confirmNewPassword.value, DOMElements.newPasswordMatchFeedback);

                    DOMElements.newPassword.addEventListener('input', () => {
                        updatePasswordStrength(DOMElements.newPassword.value);
                        checkPasswordMatch(DOMElements.newPassword.value, DOMElements.confirmNewPassword.value, DOMElements.newPasswordMatchFeedback);
                    });
                    DOMElements.confirmNewPassword.addEventListener('input', () => {
                        checkPasswordMatch(DOMElements.newPassword.value, DOMElements.confirmNewPassword.value, DOMElements.newPasswordMatchFeedback);
                    });

                    DOMElements.resetPasswordForm.onsubmit = async (e) => {
                        e.preventDefault();
                        const newPassword = DOMElements.newPassword.value;
                        const confirmNewPassword = DOMElements.confirmNewPassword.value;
                        const token = DOMElements.resetTokenInput.value;

                        if (newPassword !== confirmNewPassword) {
                            showMessage('Passwords do not match', 'error');
                            return;
                        }
                        const { strength } = updatePasswordStrength(newPassword);
                        if (strength < 3) {
                            showMessage('Password is too weak. Please make it stronger.', 'error');
                            return;
                        }

                        showLoadingDialog();
                        try {
                            await userAPI.resetPassword(token, newPassword);
                            showMessage('Password reset successfully! You can now log in with your new password.', 'success');
                            closeModal(DOMElements.resetPasswordModal);
                            openModal(DOMElements.loginModal);
                        } catch (error) {
                            console.error('Reset password error:', error);
                            showMessage(error.message || 'Failed to reset password', 'error');
                        } finally {
                            hideLoadingDialog();
                        }
                    };

                } else {
                    showMessage('OTP verified, but no reset token received. Please try again.', 'error');
                }
            }
        }
    } catch (error) {
        console.error('OTP verification error:', error);
        if (error.message == "Invalid or expired OTP. Please request a new one.") {
            DOMElements.otpInputs.forEach(input => {
                input.classList.add('error');
                void input.offsetWidth;
            });
            DOMElements.otpError.style.display = 'block';
            DOMElements.otpError.textContent = `Error: Invalid OTP`;

            setOtpTimer(setTimeout(() => {
                resetOTPInputs();
                DOMElements.otpError.style.display = 'none';
            }, 3000));
        }
    } finally {
        hideLoadingDialog();
    }
}


export { openOTPModal, resetOTPInputs, startResendTimer, handleOTPInput, verifyOTP };
