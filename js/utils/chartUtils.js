/**
 * Chart Utilities
 * Common functions and configurations for chart creation and display
 */

/**
 * Default chart colors
 */
export const chartColors = {
    primary: ["#ff6384", "#36a2eb", "#ffcd56", "#4bc0c0", "#9966ff"],
    blue: ["#36a2eb", "#4299e1", "#63b3ed", "#90cdf4", "#bee3f8"],
    red: ["#ff6384", "#fc8181", "#feb2b2", "#fed7d7", "#fff5f5"]
};

/**
 * Default chart fonts
 */
export const chartFonts = {
    title: {
        size: 22,
        weight: 'bold',
        family: 'Arial'
    },
    label: {
        size: 12,
        weight: 'bold',
        family: 'Arial'
    }
};

/**
 * Default chart options that can be extended
 */
export const defaultChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        title: {
            display: true,
            font: chartFonts.title,
            color: '#222'
        },
        legend: {
            display: true,
            position: 'bottom',
            labels: {
                color: "#444",
                font: chartFonts.label
            }
        }
    },
    scales: {
        x: {
            ticks: {
                color: "#444",
                font: chartFonts.label
            },
            grid: { color: "#eee" }
        },
        y: {
            ticks: {
                color: "#444",
                font: chartFonts.label
            },
            grid: { color: "#eee" }
        }
    }
};

/**
 * Create and display a chart image in a container
 * @param {string} containerId The ID of the container element
 * @param {string} chartUrl The URL of the chart image
 * @param {string} altText Alternative text for the image
 */
export function displayChart(containerId, chartUrl, altText) {
    console.log(`[${containerId}] displayChart called with URL:`, chartUrl);
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`[${containerId}] Container element not found.`);
        return;
    }

    const wrapper = container.querySelector('.chart-wrapper');
    if (!wrapper) {
        console.error(`[${containerId}] Chart wrapper element (.chart-wrapper) not found inside container.`);
        // Fallback: use container directly if wrapper is missing
        displayChartContent(container, chartUrl, altText);
        return;
    }

    // DO NOT hide loading here - moved to image.onload in displayChartContent
    // Let the loading indicator remain visible until the image loads

    // Display the chart without overwriting other content in the wrapper
    displayChartContent(wrapper, chartUrl, altText);
}

/**
 * Hide loading indicator by properly removing it from the DOM
 * @param {string} containerId The ID of the container element
 * @param {boolean} [animate=true] Whether to animate the removal
 * @param {number} [minDisplayTime=800] Minimum time in ms the loading indicator should be shown
 */
export function hideLoadingIndicator(containerId, animate = true, minDisplayTime = 800) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Check both in wrapper and container
    const wrapper = container.querySelector('.chart-wrapper');
    const targetElements = [wrapper, container].filter(Boolean);
    
    targetElements.forEach(element => {
        const loadingEl = element.querySelector('.chart-loading');
        if (loadingEl) {
            // Store when the loading indicator was created/shown
            const creationTime = parseInt(loadingEl.dataset.creationTime || '0');
            const currentTime = Date.now();
            const elapsedTime = currentTime - creationTime;
            
            // Calculate remaining time to ensure minimum display duration
            const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
            
            setTimeout(() => {
                if (animate) {
                    // Fade out animation with improved timing
                    loadingEl.style.transition = 'opacity 0.5s cubic-bezier(0.23, 1, 0.32, 1)';
                    loadingEl.style.opacity = '0';
                    
                    // Remove after transition completes
                    setTimeout(() => {
                        if (loadingEl.parentNode) {
                            loadingEl.parentNode.removeChild(loadingEl);
                        }
                    }, 500); // Match the transition duration
                } else {
                    // Remove immediately without animation
                    if (loadingEl.parentNode) {
                        loadingEl.parentNode.removeChild(loadingEl);
                    }
                }
            }, remainingTime);
        }
    });
}

/**
 * Helper function to create and manage image loading within a target element (container or wrapper)
 * @param {HTMLElement} targetElement The element to display the chart/error in
 * @param {string} chartUrl The URL of the chart image
 * @param {string} altText Alternative text for the image
 */
function displayChartContent(targetElement, chartUrl, altText) {
    const containerId = targetElement.closest('.chart-container')?.id || 'unknown-container';
    console.log(`[${containerId}] Creating image element for target:`, targetElement.tagName, targetElement.className);
    
    // First, fade out any existing chart images before removing them
    const existingImages = targetElement.querySelectorAll('.chart-image');
    if (existingImages.length > 0) {
        console.log(`[${containerId}] Found ${existingImages.length} existing chart images to clean up.`);
        
        // Create a promise that resolves when all images have faded out or after a timeout
        const fadeOutPromise = new Promise((resolve) => {
            let imagesRemaining = existingImages.length;
            
            // Set a maximum timeout in case transitions fail
            const timeoutId = setTimeout(() => {
                console.log(`[${containerId}] Fade-out timeout reached, proceeding with cleanup.`);
                resolve();
            }, 300); // 300ms matches our CSS transition time
            
            existingImages.forEach(image => {
                // Start fade-out animation
                image.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
                image.style.opacity = '0';
                image.style.transform = 'scale(0.96)';
                
                // Listen for transition end and remove the image
                image.addEventListener('transitionend', function handleTransitionEnd() {
                    image.removeEventListener('transitionend', handleTransitionEnd);
                    imagesRemaining--;
                    
                    if (imagesRemaining === 0) {
                        clearTimeout(timeoutId);
                        resolve();
                    }
                });
            });
        });
        
        // After fade-out, remove images and continue loading the new one
        fadeOutPromise.then(() => {
            existingImages.forEach(image => {
                image.remove();
            });
            loadAndDisplayNewImage();
        });
    } else {
        // No existing images to clean up, proceed directly
        loadAndDisplayNewImage();
    }
    
    // Clean up any existing error messages
    const existingErrors = targetElement.querySelectorAll('.chart-error');
    if (existingErrors.length > 0) {
        existingErrors.forEach(error => {
            error.remove();
        });
    }
    
    function loadAndDisplayNewImage() {
        // Create the new image element
        const img = new Image();

        img.onload = () => {
            console.log(`[${containerId}] Image loaded successfully.`);
            
            // Double-check for any remaining chart images (in case more were added during loading)
            const remainingImages = targetElement.querySelectorAll('.chart-image');
            if (remainingImages.length > 0) {
                console.log(`[${containerId}] Found ${remainingImages.length} remaining chart images to remove.`);
                remainingImages.forEach(existingImage => {
                    existingImage.remove();
                });
            }
            
            // Preserve chart controls if they exist
            const chartControls = targetElement.querySelector('.chart-controls');
            let controlsNode = null;
            if (chartControls) {
                controlsNode = chartControls.cloneNode(true);
                if (chartControls.parentNode === targetElement) {
                    chartControls.remove();
                }
            }
            
            // Preserve chart title and descriptions if they exist
            const chartTitle = targetElement.querySelector('.chart-title');
            const chartDescription = targetElement.querySelector('.chart-description');
            let titleNode = null;
            let descriptionNode = null;
            
            if (chartTitle) {
                titleNode = chartTitle.cloneNode(true);
                if (chartTitle.parentNode === targetElement) {
                    chartTitle.remove();
                }
            }
            
            if (chartDescription) {
                descriptionNode = chartDescription.cloneNode(true);
                if (chartDescription.parentNode === targetElement) {
                    chartDescription.remove();
                }
            }
            
            // Append the new image to the target element with animation
            img.style.opacity = '0';
            img.style.transform = 'scale(0.96)';
            
            // Re-add controls, title, and descriptions in the correct order
            if (controlsNode) {
                targetElement.appendChild(controlsNode);
            }
            
            if (titleNode) {
                targetElement.appendChild(titleNode);
            }
            
            if (descriptionNode) {
                targetElement.appendChild(descriptionNode);
            }
            
            targetElement.appendChild(img);
            
            // Trigger reflow to enable animation
            img.offsetHeight;
            
            // Animate in the new image
            img.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
            img.style.opacity = '1';
            img.style.transform = 'scale(1)';
            
            console.log(`[${containerId}] Image appended to target element.`);
            
            // Remove existing timestamp if present
            const existingTimestamp = targetElement.querySelector('.chart-last-updated');
            if (existingTimestamp) {
                existingTimestamp.remove();
            }

            // Hide loading indicator after image is fully loaded
            hideLoadingIndicator(containerId);
        };

        img.onerror = () => {
            console.error(`[${containerId}] Failed to load image from URL:`, chartUrl);
            
            // Create error element
            const errorElement = document.createElement('div');
            errorElement.className = 'chart-error';
            errorElement.style.position = 'relative';
            errorElement.style.inset = 'auto';
            errorElement.style.animation = 'none';
            errorElement.style.opacity = '1';
            errorElement.innerHTML = `
                <p>Error: Failed to load chart image.</p>
                <p style="word-break: break-all;">URL: <a href="${chartUrl}" target="_blank" rel="noopener noreferrer">View Chart URL</a></p>
                <button onclick="location.reload()">Retry</button>
            `;
            
            // Find and remove any existing error message or image
            const existingError = targetElement.querySelector('.chart-error');
            if (existingError) {
                existingError.remove();
            }
            
            // Remove all existing chart images
            const existingImages = targetElement.querySelectorAll('.chart-image');
            existingImages.forEach(existingImage => {
                existingImage.remove();
            });
            
            // Append the error element
            targetElement.appendChild(errorElement);
            console.log(`[${containerId}] Error message displayed in target element.`);
        };

        img.src = chartUrl;
        console.log(`[${containerId}] Image src set. Browser will now attempt to load.`);
        img.alt = altText;
        img.style.maxWidth = "100%";
        img.style.height = "auto";
        // Add the chart-image class for styling consistency
        img.classList.add('chart-image'); 
    }
}

/**
 * Create error message element for chart container
 * @param {string} containerId The ID of the container element
 * @param {string} message Error message to display
 */
export function displayChartError(containerId, message) {
    console.log(`[${containerId}] displayChartError called with message:`, message);
    const container = document.getElementById(containerId);
    if (!container) return;

    const wrapper = container.querySelector('.chart-wrapper');
    const targetElement = wrapper || container; // Use wrapper if found, else container

    // Remove loading indicator if present
    const loadingIndicator = targetElement.querySelector('.chart-loading');
    if (loadingIndicator) {
        loadingIndicator.remove();
    }

    // Preserve title and description if they exist within the wrapper
    let contentPrefix = '';
    if (targetElement === wrapper) {
        const title = wrapper.querySelector('.chart-title')?.outerHTML || '';
        const description = wrapper.querySelector('.chart-description')?.outerHTML || '';
        contentPrefix = title + description;
    }

    targetElement.innerHTML = contentPrefix + `
        <div class="chart-error" style="position: relative; inset: auto; animation: none; opacity: 1;">
            <svg xmlns="http://www.w3.org/2000/svg" class="error-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p>Error: ${message}</p>
            <button onclick="location.reload()">Retry</button>
        </div>
    `;
}

/**
 * Create loading indicator for chart container
 * @param {string} containerId The ID of the container element
 * @param {string} [message] Optional custom loading message
 */
export function displayChartLoading(containerId, message = 'Loading chart...') {
    console.log(`[${containerId}] displayChartLoading called with message: ${message}`);
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`[${containerId}] Container element not found.`);
        return;
    }

    const wrapper = container.querySelector('.chart-wrapper');
    const targetElement = wrapper || container; // Use wrapper if found, else container
    
    // Check if there's already a loading indicator in the HTML
    const existingLoadingIndicator = container.querySelector('.chart-loading') || 
        (wrapper && wrapper.querySelector('.chart-loading'));
    
    if (existingLoadingIndicator) {
        console.log(`[${containerId}] Found existing loading indicator, updating message.`);
        
        // Update the existing loading indicator with the enhanced design
        existingLoadingIndicator.style.opacity = '1';
        existingLoadingIndicator.style.visibility = 'visible';
        existingLoadingIndicator.style.display = 'flex';
        existingLoadingIndicator.style.zIndex = '1000';
        
        // Create a more professional HTML structure for the existing indicator
        existingLoadingIndicator.innerHTML = `
            <div class="spinner-container">
                <div class="spinner-border" role="status"></div>
                <div class="spinner-core"></div>
            </div>
            <p>${message}</p>
            <div class="loading-progress">
                <div class="loading-progress-bar"></div>
            </div>
        `;
        
        return;
    }
    
    // Create a new loading element with enhanced professional design
    console.log(`[${containerId}] Creating new professional loading indicator.`);
    const loadingElement = document.createElement('div');
    loadingElement.className = 'chart-loading';
    
    // Ensure proper styling directly on the element for visibility
    loadingElement.style.position = 'absolute';
    loadingElement.style.top = '0';
    loadingElement.style.left = '0';
    loadingElement.style.right = '0';
    loadingElement.style.bottom = '0';
    loadingElement.style.display = 'flex';
    loadingElement.style.flexDirection = 'column';
    loadingElement.style.alignItems = 'center';
    loadingElement.style.justifyContent = 'center';
    loadingElement.style.backgroundColor = 'rgba(255, 255, 255, 0.92)';
    loadingElement.style.backdropFilter = 'blur(4px)';
    loadingElement.style.zIndex = '1000'; // Higher z-index to ensure visibility
    loadingElement.style.borderRadius = '10px';
    loadingElement.style.visibility = 'visible'; // Ensure it's visible
    
    // Start with opacity 0 for fade-in effect
    loadingElement.style.opacity = '0';
    
    // Create the enhanced spinner and elements
    loadingElement.innerHTML = `
        <div class="spinner-container">
            <div class="spinner-border" role="status"></div>
            <div class="spinner-core"></div>
        </div>
        <p>${message}</p>
        <div class="loading-progress">
            <div class="loading-progress-bar"></div>
        </div>
    `;
    
    // Add the loading element to the target
    targetElement.appendChild(loadingElement);
    
    // Force a reflow before setting opacity for animation
    void loadingElement.offsetHeight;
    
    // Fade in the loading indicator with a smoother curve
    loadingElement.style.transition = 'opacity 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)';
    loadingElement.style.opacity = '1';
    
    console.log(`[${containerId}] Enhanced loading indicator appended and visible.`);
}

/**
 * Merge custom options with default chart options
 * @param {Object} customOptions Custom chart options
 * @returns {Object} Merged options
 */
export function mergeChartOptions(customOptions) {
    return {
        ...defaultChartOptions,
        ...customOptions,
        plugins: {
            ...defaultChartOptions.plugins,
            ...customOptions.plugins
        },
        scales: {
            ...defaultChartOptions.scales,
            ...customOptions.scales
        }
    };
}

/**
 * Generate a consistent set of colors based on data size
 * @param {number} count Number of colors needed
 * @param {string} colorScheme Color scheme to use ('primary', 'blue', 'red')
 * @returns {Array} Array of color strings
 */
export function generateChartColors(count, colorScheme = 'primary') {
    // Get the base color set
    const baseColors = chartColors[colorScheme] || chartColors.primary;
    
    // If we need fewer colors than available, just return what we need
    if (count <= baseColors.length) {
        return baseColors.slice(0, count);
    }
    
    // If we need more colors, generate them
    const colors = [...baseColors];
    
    // Generate additional colors using HSL to maintain a consistent scheme
    for (let i = baseColors.length; i < count; i++) {
        // Use the golden angle approximation for even distribution
        const hue = (i * 137.508) % 360;
        
        // Adjust saturation and lightness based on the color scheme
        let saturation, lightness;
        
        switch(colorScheme) {
            case 'blue':
                saturation = 70;
                lightness = 65;
                break;
            case 'red':
                saturation = 80;
                lightness = 70;
                break;
            default:
                // For primary and any other schemes, use a vibrant color
                saturation = 75;
                lightness = 65;
        }
        
        colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    }
    
    return colors;
}