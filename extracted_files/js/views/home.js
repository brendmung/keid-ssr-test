// js/views/home.js
import {
    currentUser,
    currentActiveRenderId,
    categories, // <--- This is the object containing the categories array
    locations,
    setCachedCombinedListings,
    cachedCombinedListings,
    CACHE_DURATION,
} from '../state.js';
import DOMElements, { initializeDOMElements } from '../dom.js';
import { listingAPI, userAPI } from '../api.js';
import {
    showMessage,
    createSkeletonCards,
    sortListings,
} from '../utils.js';
import { createListingCard, createUserCard, addListingCardEventListeners } from '../listing-cards.js';
import { openListingCreator } from '../listing-management.js';
import { openModal } from '../modals.js';
import { getSelectedLocation } from '../locations-categories.js';
import { renderView, tempListingCache, updatePageTitle } from './core.js'; // Import from core

// Helper function to check if cache is fresh
function isCacheFresh(timestamp) {
    return (Date.now() - timestamp) < CACHE_DURATION;
}

// NEW: Helper function to get category data by ID from the new array structure
function getCategoryDataById(categoryId) {
    if (!categories || !categories.categories || !categoryId) return null;
    return categories.categories.find(cat => cat.id === categoryId);
}

// NEW: Hero Slider Logic
let currentSlideIndex = 0;
let heroSliderInterval;
const SLIDE_INTERVAL_TIME = 5000; // 5 seconds

function showHeroSlide(index) {
    const slides = document.querySelectorAll('.hero-slide');

    if (slides.length === 0) return;

    // Ensure index is within bounds
    if (index >= slides.length) {
        currentSlideIndex = 0;
    } else if (index < 0) {
        currentSlideIndex = slides.length - 1;
    } else {
        currentSlideIndex = index;
    }

    slides.forEach((slide, i) => {
        if (i === currentSlideIndex) {
            slide.classList.add('active');
        } else {
            slide.classList.remove('active');
        }
    });
}

function startHeroSlider() {
    clearInterval(heroSliderInterval); // Clear any existing interval
    heroSliderInterval = setInterval(() => {
        showHeroSlide(currentSlideIndex + 1);
    }, SLIDE_INTERVAL_TIME);
}

function initializeHeroSlider() {
    const heroSliderContainer = document.querySelector('.hero-slider');
    const slides = document.querySelectorAll('.hero-slide');

    if (!heroSliderContainer || slides.length === 0) {
        // If elements aren't found (e.g., not on home page or skeleton not rendered yet), do nothing.
        return;
    }

    showHeroSlide(currentSlideIndex); // Show initial slide
    startHeroSlider(); // Start auto-play
}


export async function renderHome(renderId) {
    if (renderId !== currentActiveRenderId) return;

    updatePageTitle('Keid List - Local Marketplace'); // Ensure title is set
    DOMElements.searchInput.placeholder = 'What are you looking for?';
    DOMElements.searchInput.setAttribute('data-search-type', 'all');

    const selectedLocation = getSelectedLocation();

    const renderContent = (data) => {
        if (renderId !== currentActiveRenderId) return;

        const {
            featuredListings,
            recentlyAddedListings,
            topListers,
            trendingCategoriesData
        } = data;

        tempListingCache.clear();
        [...featuredListings, ...recentlyAddedListings, ...trendingCategoriesData.flatMap(c => c.listings)].forEach(listing => {
            tempListingCache.set(listing._id, listing);
        });

        const noListingsMessage = (sectionName) => `
        <div class="error-container" style="background-color: transparent; box-shadow: none;">
        <div class="not-found-content">
        <i class="fas fa-box-open not-found-icon"></i>
        <h2 class="not-found-title">No ${sectionName} Yet</h2>
        <p class="not-found-message">There are currently no ${sectionName.toLowerCase()} available in the selected location.</p>
        </div>
        </div>
        `;

        // After the skeleton is rendered, initialize the slider
        initializeHeroSlider(); // CALL THE SLIDER INITIALIZATION HERE

        const recentlyAddedSection = DOMElements.mainContent.querySelector('#recently-added-section .horizontal-scroll-container');
        if (recentlyAddedSection) {
            recentlyAddedSection.innerHTML = recentlyAddedListings && recentlyAddedListings.length > 0 ?
            recentlyAddedListings.map(listing => createListingCard(listing)).join('') :
            noListingsMessage('Recently Added Listings');
        }

        const featuredListingsSection = DOMElements.mainContent.querySelector('#popular-listings-section .listings-grid');
        if (featuredListingsSection) {
            featuredListingsSection.innerHTML = featuredListings && featuredListings.length > 0 ?
            featuredListings.map(listing => createListingCard(listing)).join('') :
            noListingsMessage('Popular Listings');
        }

        const viewAllFeaturedBtn = document.querySelector('.view-all-popular-btn');
        if (viewAllFeaturedBtn) {
            viewAllFeaturedBtn.addEventListener('click', () => {
                renderView('browse-listings');
            });
        }

        const topListersSection = DOMElements.mainContent.querySelector('#top-listers-section .horizontal-scroll-container');
        if (topListersSection) {
            topListersSection.innerHTML = topListers && topListers.length > 0 ?
            topListers.map(user => createUserCard(user)).join('') :
            noListingsMessage('Top Sellers & Service Providers');
        }

        const categorySpotlightContainer = DOMElements.mainContent.querySelector('#category-spotlight-container');
        if (categorySpotlightContainer) {
            categorySpotlightContainer.innerHTML = '';
            if (trendingCategoriesData && trendingCategoriesData.length > 0) {
                trendingCategoriesData.forEach(catData => {
                    if (catData.listings.length > 0) {
                        // FIX: Use the helper function to get category data
                        const category = getCategoryDataById(catData.categoryId);
                        const categoryName = category?.name || 'Category';
                        const categoryDescription = category?.description || '';
                        
                        const categorySectionHtml = `
                        <div class="section category-spotlight-section">
                        <h2 class="section-title">Explore ${categoryName}</h2>
                        <p class="section-subtitle">${categoryDescription}</p>
                        <div class="listings-grid">
                        ${catData.listings.map(listing => createListingCard(listing)).join('')}
                        </div>
                        <div style="text-align: center; margin-top: 20px; margin-bottom: 30px;">
                        <button class="btn-primary view-all-category-btn" data-category-id="${catData.categoryId}">View All ${categoryName}</button>
                        </div>
                        </div>
                        `;
                        categorySpotlightContainer.insertAdjacentHTML('beforeend', categorySectionHtml);
                    }
                });
            }
        }

        // Attach event listeners to all hero-browse-btn elements
        document.querySelectorAll('.hero-browse-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                renderView('browse-listings');
            });
        });

        // Attach event listeners to all hero-add-listing-btn or hero-signup-btn elements
        if (currentUser) {
            document.querySelectorAll('.hero-add-listing-btn').forEach(btn => {
                btn.addEventListener('click', openListingCreator);
            });
            document.getElementById('cta-add-listing-btn')?.addEventListener('click', openListingCreator);
        } else {
            document.querySelectorAll('.hero-signup-btn').forEach(btn => {
                btn.addEventListener('click', () => openModal(DOMElements.signupModal));
            });
            document.getElementById('cta-add-listing-btn')?.addEventListener('click', () => openModal(DOMElements.signupModal));
        }

        // FIX: Iterate over the array of categories for event listeners
        if (categories && categories.categories) {
            categories.categories.forEach(category => {
                document.getElementById(`category-${category.id}`)?.addEventListener('click', () => {
                    renderView('category', { category: category.id });
                });
            });
        }

        document.querySelectorAll('.view-all-category-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const categoryId = e.target.dataset.categoryId;
                renderView('category', { category: categoryId });
            });
        });

        addListingCardEventListeners();
    };

    // FIX: Access categories via categories.categories array
    const categoryCardsHtml = (categories && categories.categories) ? categories.categories.map(category => `
        <div class="category-card" id="category-${category.id}">
        <div style="height: 150px; background-image: url('${category.image}'); background-size: cover;"></div>
        <h3>${category.name}</h3>
        <p>${category.description}</p>
        </div>
    `).join('') : '';

    const skeletonHtml = `
    <!-- Hero Section -->
    <div class="hero">
    <div class="hero-slider">
    <div class="hero-slide active" style="background-image: url('https://picsum.photos/1200/500?random=1');">
    <div class="hero-content">
    <h1>Find Local Products & Services</h1>
    <p>Connect with trusted local businesses and service providers in your area.</p>
    <div class="hero-buttons">
    <button class="btn-primary hero-browse-btn">Browse Listings</button>
    ${currentUser ? `<button class="btn-success hero-add-listing-btn">Add Your Listing</button>` : `<button class="btn-success hero-signup-btn">Join Now</button>`}
    </div>
    </div>
    </div>
    <div class="hero-slide" style="background-image: url('https://picsum.photos/1200/500?random=2');">
    <div class="hero-content">
    <h1>Discover Unique Local Gems</h1>
    <p>Support your community by exploring products and services nearby.</p>
    <div class="hero-buttons">
    <button class="btn-primary hero-browse-btn">Explore Now</button>
    ${currentUser ? `<button class="btn-success hero-add-listing-btn">List Your Item</button>` : `<button class="btn-success hero-signup-btn">Get Started</button>`}
    </div>
    </div>
    </div>
    <div class="hero-slide" style="background-image: url('https://picsum.photos/1200/500?random=3');">
    <div class="hero-content">
    <h1>Your Local Marketplace</h1>
    <p>Buy, sell, and connect with people right in your neighborhood.</p>
    <div class="hero-buttons">
    <button class="btn-primary hero-browse-btn">Find Deals</button>
    ${currentUser ? `<button class="btn-success hero-add-listing-btn">Post an Ad</button>` : `<button class="btn-success hero-signup-btn">Sign Up Today</button>`}
    </div>
    </div>
    </div>
    </div>
    <!-- Removed <div class="hero-dots"></div> -->
    </div>

    <!-- Category Section -->
    <div class="category-section">
    <h2 class="section-title">Browse Categories</h2>
    <div class="category-scroll">
    ${categoryCardsHtml}
    </div>

        <!-- Recently Added Listings -->
        <div class="section" id="recently-added-section">
        <h2 class="section-title">Recently Added</h2>
        <div class="horizontal-scroll-container listings-grid-scroll">
        ${createSkeletonCards()}
        ${createSkeletonCards()}
        </div>
        </div>

        <!-- Popular Listings -->
        <div class="section" id="popular-listings-section">
        <h2 class="section-title">Popular Listings</h2>
        <div class="listings-grid">
        ${createSkeletonCards()}
        </div>
        <div style="text-align: center; margin-top: 20px; margin-bottom: 30px;">
        <button class="btn-primary view-all-popular-btn">View All Popular Listings</button>
        </div>
        </div>

        <!-- Top Sellers & Service Providers -->
        <div class="section" id="top-listers-section">
        <h2 class="section-title">Top Sellers & Service Providers</h2>
        <div class="horizontal-scroll-container user-cards-scroll">
        ${Array(5).fill(0).map(() => `
            <div class="user-card skeleton-card">
            <div class="user-card-avatar skeleton-image" style="width: 80px; height: 80px; border-radius: 50%;"></div>
            <div class="user-card-name skeleton-title" style="width: 80%; height: 20px;"></div>
            <div class="user-card-stats skeleton-meta" style="width: 60%; height: 12px;"></div>
            <div class="skeleton-button" style="width: 100%; height: 30px;"></div>
            </div>
            `).join('')}
            </div>

            <!-- Trending Category Container -->
            <div id="category-spotlight-container">
            </div>

            <!-- Call to Action -->
            <div class="call-to-action" >
            <h2 style="margin-bottom: 20px; font-size: 18px;">Have Something to Offer?</h2>
            <p>List your products or services on Keid and connect with customers in your area.</p>
            <button class="btn-success" style="padding: 12px 24px;" id="cta-add-listing-btn">${currentUser ? 'Add Your Listing' : 'Sign Up to Get Started'}</button>
            </div>
            `;

            if (renderId !== currentActiveRenderId) return;
            DOMElements.mainContent.innerHTML = skeletonHtml;
    initializeDOMElements(); // Re-initialize DOM elements after content update
    initializeHeroSlider(); // Initialize the slider after skeleton is in place

    let dataToRender = {
        featuredListings: [],
        recentlyAddedListings: [],
        topListers: [],
        trendingCategoriesData: []
    };
    let useCached = false;

    if (isCacheFresh(cachedCombinedListings.timestamp) && cachedCombinedListings.data) {
        if (cachedCombinedListings.data.featuredListings && cachedCombinedListings.data.recentlyAddedListings && cachedCombinedListings.data.products && cachedCombinedListings.data.services) {
            dataToRender = cachedCombinedListings.data;
            useCached = true;
            renderContent(dataToRender);
        } else {
            console.warn("Cached combined listings data is outdated or malformed, skipping initial render with cache.");
        }
    }

    try {
        const allListings = await listingAPI.getAllListings(null, null, selectedLocation);
        if (renderId !== currentActiveRenderId) return;

        let filteredListings = allListings;
        if (selectedLocation === 'all') {
            filteredListings = filteredListings.filter(item =>
            locations.cities.some(city => city.id === item.location) ||
            locations.campuses.some(campus => campus.id === item.location)
            );
        }

        const products = filteredListings.filter(l => l.type === 'product');
        const services = filteredListings.filter(l => l.type === 'service');

        const recentlyAddedListings = sortListings(filteredListings, 'latest').slice(0, 6);
        const featuredListings = sortListings(filteredListings, 'recommended').slice(0, 8);

        // --- START EFFICIENT TOP LISTERS FETCH AND CLIENT-SIDE RE-SORT ---
        const userParams = {
            sortBy: 'likesReceived', // Use primary criterion for initial backend sort
            sortOrder: 'desc',
            limit: 10, // Fetch a larger pool to ensure the final top 5 are accurate after re-sort
        };

        // FIX: Only add the 'location' parameter if it's not 'all'
        if (selectedLocation !== 'all') {
            userParams.location = selectedLocation;
        }

        const topListerProfiles = await userAPI.getUsers(userParams);
        // --- END EFFICIENT TOP LISTERS FETCH AND CLIENT-SIDE RE-SORT ---

        // 2. Apply the original three-tiered client-side sorting logic to the pool.
        const topListers = topListerProfiles
        .filter(user => user !== null)
        .sort((a, b) => {
            // Primary Criterion: Likes Received (descending)
            const likesReceivedA = a.likesReceived || 0;
            const likesReceivedB = b.likesReceived || 0;
            if (likesReceivedA !== likesReceivedB) { return likesReceivedB - likesReceivedA; }

            // Secondary Criterion: Follower Count (descending)
            const followerCountA = a.followersCount || 0; // Note: using 'followersCount' from API response
            const followerCountB = b.followersCount || 0;
            if (followerCountA !== followerCountB) { return followerCountB - followerCountA; }

            // Tertiary Criterion: Total Listings (descending)
            const totalListingsA = a.totalListings || 0;
            const totalListingsB = b.totalListings || 0;
            return totalListingsB - totalListingsA;
        })
        .slice(0, 5); // 3. Slice the result to the final top 5.

        // FIX: Access the categories array correctly
        const allCategoryIds = categories.categories ? categories.categories.map(c => c.id) : [];
        
        const randomCategoryIds = [];
        // FIX: Check if there are categories available before trying to select random ones
        let availableCategoryIds = [...allCategoryIds];
        while (randomCategoryIds.length < 2 && availableCategoryIds.length > 0) {
            const randomIndex = Math.floor(Math.random() * availableCategoryIds.length);
            const categoryId = availableCategoryIds.splice(randomIndex, 1)[0];
            randomCategoryIds.push(categoryId);
        }

        const trendingCategoriesData = randomCategoryIds.map(categoryId => {
            const categoryListings = filteredListings.filter(listing => listing.category === categoryId);
            const sortedCategoryListings = sortListings(categoryListings, 'recommended').slice(0, 4);
            return { categoryId, listings: sortedCategoryListings };
        });

        const latestData = {
            products: products,
            services: services,
            featuredListings,
            recentlyAddedListings,
            topListers,
            trendingCategoriesData
        };

        setCachedCombinedListings(latestData);

        if (!useCached || JSON.stringify(dataToRender) !== JSON.stringify(latestData)) {
            renderContent(latestData);
        }

    } catch (error) {
        if (renderId !== currentActiveRenderId) return;
        console.error('Error rendering home:', error);
        showMessage(error.message || 'Error loading home page', 'error');

        const loadingSections = DOMElements.mainContent.querySelectorAll('.listings-grid, .horizontal-scroll-container');
        loadingSections.forEach(section => {
            section.innerHTML = `
            <div class="error-container" style="height: fit-content;">
            <div class="not-found-content">
            <p class="not-found-message">Failed to load content.</p>
            </div>
            <button class="btn-primary retry-home-btn">Try Again</button>
            </div>
            `;
        });
        document.querySelectorAll('.retry-home-btn').forEach(btn => {
            btn.addEventListener('click', () => renderView('home'));
        });
        initializeDOMElements();
    }
}
