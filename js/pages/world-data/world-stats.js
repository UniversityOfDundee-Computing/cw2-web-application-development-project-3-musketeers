// World Stats at a Glance
(function() {
    console.log('[chartContainer9] Initializing World Stats...');
    
    // Run immediately - don't wait for DOMContentLoaded
    // Find the required DOM elements
    const statsGrid = document.querySelector('#chartContainer9 .stats-grid');
    const loadingElement = document.querySelector('#world-stats-loading');
    const statsWrapper = document.querySelector('#world-stats-container');
    const descriptionElement = document.querySelector('#chartContainer9 .chart-description');
    
    // Auto-refresh configuration
    const autoRefreshInterval = 60000; // Refresh every 1 minute
    let refreshTimer = null;
    
    // Initialize loading element state if it exists
    if (loadingElement) {
        loadingElement.style.visibility = 'visible';
        loadingElement.style.opacity = '1';
        loadingElement.style.display = 'flex';
        // Track creation time to ensure minimum display duration
        loadingElement.dataset.creationTime = Date.now().toString();
    }
    
    // Log element status for debugging
    if (!statsGrid) {
        console.error('[chartContainer9] Error: Stats grid element not found');
        return;
    }
    if (!loadingElement) {
        console.error('[chartContainer9] Error: Loading indicator not found');
        return;
    }
    if (!statsWrapper) {
        console.error('[chartContainer9] Error: Stats wrapper element not found');
        return;
    }

    console.log('[chartContainer9] DOM elements found, preparing to fetch data...');
    
    // Create a variable for the timeout ID in the proper scope
    let globalTimeoutId = null;
    
    /**
     * Generate dynamic description for world stats based on data
     * @param {Object} stats - The stats object with calculated values
     * @returns {string} - Dynamic description text
     */
    function generateStatsDescription(stats) {
        // Extract key metrics for the description
        const totalCountries = parseInt(stats[0].value.replace(/,/g, ''));
        const globalPopulation = stats[1].value;
        const languagesCount = parseInt(stats[2].value.replace(/,/g, ''));
        const currenciesCount = parseInt(stats[3].value.replace(/,/g, ''));
        
        // Generate a dynamic description with the actual data
        return `Comprehensive global statistics across ${totalCountries} countries showing key metrics including population (${globalPopulation}), ${languagesCount} languages, ${currenciesCount} currencies, and more. Updated ${new Date().toLocaleDateString()}.`;
    }
    
    /**
     * Format large numbers into readable strings
     */
    function formatNumber(num) {
        if (num >= 1000000000) return (num / 1000000000).toFixed(1) + ' B';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + ' M';
        return num.toLocaleString();
    }
    
    /**
     * Format land area into readable format
     */
    function formatArea(area) {
        if (area >= 1000000) return (area / 1000000).toFixed(1) + ' M km²';
        return area.toLocaleString() + ' km²';
    }
    
    /**
     * Adjust color for gradient effect
     */
    function adjustColor(color, amount) {
        if (color.startsWith('#')) {
            let r = parseInt(color.substring(1, 3), 16);
            let g = parseInt(color.substring(3, 5), 16);
            let b = parseInt(color.substring(5, 7), 16);
            
            r = Math.max(0, Math.min(255, r + amount));
            g = Math.max(0, Math.min(255, g + amount));
            b = Math.max(0, Math.min(255, b + amount));
            
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        }
        return color;
    }
    
    /**
     * Render the stats cards UI
     */
    function renderStats(stats) {
        // Clear any existing content
        statsGrid.innerHTML = '';

        // Create and append each stat card
        stats.forEach(stat => {
            const card = document.createElement('div');
            // *** MODIFIED: Add category class for styling ***
            const categoryClass = stat.title.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, ''); // Generate a class like 'total-countries'
            card.className = `stat-card ${categoryClass}`;
            // *** END MODIFIED ***

            // *** REMOVED: Inline background style ***
            // card.style.background = `linear-gradient(135deg, ${stat.color}, ${adjustColor(stat.color, -20)})`;

            // *** MODIFIED: Use CSS variables for accent color ***
            card.style.setProperty('--card-accent', stat.color);

            card.innerHTML = `
                <div class="card-title">
                    <div class="icon-container">
                        <i>${stat.icon}</i>
                    </div>
                    <span>${stat.title}</span>
                </div>
                <div class="card-value">${stat.value}</div>
                ${stat.subtitle ? `<div class="card-subtitle">${stat.subtitle}</div>` : ''}
            `;
            // *** END MODIFIED ***

            statsGrid.appendChild(card);
        });

        // Update the description with dynamic content
        if (descriptionElement) {
            descriptionElement.textContent = generateStatsDescription(stats);
        }
        
        // Remove any existing last-updated timestamp
        const existingTimestamp = statsWrapper.querySelector('.last-updated');
        if (existingTimestamp) {
            existingTimestamp.remove();
        }
        
        console.log('[chartContainer9] Stats cards rendered successfully');
    }
    
    /**
     * Show error notification when fetch fails
     */
    function showErrorNotification() {
        console.log('[chartContainer9] Showing error notification');
        
        // Hide the loading indicator immediately
        if (loadingElement) {
            loadingElement.style.visibility = 'hidden';
            loadingElement.style.opacity = '0';
            loadingElement.style.display = 'none';
            loadingElement.style.zIndex = '-1';
        }
        
        // Show error in the stats grid
        statsGrid.innerHTML = `
            <div class="chart-error">
                <svg xmlns="http://www.w3.org/2000/svg" class="error-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 101.414 1.414L10 11.414l1.293 1.293a1 1 001.414-1.414L11.414 10l1.293-1.293a1 1 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                </svg>
                <p>Failed to load global statistics</p>
                <button onclick="location.reload()" class="retry-button">
                    Retry
                </button>
            </div>
        `;
    }
    
    /**
     * Hide loading indicator safely with more aggressive DOM manipulation to ensure it disappears
     */
    function hideLoading() {
        if (!loadingElement) return;
        
        console.log('[chartContainer9] Forcibly hiding loading indicator...');
        
        // Calculate how long the loading has been visible
        const creationTime = parseInt(loadingElement.dataset.creationTime || '0');
        const currentTime = Date.now();
        const elapsedTime = currentTime - creationTime;
        
        // Ensure loading shows for at least 800ms to avoid flickering
        const minDisplayTime = 800; 
        const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
        
        setTimeout(() => {
            // First set of immediate style changes
            loadingElement.style.visibility = 'hidden';
            loadingElement.style.opacity = '0';
            loadingElement.style.zIndex = '-1';
            
            // After a transition period, completely remove from display
            setTimeout(() => {
                loadingElement.style.display = 'none';
                
                // Verify it's actually hidden
                if (getComputedStyle(loadingElement).display !== 'none') {
                    console.warn('[chartContainer9] Loading still visible after initial hiding, forcing removal');
                    
                    // Force remove with direct parent manipulation
                    try {
                        // Clone and replace parent to ensure loading is removed
                        const statsContainer = document.getElementById('world-stats-container');
                        if (statsContainer) {
                            const clone = statsContainer.cloneNode(true);
                            const loadingInClone = clone.querySelector('#world-stats-loading');
                            if (loadingInClone) {
                                loadingInClone.remove();
                                if (statsContainer.parentNode) {
                                    statsContainer.parentNode.replaceChild(clone, statsContainer);
                                    console.log('[chartContainer9] Replaced entire container to force remove loading');
                                }
                            }
                        }
                    } catch (e) {
                        console.error('[chartContainer9] Error during forced removal:', e);
                    }
                }
                
                console.log('[chartContainer9] Loading indicator hidden completely');
            }, 300);
        }, remainingTime);
    }
    
    /**
     * Set a timeout to prevent infinite loading
     */
    globalTimeoutId = setTimeout(() => {
        console.warn('[chartContainer9] API request timed out, showing error state');
        // Clear any existing refresh timer to prevent background retries
        if (refreshTimer) {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }
        showErrorNotification();
    }, 10000); // 10 second timeout
    
    /**
     * Set up auto-refresh for live updates of world stats
     */
    function setupAutoRefresh() {
        // Clear any existing timer
        if (refreshTimer) {
            clearInterval(refreshTimer);
        }
        
        // Set up a new timer to periodically refresh the stats
        refreshTimer = setInterval(() => {
            console.log('[chartContainer9] Auto-refreshing world stats...');
            fetchWorldStats();
        }, autoRefreshInterval);
        
        console.log(`[chartContainer9] Auto-refresh set up with interval of ${autoRefreshInterval}ms`);
        
        // Add cleanup on page unload
        window.addEventListener('beforeunload', () => {
            if (refreshTimer) {
                clearInterval(refreshTimer);
                refreshTimer = null;
            }
        });
    }
    
    /**
     * Fetch country data and process it with async/await
     */
    async function fetchWorldStats() {
        // Only proceed if loading state is available
        if (loadingElement) {
            loadingElement.style.visibility = 'visible';
            loadingElement.style.opacity = '1';
            loadingElement.style.display = 'flex';
            loadingElement.style.zIndex = '1000'; 
            // Update creation time for minimum display time calculation
            loadingElement.dataset.creationTime = Date.now().toString();
        }
        
        console.log('[chartContainer9] Starting API request...');
        
        try {
            // Make the API request with a timeout controller
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            
            const response = await fetch('https://restcountries.com/v3.1/all', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.status}`);
            }
            
            console.log('[chartContainer9] API response received successfully');
            const countries = await response.json();
            
            // Calculate global statistics
            const totalCountries = countries.length;
            const totalPopulation = countries.reduce((sum, country) => sum + (country.population || 0), 0);
            
            // Count unique languages, currencies, capitals
            const languages = new Set();
            const currencies = new Set();
            const capitals = new Set();
            
            countries.forEach(country => {
                // Process languages
                if (country.languages) {
                    Object.values(country.languages).forEach(lang => languages.add(lang));
                }
                
                // Process currencies
                if (country.currencies) {
                    Object.keys(country.currencies).forEach(curr => currencies.add(curr));
                }
                
                // Process capitals
                if (country.capital && country.capital.length) {
                    country.capital.forEach(cap => capitals.add(cap));
                }
            });
            
            // Land area statistics
            const totalLandArea = countries.reduce((sum, country) => sum + (country.area || 0), 0);
            
            // Find largest country by area
            const largestCountry = countries.reduce((largest, country) => 
                (!largest || (country.area || 0) > (largest.area || 0)) ? country : largest, 
                { area: 0 });
            
            // Find country with most borders
            const mostBorders = countries.reduce((most, country) => 
                (!most || (country.borders?.length || 0) > (most.borders?.length || 0)) ? country : most, 
                { borders: [] });
            
            // Create stats array with calculated data
            const stats = [
                {
                    title: "Total Countries",
                    value: totalCountries.toLocaleString(),
                    icon: "🗺️",
                    color: "#4285f4", // Blue - Political/General
                    category: "political"
                },
                {
                    title: "Global Population",
                    value: formatNumber(totalPopulation),
                    icon: "👥",
                    color: "#ea4335", // Red - Population
                    category: "population"
                },
                {
                    title: "Languages Spoken",
                    value: languages.size.toLocaleString(),
                    icon: "🗣️",
                    color: "#fbbc05", // Yellow - Cultural
                    category: "language"
                },
                {
                    title: "Currencies Used",
                    value: currencies.size.toLocaleString(),
                    icon: "💰",
                    color: "#34a853", // Green - Economic
                    category: "economic"
                },
                {
                    title: "Capital Cities",
                    value: capitals.size.toLocaleString(),
                    icon: "🏙️",
                    color: "#ff6d01", // Orange - Geography/Urban
                    category: "geography" // Assigning to geography for color
                },
                {
                    title: "Global Land Area",
                    value: formatArea(totalLandArea),
                    icon: "🌐",
                    color: "#46bdc6", // Teal - Geography
                    category: "geography"
                },
                {
                    title: "Largest Country",
                    value: largestCountry?.name?.common || "N/A",
                    icon: "📏",
                    color: "#7e57c2", // Purple - Political/Geography
                    category: "political", // Assigning to political for color
                    subtitle: `by Area: ${formatArea(largestCountry?.area || 0)}`
                },
                {
                    title: "Most Borders",
                    value: `${mostBorders?.name?.common || "N/A"}`,
                    icon: "🤝",
                    color: "#ec407a", // Pink - Political/Geography
                    category: "political", // Assigning to political for color
                    subtitle: `(${mostBorders?.borders?.length || 0} neighbors)`
                }
            ];

            // *** MODIFIED: Assign category class based on title/category ***
            stats.forEach(stat => {
                let category = stat.category || 'political'; // Default category
                if (stat.title.includes('Population')) category = 'population';
                else if (stat.title.includes('Area') || stat.title.includes('Largest') || stat.title.includes('Capital')) category = 'geography';
                else if (stat.title.includes('Currenc')) category = 'economic';
                else if (stat.title.includes('Countr') || stat.title.includes('Border') || stat.title.includes('Independen')) category = 'political';
                else if (stat.title.includes('Language')) category = 'language';

                stat.categoryClass = category; // Store for use in renderStats if needed, though CSS handles it now
            });
            // *** END MODIFIED ***

            console.log('[chartContainer9] Data processed successfully');
            
            // Clear the global timeout
            if (globalTimeoutId) {
                clearTimeout(globalTimeoutId);
                globalTimeoutId = null;
            }
            
            // Hide loading indicator with proper state management
            hideLoading();
            
            // Render the stats
            renderStats(stats);
            
            // Set up auto-refresh (only on first load)
            if (!refreshTimer) {
                setupAutoRefresh();
            }
            
        } catch (error) {
            console.error('[chartContainer9] Error fetching or processing data:', error);
            
            // Clear the global timeout to prevent duplicate error handling
            if (globalTimeoutId) {
                clearTimeout(globalTimeoutId);
                globalTimeoutId = null;
            }
            
            // Show error notification
            showErrorNotification();
        }
    }
    
    // Start the data fetch process
    fetchWorldStats();
})();
