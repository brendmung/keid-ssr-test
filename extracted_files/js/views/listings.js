 // js/views/listings.js
import {
    currentActiveRenderId,
    currentSortBy,
    setCurrentSortBy,
    categories,
    locations,
    setCachedProducts,
    cachedProducts,
    setCachedServices,
    cachedServices,
    setCachedCombinedListings,
    cachedCombinedListings,
    CACHE_DURATION,
} from '../state.js';
import DOMElements, { initializeDOMElements } from '../dom.js';
import { listingAPI } from '../api.js';
import {
    showMessage,
    createSkeletonCards,
    sortListings,
} from '../utils.js';
import { createListingCard, addListingCardEventListeners } from '../listing-cards.js';
import { getSelectedLocation, getLocationName } from '../locations-categories.js';
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

export async function renderCategory(params, renderId) {
    if (renderId !== currentActiveRenderId) return;

    const { category: categoryId } = params; // Renamed for clarity: categoryId is the ID
    const selectedLocation = getSelectedLocation();

    // FIX: Get category data using the new structure
    const categoryData = getCategoryDataById(categoryId);
    const categoryName = categoryData?.name || 'Category';

    updatePageTitle(`${categoryName} - Keid`); // Set title

    const renderContent = (sortedListings) => {
        if (renderId !== currentActiveRenderId) return;

        tempListingCache.clear();
        sortedListings.forEach(listing => tempListingCache.set(listing._id, listing));

        const noListingsMessage = `
        <div class="error-container">
        <div class="not-found-content">
        <i class="fas fa-exclamation-triangle not-found-icon"></i>
        <h2 class="not-found-title">No Listings Found</h2>
        <p class="not-found-message">There are currently no listings available in this category or location.</p>
        </div>
        </div>
        `;
        const listingsGrid = DOMElements.mainContent.querySelector('.listings-grid');
        listingsGrid.innerHTML = sortedListings && sortedListings.length > 0 ?
        sortedListings.map(listing => createListingCard(listing)).join('') :
        noListingsMessage;
        addListingCardEventListeners();
    };

    const skeletonHtml = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
    <div>
    <h2 class="section-title">${categoryName}</h2>
    <p class="section-subtitle">Browse ${categoryName} products and services</p>
    </div>
    <div>
    <select id="sort-by" class="sort-dropdown">
    <option value="recommended" ${currentSortBy === 'recommended' ? 'selected' : ''}>Sort by: Recommended</option>
    <option value="latest" ${currentSortBy === 'latest' ? 'selected' : ''}>Sort by: Latest</option>
    <option value="name" ${currentSortBy === 'name' ? 'selected' : ''}>Sort by: Name</option>
    <option value="price-low-to-high" ${currentSortBy === 'price-low-to-high' ? 'selected' : ''}>Sort by: Lowest Price</option>
    <option value="price-high-to-low" ${currentSortBy === 'price-high-to-low' ? 'selected' : ''}>Sort by: Highest Price</option>
    </select>
    </div>
    </div>
    <div class="listings-grid">
    ${createSkeletonCards()}
    </div>
    `;

    if (renderId !== currentActiveRenderId) return;
    DOMElements.mainContent.innerHTML = skeletonHtml;
    initializeDOMElements();

    document.getElementById('sort-by')?.addEventListener('change', (e) => {
        setCurrentSortBy(e.target.value);
        renderCategory(params, renderId);
    });

    let listings = [];
    let useCached = false;
    let sortedListings = [];

    if (isCacheFresh(cachedCombinedListings.timestamp) && cachedCombinedListings.data) {
        const allCachedListings = [...(cachedCombinedListings.data.products || []), ...(cachedCombinedListings.data.services || [])];
        listings = allCachedListings.filter(item => item.category === categoryId);
        if (selectedLocation === 'all') {
            listings = listings.filter(item => locations.cities.some(city => city.id === item.location));
        } else if (selectedLocation) {
            listings = listings.filter(item => item.location === selectedLocation);
        }
        sortedListings = sortListings(listings, currentSortBy);
        useCached = true;
        renderContent(sortedListings);
    }

    try {
        const latestListings = await listingAPI.getAllListings(null, categoryId);

        if (renderId !== currentActiveRenderId) return;

        let filteredListings = latestListings;

        if (selectedLocation === 'all') {
            filteredListings = filteredListings.filter(item => locations.cities.some(city => city.id === item.location));
        } else if (selectedLocation) {
            filteredListings = filteredListings.filter(item => item.location === selectedLocation);
        }

        const sortedLatestListings = sortListings(filteredListings, currentSortBy);

        setCachedCombinedListings({ products: filteredListings.filter(l => l.type === 'product'), services: filteredListings.filter(l => l.type === 'service') });

        if (!useCached || JSON.stringify(sortedListings) !== JSON.stringify(sortedLatestListings)) {
            renderContent(sortedLatestListings);
        }

    } catch (error) {
        if (renderId !== currentActiveRenderId) return;
        console.error('Error rendering category:', error);
        showMessage(error.message || 'Error loading category page', 'error');

        const listingsGrid = DOMElements.mainContent.querySelector('.listings-grid');
        listingsGrid.innerHTML = `
        <div class="error-container">
        <div class="not-found-content">
        <i class="fas fa-exclamation-triangle not-found-icon"></i>
        <p class="not-found-message">Failed to load category.</p>
        </div>
        <button class="btn-primary retry-category-btn" data-category="${categoryId}">Try Again</button>
        </div>`;
        document.querySelector('.retry-category-btn')?.addEventListener('click', (e) => {
            renderView('category', { category: e.target.dataset.category });
        });
        initializeDOMElements();
    }
}

export async function renderProducts(params, renderId) {
// ... (rest of renderProducts remains the same)
    if (renderId !== currentActiveRenderId) return;

    updatePageTitle('Products - Keid'); // Ensure title is set
    const selectedLocation = getSelectedLocation();
    DOMElements.searchInput.placeholder = 'Search products...';
    DOMElements.searchInput.setAttribute('data-search-type', 'products');

    const renderContent = (sortedProducts) => {
        if (renderId !== currentActiveRenderId) return;

        tempListingCache.clear();
        sortedProducts.forEach(listing => tempListingCache.set(listing._id, listing));

        const noProductsMessage = `
        <div class="error-container">
        <div class="not-found-content">
        <i class="fas fa-box-open not-found-icon"></i>
        <h2 class="not-found-title">No Products Found</h2>
        <p class="not-found-message">There are no products available in this category or location.</p>
        </div>
        </div>
        `;
        const listingsGrid = DOMElements.mainContent.querySelector('.listings-grid');
        listingsGrid.innerHTML = sortedProducts && sortedProducts.length > 0 ?
        sortedProducts.map(product => createListingCard(product)).join('') :
        noProductsMessage;
        addListingCardEventListeners();
    };

    const skeletonHtml = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
    <div>
    <h2 class="section-title">All Products</h2>
    <p class="section-subtitle">Browse all available products</p>
    </div>
    <div>
    <select id="sort-by" class="sort-dropdown">
    <option value="recommended" ${currentSortBy === 'recommended' ? 'selected' : ''}>Sort by: Recommended</option>
    <option value="latest" ${currentSortBy === 'latest' ? 'selected' : ''}>Sort by: Latest</option>
    <option value="name" ${currentSortBy === 'name' ? 'selected' : ''}>Sort by: Name</option>
    <option value="price-low-to-high" ${currentSortBy === 'price-low-to-high' ? 'selected' : ''}>Sort by: Lowest Price</option>
    <option value="price-high-to-low" ${currentSortBy === 'price-high-to-low' ? 'selected' : ''}>Sort by: Highest Price</option>
    </select>
    </div>
    </div>
    <div class="listings-grid">
    ${createSkeletonCards()}
    </div>
    `;

    if (renderId !== currentActiveRenderId) return;
    DOMElements.mainContent.innerHTML = skeletonHtml;
    initializeDOMElements();

    document.getElementById('sort-by')?.addEventListener('change', (e) => {
        setCurrentSortBy(e.target.value);
        renderProducts(params, renderId);
    });

    let products = [];
    let useCached = false;

    if (isCacheFresh(cachedProducts.timestamp) && cachedProducts.data) {
        products = cachedProducts.data;
        if (selectedLocation === 'all') {
            products = products.filter(product => locations.cities.some(city => city.id === product.location));
        } else if (selectedLocation) {
            products = products.filter(product => product.location === selectedLocation);
        }
        const sortedProducts = sortListings(products, currentSortBy);
        useCached = true;
        renderContent(sortedProducts);
    }

    try {
        let latestProducts = await listingAPI.getAllListings('product');

        if (renderId !== currentActiveRenderId) return;

        if (selectedLocation === 'all') {
            latestProducts = latestProducts.filter(product => locations.cities.some(city => city.id === product.location));
        } else if (selectedLocation) {
            latestProducts = latestProducts.filter(product => product.location === selectedLocation);
        }

        const sortedLatestProducts = sortListings(latestProducts, currentSortBy);

        setCachedProducts(latestProducts);

        if (!useCached || JSON.stringify(products) !== JSON.stringify(latestProducts)) {
            renderContent(sortedLatestProducts);
        }

    } catch (error) {
        if (renderId !== currentActiveRenderId) return;
        console.error('Error rendering products:', error);
        showMessage(error.message || 'Error loading products page', 'error');

        const listingsGrid = DOMElements.mainContent.querySelector('.listings-grid');
        listingsGrid.innerHTML = `
        <div class="error-container">
        <div class="not-found-content">
        <i class="fas fa-exclamation-triangle not-found-icon"></i>
        <p class="not-found-message">Failed to load products.</p>
        </div>
        <button class="btn-primary retry-products-btn">Try Again</button>
        </div>`;
        document.querySelector('.retry-products-btn')?.addEventListener('click', () => {
            renderView('products');
        });
        initializeDOMElements();
    }
}

export async function renderServices(params, renderId) {
// ... (rest of renderServices remains the same)
    if (renderId !== currentActiveRenderId) return;

    updatePageTitle('Services - Keid'); // Ensure title is set
    const selectedLocation = getSelectedLocation();
    DOMElements.searchInput.placeholder = 'Search services...';
    DOMElements.searchInput.setAttribute('data-search-type', 'services');

    const renderContent = (sortedServices) => {
        if (renderId !== currentActiveRenderId) return;

        tempListingCache.clear();
        sortedServices.forEach(listing => tempListingCache.set(listing._id, listing));

        const noServicesMessage = `
        <div class="error-container">
        <div class="not-found-content">
        <i class="fas fa-box-open not-found-icon"></i>
        <h2 class="not-found-title">No Services Found</h2>
        <p class="not-found-message">There are no services available in this category or location.</p>
        </div>
        </div>
        `;
        const listingsGrid = DOMElements.mainContent.querySelector('.listings-grid');
        listingsGrid.innerHTML = sortedServices && sortedServices.length > 0 ?
        sortedServices.map(service => createListingCard(service)).join('') :
        noServicesMessage;
        addListingCardEventListeners();
    };

    const skeletonHtml = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
    <div>
    <h2 class="section-title">All Services</h2>
    <p class="section-subtitle">Browse all available services</p>
    </div>
    <div>
    <select id="sort-by" class="sort-dropdown">
    <option value="recommended" ${currentSortBy === 'recommended' ? 'selected' : ''}>Sort by: Recommended</option>
    <option value="latest" ${currentSortBy === 'latest' ? 'selected' : ''}>Sort by: Latest</option>
    <option value="name" ${currentSortBy === 'name' ? 'selected' : ''}>Sort by: Name</option>
    <option value="price-low-to-high" ${currentSortBy === 'price-low-to-high' ? 'selected' : ''}>Sort by: Lowest Price</option>
    <option value="price-high-to-low" ${currentSortBy === 'price-high-to-low' ? 'selected' : ''}>Sort by: Highest Price</option>
    </select>
    </div>
    </div>
    <div class="listings-grid">
    ${createSkeletonCards()}
    </div>
    `;

    if (renderId !== currentActiveRenderId) return;
    DOMElements.mainContent.innerHTML = skeletonHtml;
    initializeDOMElements();

    document.getElementById('sort-by')?.addEventListener('change', (e) => {
        setCurrentSortBy(e.target.value);
        renderServices(params, renderId);
    });

    let services = [];
    let useCached = false;

    if (isCacheFresh(cachedServices.timestamp) && cachedServices.data) {
        services = cachedServices.data;
        if (selectedLocation === 'all') {
            services = services.filter(service => locations.cities.some(city => city.id === service.location));
        } else if (selectedLocation) {
            services = services.filter(service => service.location === selectedLocation);
        }
        const sortedServices = sortListings(services, currentSortBy);
        useCached = true;
        renderContent(sortedServices);
    }

    try {
        let latestServices = await listingAPI.getAllListings('service');

        if (renderId !== currentActiveRenderId) return;

        if (selectedLocation === 'all') {
            latestServices = latestServices.filter(service => locations.cities.some(city => city.id === service.location));
        } else if (selectedLocation) {
            latestServices = latestServices.filter(service => service.location === selectedLocation);
        }

        const sortedLatestServices = sortListings(latestServices, currentSortBy);

        setCachedServices(latestServices);

        if (!useCached || JSON.stringify(services) !== JSON.stringify(latestServices)) {
            renderContent(sortedLatestServices);
        }

    } catch (error) {
        if (renderId !== currentActiveRenderId) return;
        console.error('Error rendering services:', error);
        showMessage(error.message || 'Error loading services page', 'error');

        const listingsGrid = DOMElements.mainContent.querySelector('.listings-grid');
        listingsGrid.innerHTML = `
        <div class="error-container">
        <div class="not-found-content">
        <i class="fas fa-exclamation-triangle not-found-icon"></i>
        <p class="not-found-message">Failed to load services.</p>
        </div>
        <button class="btn-primary retry-services-btn">Try Again</button>
        </div>
        `;
        document.querySelector('.retry-services-btn')?.addEventListener('click', () => {
            renderView('services');
        });
        initializeDOMElements();
    }
}

export async function handleSearch(renderId) {
// ... (rest of handleSearch remains the same)
    if (renderId !== currentActiveRenderId) return;

    const query = DOMElements.searchInput.value.trim().toLowerCase();
    const category = DOMElements.categorySelect.value;
    let searchType = DOMElements.searchInput.getAttribute('data-search-type') || 'all';

    DOMElements.searchInput.setAttribute('data-search-type', searchType);

    const skeletonHtml = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
    <div>
    <h2 class="section-title">Search Results</h2>
    <p class="section-subtitle">Searching for "${query}" in ${searchType}</p>
    </div>
    <div>
    <select id="sort-by" class="sort-dropdown">
    <option value="recommended">Sort by: Recommended</option>
    <option value="latest">Sort by: Latest</option>
    <option value="name">Sort by: Name</option>
    <option value="price-low-to-high">Sort by: Lowest Price</option>
    <option value="price-high-to-low">Sort by: Highest Price</option>
    </select>
    </div>
    </div>
    <div class="listings-grid">
    ${createSkeletonCards()}
    </div>
    `;

    if (renderId !== currentActiveRenderId) return;
    DOMElements.mainContent.innerHTML = skeletonHtml;
    initializeDOMElements();

    try {
        let results = await listingAPI.search(query, category, getSelectedLocation());

        if (renderId !== currentActiveRenderId) return;
        renderSearchResults(results, query, category, renderId);
    } catch (error) {
        if (renderId !== currentActiveRenderId) return;
        showMessage(error.message || 'Error searching listings', 'error');
        const listingsGrid = DOMElements.mainContent.querySelector('.listings-grid');
        listingsGrid.innerHTML = `
        <div class="error-container">
        <div class="not-found-content">
        <i class="fas fa-exclamation-triangle not-found-icon"></i>
        <p class="not-found-message">Failed to load search results.</p>
        </div>
        <button class="btn-primary retry-search-btn">Try Again</button>
        </div>`
        document.querySelector('.retry-search-btn')?.addEventListener('click', () => {
            handleSearch();
        });
        initializeDOMElements();
    }
}

export function renderSearchResults(results, query, category, renderId) {
// ... (rest of renderSearchResults remains the same)
    if (renderId !== currentActiveRenderId) return;

    tempListingCache.clear();
    results.forEach(listing => tempListingCache.set(listing._id, listing));

    const selectedLocation = getSelectedLocation();

    const sortedResults = sortListings(results, currentSortBy);

    const noResultsMessage = `
    <div class="error-container">
    <div class="not-found-content">
    <i class="fas fa-search not-found-icon"></i>
    <h2 class="not-found-title">No Results Found</h2>
    <p class="not-found-message">We couldn't find any listings matching your search. Try refining your search or exploring other categories.</p>
    </div>
    </div>
    `;

    const html = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
    <div>
    <h2 class="section-title">Search Results</h2>
    <p class="section-subtitle">Showing results for "${query}"${selectedLocation && selectedLocation !== 'all' ? ` in ${getLocationName(selectedLocation)}` : ''}</p>
    </div>
    <div>
    <select id="sort-by" class="sort-dropdown">
    <option value="recommended" ${currentSortBy === 'recommended' ? 'selected' : ''}>Sort by: Recommended</option>
    <option value="latest" ${currentSortBy === 'latest' ? 'selected' : ''}>Sort by: Latest</option>
    <option value="name" ${currentSortBy === 'name' ? 'selected' : ''}>Sort by: Name</option>
    <option value="price-low-to-high" ${currentSortBy === 'price-low-to-high' ? 'selected' : ''}>Sort by: Lowest Price</option>
    <option value="price-high-to-low" ${currentSortBy === 'price-high-to-low' ? 'selected' : ''}>Sort by: Highest Price</option>
    </select>
    </div>
    </div>
    ${sortedResults && sortedResults.length > 0 ? `
        <div class="listings-grid">
        ${sortedResults.map(item => createListingCard(item)).join('')}
        </div>
        ` : noResultsMessage}
        `;

        if (renderId !== currentActiveRenderId) return;
        DOMElements.mainContent.innerHTML = html;
    initializeDOMElements();

    document.getElementById('sort-by')?.addEventListener('change', (e) => {
        setCurrentSortBy(e.target.value);
        const sortedResults = sortListings(results, currentSortBy);
        renderSearchResults(sortedResults, query, category, renderId);
    });

    addListingCardEventListeners();

    document.getElementById('browse-categories-btn')?.addEventListener('click', () => {
        renderView('home');
    });
}

export async function renderBrowseListings(renderId) {
// ... (rest of renderBrowseListings remains the same)
    if (renderId !== currentActiveRenderId) return;

    updatePageTitle('Browse - Keid'); // Ensure title is set
    const selectedLocation = getSelectedLocation();

    const renderContent = (sortedListings) => {
        if (renderId !== currentActiveRenderId) return;

        tempListingCache.clear();
        sortedListings.forEach(listing => tempListingCache.set(listing._id, listing));

        const noListingsMessage = `
        <div class="error-container">
        <div class="not-found-content">
        <i class="fas fa-box-open not-found-icon"></i>
        <h2 class="not-found-title">No Listings Found</h2>
        <p class="not-found-message">There are no listings available in this location.</p>
        </div>
        </div>
        `;
        let listingsGrid = DOMElements.mainContent.querySelector('.listings-grid');
        if (!listingsGrid) {
            const tempDiv = document.createElement('div');
            tempDiv.className = 'listings-grid';
            DOMElements.mainContent.appendChild(tempDiv);
            listingsGrid = tempDiv;
        }
        listingsGrid.innerHTML = sortedListings && sortedListings.length > 0 ?
        sortedListings.map(listing => createListingCard(listing)).join('') :
        noListingsMessage;
        addListingCardEventListeners();
    };

    const skeletonHtml = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
    <div>
    <h2 class="section-title">All Listings</h2>
    <p class="section-subtitle">Browse all available products and services</p>
    </div>
    <div>
    <select id="sort-by" class="sort-dropdown">
    <option value="recommended" ${currentSortBy === 'recommended' ? 'selected' : ''}>Sort by: Recommended</option>
    <option value="latest" ${currentSortBy === 'latest' ? 'selected' : ''}>Sort by: Latest</option>
    <option value="name" ${currentSortBy === 'name' ? 'selected' : ''}>Sort by: Name</option>
    <option value="price-low-to-high" ${currentSortBy === 'price-low-to-high' ? 'selected' : ''}>Sort by: Lowest Price</option>
    <option value="price-high-to-low" ${currentSortBy === 'price-high-to-low' ? 'selected' : ''}>Sort by: Highest Price</option>
    </select>
    </div>
    </div>
    <div class="listings-grid">
    ${createSkeletonCards()}
    </div>
    `;

    if (renderId !== currentActiveRenderId) return;
    DOMElements.mainContent.innerHTML = skeletonHtml;
    initializeDOMElements();

    document.getElementById('sort-by')?.addEventListener('change', (e) => {
        setCurrentSortBy(e.target.value);
        renderBrowseListings(renderId);
    });

    let combinedListings = [];
    let useCached = false;

    if (isCacheFresh(cachedCombinedListings.timestamp) && cachedCombinedListings.data) {
        combinedListings = [...(cachedCombinedListings.data.products || []), ...(cachedCombinedListings.data.services || [])];
        if (selectedLocation === 'all') {
            combinedListings = combinedListings.filter(item => locations.cities.some(city => city.id === item.location));
        } else if (selectedLocation) {
            combinedListings = combinedListings.filter(item => item.location === selectedLocation);
        }
        const sortedListings = sortListings(combinedListings, currentSortBy);
        useCached = true;
        renderContent(sortedListings);
    }

    try {
        const latestCombinedListings = await listingAPI.getAllListings();

        if (renderId !== currentActiveRenderId) return;

        let filteredListings = latestCombinedListings;

        if (selectedLocation === 'all') {
            filteredListings = filteredListings.filter(item => locations.cities.some(city => city.id === item.location));
        } else if (selectedLocation) {
            filteredListings = filteredListings.filter(item => item.location === selectedLocation);
        }

        const sortedLatestListings = sortListings(filteredListings, currentSortBy);

        setCachedCombinedListings({ products: filteredListings.filter(l => l.type === 'product'), services: filteredListings.filter(l => l.type === 'service') });

        if (!useCached || JSON.stringify(combinedListings) !== JSON.stringify(latestCombinedListings)) {
            renderContent(sortedLatestListings);
        }

    } catch (error) {
        if (renderId !== currentActiveRenderId) return;
        console.error('Error rendering browse listings:', error);
        showMessage(error.message || 'Error loading listings', 'error');

        const listingsGrid = DOMElements.mainContent.querySelector('.listings-grid');
        listingsGrid.innerHTML = `
        <div class="error-container">
        <div class="not-found-content">
        <i class="fas fa-exclamation-triangle not-found-icon"></i>
        <p class="not-found-message">Failed to load listings.</p>
        </div>
        <button class="btn-primary retry-browse-btn">Try Again</button>
        </div>
        `;
        document.querySelector('.retry-browse-btn')?.addEventListener('click', () => {
            renderView('browse-listings');
        });
        initializeDOMElements();
    }
}
