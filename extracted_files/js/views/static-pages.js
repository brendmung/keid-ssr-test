// js/views/static-pages.js
import { currentActiveRenderId } from '../state.js';
import DOMElements, { initializeDOMElements } from '../dom.js';
import { openModal } from '../modals.js';
import { handleContactUsForm } from '../contact.js'; // From new contact module
import { updatePageTitle } from './core.js'; // Import from core


export function renderAbout(renderId) {
    if (renderId !== currentActiveRenderId) return;

    updatePageTitle('About Us - Keid'); // Ensure title is set

    const html = `
    <div class="about-container">
    <h2 class="section-title">About Us</h2>
    <div class="about-content">
    <p>Keid is your go-to platform for discovering and connecting with local sellers, service providers, and businesses. Our goal is simple: make it easy for people to find what they need, when they need it, while keeping the process straightforward and transparent.</p>

    <p>On Keid, you can explore a variety of listings - from electronics and fashion to services and everyday essentials. Everything happens directly between users, so you can contact sellers or service providers directly to ask questions, negotiate, or arrange pickup.</p>

    <p>We take pride in keeping Keid a safe and reliable space for everyone. Our team works behind the scenes to ensure listings are clear, accurate, and free from spam or prohibited items. Whether you’re posting an item, searching for a service, or just browsing, we strive to make your experience smooth and trustworthy.</p>
    <p>By using Keid, you agree to follow our <span id="open-terms-link" class="modal-link">Terms of Service</span> and acknowledge our <span id="open-privacy-link" class="modal-link">Privacy Policy</span>. These documents outline the rules of the platform, how your information is handled, and tips for staying safe while interacting with other users.</p>
    <p>Our small but dedicated team is committed to improving Keid every day. We’re constantly working to add features, enhance user experience, and ensure the platform remains a valuable resource for our community. If you have any questions, suggestions, or need support, don’t hesitate to reach out - we’re here to help.</p>
    </div>
    </div>
    `;

    if (renderId !== currentActiveRenderId) return;
    DOMElements.mainContent.innerHTML = html;
    initializeDOMElements();

    document.getElementById('open-terms-link')?.addEventListener('click', () => {
        openModal(DOMElements.termsModal);
    });

    document.getElementById('open-privacy-link')?.addEventListener('click', () => {
        openModal(DOMElements.privacyModal);
    });
}

export function renderContact(renderId) {
    if (renderId !== currentActiveRenderId) return;

    updatePageTitle('Contact Us - Keid'); // Ensure title is set

    const html = `
    <div class="contact-container">
    <h2 class="section-title">Contact Us</h2>
    <p class="contact-subtitle">If you have any questions or need assistance, please feel free to reach out to us.</p>
    <div class="contact-us-container">
    <form id="contact-us-form">
    <div class="form-group">
    <label for="contact-us-name">Name</label>
    <input type="text" maxlength="50" id="contact-us-name" required>
    </div>
    <div class="form-group">
    <label for="contact-us-email">Email</label>
    <input type="email" maxlength="50" id="contact-us-email" required>
    </div>
    <div class="form-group">
    <label for="contact-us-subject">Subject</label>
    <input type="text" id="contact-us-subject" required>
    </div>
    <div class="form-group">
    <label for="contact-us-message">Message</label>
    <textarea id="contact-us-message" rows="5" required></textarea>
    </div>
    <button type="submit" class="btn-primary">
    <i class="fas fa-paper-plane"></i> Send Message
    </button>
    </form>
    </div>
    </div>
    `;

    if (renderId !== currentActiveRenderId) return;
    DOMElements.mainContent.innerHTML = html;
    initializeDOMElements();

    document.getElementById('contact-us-form')?.addEventListener('submit', handleContactUsForm);
}
