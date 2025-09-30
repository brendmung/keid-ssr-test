// js/contact.js
import DOMElements from './dom.js';
import { userAPI } from './api.js';
import { showMessage, showLoadingDialog, hideLoadingDialog } from './utils.js';
import { openModal } from './modals.js';
import { renderView } from './views/core.js'; // Import from core

// Modified to accept a full user object or a userId string
export async function openContactModal(userOrUserId, listing = null) {
    showLoadingDialog();
    try {
        let user;
        let userIdToFetch = '';

        if (typeof userOrUserId === 'object' && userOrUserId !== null && userOrUserId._id) {
            if (userOrUserId.phone && userOrUserId.whatsapp) {
                user = userOrUserId;
            } else {
                userIdToFetch = userOrUserId._id;
            }
        } else if (typeof userOrUserId === 'string') {
            userIdToFetch = userOrUserId;
        } else {
            console.error("openContactModal received an invalid user identifier:", userOrUserId);
            showMessage('Invalid user identifier for contact.', 'error');
            hideLoadingDialog();
            return;
        }

        if (userIdToFetch) {
            user = await userAPI.getProfile(userIdToFetch);
        }

        if (!user) {
            showMessage('User not found', 'error');
            hideLoadingDialog();
            return;
        }

        DOMElements.contactName.textContent = user.displayName;

        const whatsappBtn = DOMElements.whatsappBtn;
        if (user.whatsapp) {
            whatsappBtn.style.display = 'inline-block';
            whatsappBtn.onclick = () => {
                let whatsappUrl = `https://wa.me/${user.whatsapp}`;
                if (listing) {
                    const message = `Hi, I'm interested in your ${listing.type} "${listing.title}". Can you tell me more about it? Link: ${window.location.origin}/${listing.type}/${listing.slug}`;
                    whatsappUrl += `?text=${encodeURIComponent(message)}`;
                }
                window.open(whatsappUrl, '_blank');
            };
        } else {
            whatsappBtn.style.display = 'none';
        }

        const callBtn = DOMElements.callBtn;
        if (user.phone) {
            callBtn.style.display = 'inline-block';
            callBtn.onclick = () => {
                const telUrl = `tel:${user.phone}`;
                window.location.href = telUrl;
            };
        } else {
            callBtn.style.display = 'none';
        }

        openModal(DOMElements.contactModal);
    } catch (error) {
        showMessage(error.message || 'Error loading user data', 'error');
    } finally {
        hideLoadingDialog();
    }
}

export function handleContactUsForm(e) {
    e.preventDefault();

    const name = DOMElements.contactUsName.value;
    const email = DOMElements.contactUsEmail.value;
    const subject = DOMElements.contactUsSubject.value;
    const message = DOMElements.contactUsMessage.value;

    const mailtoLink = `mailto:contact@keid.co.zw?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
        `Name: ${name}\nEmail: ${email}\n\nMessage: ${message}`
    )}`;

    window.location.href = mailtoLink;

    DOMElements.contactUsForm.reset();
}
