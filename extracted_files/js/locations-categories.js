// js/locations-categories.js
import { setCategories, setLocations, categories, locations, filterLocation, setFilterLocation,
    cachedStaticCategories, cachedStaticLocations, setCachedStaticCategories, setCachedStaticLocations } from './state.js';
    import DOMElements from './dom.js';
    import { showMessage } from './utils.js';
    import { closeModal, openModal } from './modals.js';
    import { renderView } from './views/core.js'; // Updated import path for renderView
    import { setCachedCombinedListings, setCachedProducts, setCachedServices } from './state.js';

    const STATIC_DATA_VERSION = 2;

    function toRad(value) {
        return value * Math.PI / 180;
    }

    function calculateDistance(userLat, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = toRad(lat2 - userLat);
        const dLon = toRad(lon2 - lon1);
        const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(userLat)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return distance;
    }

    function findClosestCity(userLat, userLon) {
        let closestCity = null;
        let minDistance = Infinity;

        if (locations && locations.cities) {
            for (const city of locations.cities) {
                if (city.lat !== undefined && city.lon !== undefined) {
                    const distance = calculateDistance(userLat, userLon, city.lat, city.lon);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestCity = city.id;
                    }
                }
            }
        }
        return closestCity;
    }

    async function autoSelectLocation() {
        const wasButtonClicked = DOMElements.autoDetectLocationButton.classList.contains('clicked');

        if (!wasButtonClicked && localStorage.getItem('selectedLocation') && localStorage.getItem('selectedLocation') !== 'all') {
            return;
        }

        DOMElements.autoDetectLocationButton.classList.remove('clicked');


        if (!navigator.geolocation) {
            showMessage('Geolocation is not supported by your browser.', 'error');
            return;
        }

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: false,
                    timeout: 5000,
                    maximumAge: 0
                });
            });

            const userLat = position.coords.latitude;
            const userLon = position.coords.longitude;

            const closestCityId = findClosestCity(userLat, userLon);

            if (closestCityId) {
                const cityData = locations.cities.find(city => city.id === closestCityId);
                if (cityData) {
                    const oldSelectedLocation = getSelectedLocation();
                    setFilterLocation(closestCityId);
                    updateLocationIcon(cityData.name);
                    showMessage(`Auto selected: ${cityData.name}`, 'success');

                    if (oldSelectedLocation !== closestCityId) {
                        setCachedCombinedListings({ data: null, timestamp: 0 });
                        setCachedProducts({ data: null, timestamp: 0 });
                        setCachedServices({ data: null, timestamp: 0 });
                    }
                }
            } else {
                showMessage('Could not find a closest supported city.', 'error');
            }

        } catch (error) {
            console.warn('Geolocation error:', error.message);
            let errorMessage = 'Error detecting location.';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = "Location access denied. Please enable it in your browser settings.";
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = "Location information is unavailable.";
                    break;
                case error.TIMEOUT:
                    errorMessage = "Location request timed out.";
                    break;
                case error.UNKNOWN_ERROR:
                    errorMessage = "An unknown error occurred during location detection.";
                    break;
            }
            showMessage(errorMessage, 'error');

            if (!localStorage.getItem('selectedLocation')) {
                setFilterLocation('all');
                updateLocationIcon('All');
            }
        }
    }

    function selectLocation(id, name) {
        const locationModal = DOMElements.locationModal;
        const purpose = locationModal.getAttribute('data-purpose');

        if (purpose === 'filter') {
            const oldSelectedLocation = getSelectedLocation();
            setFilterLocation(id);
            updateLocationIcon(name);
            showMessage(`Location set to: ${name}`, 'success');

            const currentViewName = DOMElements.mainContent.dataset.currentView;
            const currentListingId = DOMElements.mainContent.dataset.currentListingId;
            const currentProfileIdentifier = DOMElements.mainContent.dataset.currentProfileIdentifier;

            if (oldSelectedLocation !== id || ['home', 'products', 'services', 'browse-listings', 'search', 'category'].includes(currentViewName)) {
                if (oldSelectedLocation !== id) {
                    setCachedCombinedListings({ data: null, timestamp: 0 });
                    setCachedProducts({ data: null, timestamp: 0 });
                    setCachedServices({ data: null, timestamp: 0 });
                }

                if (currentViewName === 'listing-detail' && currentListingId) {
                    renderView('listing-detail', currentListingId);
                } else if (currentViewName === 'profile' && currentProfileIdentifier) {
                    renderView('profile', currentProfileIdentifier);
                } else if (currentViewName === 'category' && DOMElements.mainContent.dataset.currentCategory) {
                    renderView('category', { category: DOMElements.mainContent.dataset.currentCategory });
                } else if (currentViewName === 'search') {
                    renderView('search');
                } else {
                    renderView(currentViewName || 'home');
                }
            }
        } else if (purpose === 'add-listing') {
            DOMElements.listingLocationName.value = name;
            DOMElements.listingLocationId.value = id;
        } else if (purpose === 'edit-listing') {
            DOMElements.editListingLocationName.value = name;
            DOMElements.editListingLocationId.value = id;
        } else if (purpose === 'edit-profile') {
            DOMElements.editProfileLocationName.value = name;
            DOMElements.editProfileLocationId.value = id;
        }

        closeModal(locationModal);
    }

    async function fetchCategories() {
        const cachedData = localStorage.getItem('cachedStaticCategories');
        if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            if (parsedData.version === STATIC_DATA_VERSION) {
                setCategories(parsedData.data);
                setCachedStaticCategories(parsedData.data, parsedData.version);
                console.log('Categories loaded from cache (version ' + STATIC_DATA_VERSION + ')');
                return parsedData.data;
            } else {
                console.log('Cached categories are outdated (version ' + parsedData.version + '), fetching new data.');
            }
        } else {
            console.log('No categories found in cache, fetching new data.');
        }

        try {
            const response = await fetch(`/data/categories.json?v=${STATIC_DATA_VERSION}`);
            if (!response.ok) {
                throw new Error('Failed to fetch categories');
            }
            const data = await response.json();
            setCategories(data);
            setCachedStaticCategories(data, STATIC_DATA_VERSION);
            return data;
        } catch (error) {
            console.error('Error loading categories:', error);
            setCategories({ categories: [] }); // Updated to match new structure
            return { categories: [] }; // Updated to match new structure
        }
    }

    async function fetchLocations() {
        const cachedData = localStorage.getItem('cachedStaticLocations');
        if (cachedData) {
            const parsedData = JSON.parse(cachedData);
            if (parsedData.version === STATIC_DATA_VERSION) {
                setLocations(parsedData.data);
                setCachedStaticLocations(parsedData.data, parsedData.version);
                console.log('Locations loaded from cache (version ' + STATIC_DATA_VERSION + ')');
                return parsedData.data;
            } else {
                console.log('Cached locations are outdated (version ' + parsedData.version + '), fetching new data.');
            }
        } else {
            console.log('No locations found in cache, fetching new data.');
        }

        try {
            const response = await fetch(`/data/locations.json?v=${STATIC_DATA_VERSION}`);
            if (!response.ok) {
                throw new Error('Failed to fetch locations');
            }
            const data = await response.json();
            setLocations(data);
            setCachedStaticLocations(data, STATIC_DATA_VERSION);
            return data;
        } catch (error) {
            console.error('Error loading locations:', error);
            setLocations({ cities: [], campuses: [] });
            return { cities: [], campuses: [] };
        }
    }

    function getLocationName(locationId) {
        if (locationId === 'all') {
            return 'All';
        }
        const allLocations = [...locations.cities, ...locations.campuses];
        const location = allLocations.find(loc => loc.id === locationId);
        return location ? location.name : 'Unknown Location';
    }

    function getSelectedLocation() {
        const selectedLocation = localStorage.getItem('selectedLocation');
        return selectedLocation || 'all';
    }

    function updateLocationIcon(locationName = '') {

        if (locationName === 'All' || getSelectedLocation() === 'all') {
            DOMElements.locationText.style.display = 'inline';
            DOMElements.locationText.textContent = 'All';
        } else if (locationName) {
            DOMElements.locationText.style.display = 'inline';
            DOMElements.locationText.textContent = locationName;
        } else {
            DOMElements.locationText.style.display = 'none';
        }
    }

    function populateCategoryDropdown(dropdownId) {
        const dropdown = document.getElementById(dropdownId);
        if (!dropdown) return;

        while (dropdown.options.length > 1) {
            dropdown.remove(1);
        }

        // Updated to work with array format
        if (categories && categories.categories) {
            categories.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                dropdown.appendChild(option);
            });
        }
    }

    async function renderLocationLists(searchQuery) {
        const cityList = DOMElements.cityList;
        const campusList = DOMElements.campusList;

        cityList.innerHTML = '';
        campusList.innerHTML = '';

        locations.cities
        .filter(city => city.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 5)
        .forEach(city => {
            const cityElement = document.createElement('div');
            cityElement.textContent = city.name;
            cityElement.setAttribute('data-id', city.id);
            cityElement.classList.add('location-item');
            cityElement.addEventListener('click', () => selectLocation(city.id, city.name));
            cityList.appendChild(cityElement);
        });

        locations.campuses
        .filter(campus => campus.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 5)
        .forEach(campus => {
            const campusElement = document.createElement('div');
            campusElement.textContent = campus.name;
            campusElement.setAttribute('data-id', campus.id);
            campusElement.classList.add('location-item');
            campusElement.addEventListener('click', () => selectLocation(campus.id, campus.name));
            campusList.appendChild(campusElement);
        });
    }

    function openLocationModal(purpose) {
        const locationModal = DOMElements.locationModal;
        const defaultToAllButton = DOMElements.defaultToAllButton;
        const autoDetectButton = DOMElements.autoDetectLocationButton;

        locationModal.setAttribute('data-purpose', purpose);

        if (purpose === 'filter') {
            defaultToAllButton.style.display = 'block';
            autoDetectButton.style.display = 'block';
        } else {
            defaultToAllButton.style.display = 'none';
            autoDetectButton.style.display = 'none';
        }

        openModal(locationModal);
        renderLocationLists('');
    }

    function openCategoryModal(purpose, currentCategory = '') {
        const categoryModal = DOMElements.categoryModal;
        categoryModal.setAttribute('data-purpose', purpose);
        categoryModal.setAttribute('data-current-category', currentCategory);
        openModal(categoryModal);
        renderCategoryList('');

        categoryModal.addEventListener('click', stopPropagation);
    }

    function renderCategoryList(searchQuery) {
        const categoryList = DOMElements.categoryList;
        categoryList.innerHTML = '';

        const purpose = DOMElements.categoryModal.getAttribute('data-purpose');

        if (purpose === 'select-only' || purpose === 'filter') {
            const allCategoriesItem = document.createElement('div');
            allCategoriesItem.className = 'category-item';
            allCategoriesItem.innerHTML = `
            <img src="https://cdn-icons-png.flaticon.com/512/11244/11244162.png" alt="All Categories">
            <h3>All Categories</h3>
            <p>Browse all available categories</p>
            `;
            allCategoriesItem.addEventListener('click', () => selectCategory('', 'All Categories'));
            categoryList.appendChild(allCategoriesItem);
        }

        // Updated to work with array format
        const filteredCategories = categories && categories.categories ? 
            categories.categories.filter(category =>
                category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                category.description.toLowerCase().includes(searchQuery.toLowerCase())
            ) : [];

        if (filteredCategories.length === 0 && searchQuery) {
            categoryList.innerHTML += `
            <div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #7f8c8d;">
            No categories found matching your search
            </div>
            `;
        }

        filteredCategories.forEach(category => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            categoryItem.innerHTML = `
            <img src="${category.image}" alt="${category.name}">
            <h3>${category.name}</h3>
            <p>${category.description}</p>
            `;
            categoryItem.addEventListener('click', () => selectCategory(category.id, category.name));
            categoryList.appendChild(categoryItem);
        });
    }

    function selectCategory(categoryId, categoryName) {
        const categoryModal = DOMElements.categoryModal;
        const purpose = categoryModal.getAttribute('data-purpose');

        if (purpose === 'add-listing') {
            DOMElements.listingCategory.value = categoryId;
        } else if (purpose === 'edit-listing') {
            DOMElements.editListingCategory.value = categoryId;
        } else if (purpose === 'select-only') {
            const select = DOMElements.categorySelect;
            select.value = categoryId;
            const option = select.options[select.selectedIndex];
            if (option) option.text = categoryName || 'All Categories';
        }

        closeModal(categoryModal);

        setTimeout(() => {
            categoryModal.removeEventListener('click', stopPropagation);
        }, 100);
    }

    function stopPropagation(e) {
        e.stopPropagation();
    }

    export {
        fetchCategories,
        fetchLocations,
        getLocationName,
        getSelectedLocation,
        updateLocationIcon,
        populateCategoryDropdown,
        renderLocationLists,
        selectLocation,
        openLocationModal,
        openCategoryModal,
        renderCategoryList,
        selectCategory,
        stopPropagation,
        autoSelectLocation
    };
