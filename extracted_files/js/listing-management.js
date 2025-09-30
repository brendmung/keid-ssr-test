// js/listing-management.js
import { currentUser, uploadedImages, setUploadedImages, addUploadedImage, setCachedUserListings, setCachedUserFavorites, cachedUserProfile, setCachedListingDetails } from './state.js';
import { showMessage, showLoadingDialog, hideLoadingDialog, compressImage, renderImagePreviews, renderEditListingImagePreviews } from './utils.js';
import { listingAPI } from './api.js';
import { getLocationName } from './locations-categories.js';
import { closeModal, openModal } from './modals.js';
import DOMElements from './dom.js';
import { IMGBB_API_KEY } from './config.js';
import { renderView } from './views/core.js'; // Updated import path for renderView
import { switchTab } from './views/dashboard.js'; // Assuming switchTab is in dashboard.js now


async function handleAddListing(e) {
    e.preventDefault();

    if (!currentUser) {
        showMessage('Please login to add a listing', 'error');
        return;
    }

    const phone = currentUser.phone || '';
    const whatsapp = currentUser.whatsapp || '';
    const location = currentUser.location || '';

    if ((phone.length < 5 && whatsapp.length < 5) || !location || (phone === '' && whatsapp === '') || location === 'Not specified') {
        showMessage('Please set up your profile first. Make sure phone/whatsapp and location are set.', 'error');
        return;
    }

    const type = DOMElements.listingType.value;
    const title = DOMElements.listingTitle.value;
    const price = parseFloat(DOMElements.listingPrice.value);
    const listingLocation = DOMElements.listingLocationId.value;

    if (!listingLocation) {
        showMessage('Please select a location', 'error');
        return;
    }

    const category = DOMElements.listingCategory.value;
    const description = DOMElements.listingDescription.value;

    if (uploadedImages.length === 0) {
        showMessage('Please upload at least one image', 'error');
        return;
    }

    showLoadingDialog();
    try {
        const uploadedImageUrls = [];
        for (const image of uploadedImages) {
            const formData = new FormData();
            const blob = await fetch(image).then(r => r.blob());
            formData.append('image', blob);

            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (result.success) {
                uploadedImageUrls.push(result.data.url);
            } else {
                throw new Error(result.error?.message || 'Failed to upload image to ImgBB');
            }
        }

        const newListingData = {
            type,
            title,
            price,
            description,
            location: listingLocation,
            category,
            images: uploadedImageUrls,
            userId: currentUser._id
        };

        const newListing = await listingAPI.createListing(newListingData);

        setCachedUserListings(null);
        setCachedUserFavorites(null);
        if (currentUser && currentUser.slug) {
            cachedUserProfile[currentUser.slug] = { data: null, timestamp: 0 };
        }

        setUploadedImages([]);
        DOMElements.addListingForm.reset();
        DOMElements.listingImagePreview.innerHTML = '';
        closeModal(DOMElements.addListingModal);

        showMessage('Listing added successfully', 'success');

        renderView('dashboard');
        switchTab('listings-content');
    } catch (error) {
        console.error('Error adding listing:', error);
        showMessage(error.message || 'Error adding listing', 'error');
    } finally {
        hideLoadingDialog();
    }
}

function openListingCreator() {
    if (!currentUser) {
        showMessage('Please login to add a listing', 'error');
        return;
    }

    const phone = currentUser.phone || '';
    const whatsapp = currentUser.whatsapp || '';
    const location = currentUser.location || '';

    if ((phone.length < 5 && whatsapp.length < 5) || !location || (phone === '' && whatsapp === '') || location === 'Not specified') {
        showMessage('Please set up your profile first. Make sure phone/whatsapp and location are set.', 'error');
        return;
    }

    const locationName = getLocationName(location);
    DOMElements.listingLocationName.value = locationName;
    DOMElements.listingLocationId.value = location;

    setUploadedImages([]);
    DOMElements.listingImagePreview.innerHTML = '';

    openModal(DOMElements.addListingModal);
}

async function openEditListingModal(listingId) {
    showLoadingDialog();
    try {
        const editListingModal = DOMElements.editListingModal;
        const editListingForm = DOMElements.editListingForm;

        const listing = await listingAPI.getListing(listingId);

        if (!listing) {
            showMessage('Listing not found', 'error');
            return;
        }

        const locationName = getLocationName(listing.location);

        DOMElements.editListingType.value = listing.type;
        DOMElements.editListingTitle.value = listing.title;
        DOMElements.editListingPrice.value = listing.price;
        DOMElements.editListingLocationName.value = locationName;
        DOMElements.editListingLocationId.value = listing.location;
        DOMElements.editListingCategory.value = listing.category;
        DOMElements.editListingDescription.value = listing.description;

        let currentEditImages = [...listing.images];

        renderEditListingImagePreviews(currentEditImages);

        DOMElements.editImageUpload.onclick = () => {
            DOMElements.editImageInput.click();
        };

        DOMElements.editImageInput.onchange = async (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;

            if (currentEditImages.length + files.length > 5) {
                showMessage('You can upload a maximum of 5 images in total', 'error');
                e.target.value = '';
                return;
            }

            showLoadingDialog();
            try {
                for (const file of files) {
                    if (file.type.startsWith('image/')) {
                        const compressedBlob = await compressImage(file);
                        const imageUrl = await new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onload = (event) => resolve(event.target.result);
                            reader.readAsDataURL(compressedBlob);
                        });
                        currentEditImages.push(imageUrl);
                    }
                }
                renderEditListingImagePreviews(currentEditImages);
            } catch (error) {
                console.error('Error processing new images for edit:', error);
                showMessage(error.message || 'Error processing new images for edit', 'error');
            } finally {
                hideLoadingDialog();
                e.target.value = '';
            }
        };

        editListingForm.onsubmit = async (e) => {
            e.preventDefault();
            showLoadingDialog();

            try {
                const uploadedImageUrls = [];
                for (const image of currentEditImages) {
                    if (image.startsWith('data:')) {
                        const formData = new FormData();
                        const blob = await fetch(image).then(r => r.blob());
                        formData.append('image', blob);

                        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                            method: 'POST',
                            body: formData
                        });

                        const result = await response.json();
                        if (result.success) {
                            uploadedImageUrls.push(result.data.url);
                        } else {
                            throw new Error(result.error?.message || 'Failed to upload image to ImgBB');
                        }
                    } else {
                        uploadedImageUrls.push(image);
                    }
                }

                const updatedListingData = {
                    type: DOMElements.editListingType.value,
                    title: DOMElements.editListingTitle.value,
                    price: parseFloat(DOMElements.editListingPrice.value),
                    location: DOMElements.editListingLocationId.value,
                    category: DOMElements.editListingCategory.value,
                    description: DOMElements.editListingDescription.value,
                    images: uploadedImageUrls
                };

                if (!updatedListingData.location) {
                    showMessage('Please select a location', 'error');
                    return;
                }

                await listingAPI.updateListing(listing._id, updatedListingData);

                setCachedUserListings(null);
                setCachedUserFavorites(null);
                if (currentUser && currentUser.slug) {
                    cachedUserProfile[currentUser.slug] = { data: null, timestamp: 0 };
                }
                setCachedListingDetails(listing.slug, null);
                setCachedListingDetails(listing._id, null);

                showMessage('Listing updated successfully!', 'success');
                closeModal(editListingModal);

                const currentViewName = DOMElements.mainContent.dataset.currentView;
                const currentListingIdOnPage = DOMElements.mainContent.dataset.currentListingId;

                if (currentViewName === 'listing-detail' && currentListingIdOnPage === listing._id) {
                    renderView('listing-detail', listing.slug);
                } else if (currentViewName === 'dashboard') {
                    renderView('dashboard');
                } else {
                    renderView('dashboard');
                }
            } catch (error) {
                console.error('Error updating listing:', error);
                showMessage(error.message || 'Error updating listing', 'error');
            } finally {
                hideLoadingDialog();
            }
        };

        openModal(editListingModal);
    } catch (error) {
        console.error('Error opening edit listing modal:', error);
        showMessage(error.message || 'Error loading listing data', 'error');
    } finally {
        hideLoadingDialog();
    }
}

async function handleDeleteListing(listingId) {
    if (!currentUser) {
        showMessage('Please login to delete a listing', 'error');
        return;
    }

    showLoadingDialog();
    try {
        const listingToDelete = await listingAPI.getListing(listingId);
        if (!listingToDelete) {
            throw new Error("Listing not found for deletion.");
        }

        await listingAPI.deleteListing(listingId);

        setCachedUserListings(null);
        setCachedUserFavorites(null);
        if (currentUser && currentUser.slug) {
            cachedUserProfile[currentUser.slug] = { data: null, timestamp: 0 };
        }
        setCachedListingDetails(listingToDelete.slug, null);
        setCachedListingDetails(listingToDelete._id, null);

        showMessage('Listing removed', 'success');
        renderView('dashboard');
    } catch (error) {
        console.error('Error deleting listing:', error);
        showMessage(error.message || 'Error deleting listing', 'error');
    } finally {
        hideLoadingDialog();
    }
}

export { handleAddListing, openListingCreator, openEditListingModal, handleDeleteListing };
