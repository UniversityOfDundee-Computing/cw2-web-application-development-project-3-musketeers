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

    // Find and remove any existing loading indicator inside the wrapper
    const existingLoading = wrapper.querySelector('.chart-loading');
    if (existingLoading) {
        console.log(`[${containerId}] Removing existing loading indicator from wrapper.`);
        existingLoading.remove();
    } else {
         // Also check in container just in case structure was already modified
         const containerLoading = container.querySelector('.chart-loading');
         if (containerLoading) {
            console.log(`[${containerId}] Removing existing loading indicator from container.`);
            containerLoading.remove();
         }
    }

    displayChartContent(wrapper, chartUrl, altText);
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
    
    const img = new Image();

    img.onload = () => {
        console.log(`[${containerId}] Image loaded successfully.`);
        // Clear only the target element's content before adding the image
        targetElement.innerHTML = ''; 
        targetElement.appendChild(img);
        console.log(`[${containerId}] Image appended to target element.`);
    };

    img.onerror = () => {
        console.error(`[${containerId}] Failed to load image from URL:`, chartUrl);
        // Display error inside the target element
        targetElement.innerHTML = `
            <div class="chart-error" style="position: relative; inset: auto; animation: none; opacity: 1;"> 
                <p>Error: Failed to load chart image.</p>
                <p style="word-break: break-all;">URL: <a href="${chartUrl}" target="_blank" rel="noopener noreferrer">View Chart URL</a></p>
                <button onclick="location.reload()">Retry</button>
            </div>
        `;
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
            <p>Error: ${message}</p>
            <button onclick="location.reload()">Retry</button>
        </div>
    `;
}

/**
 * Create loading indicator for chart container
 * @param {string} containerId The ID of the container element
 */
export function displayChartLoading(containerId) {
    console.log(`[${containerId}] displayChartLoading called.`);
    const container = document.getElementById(containerId);
     if (!container) return;

    const wrapper = container.querySelector('.chart-wrapper');
    const targetElement = wrapper || container; // Use wrapper if found, else container

    // Ensure only one loading indicator exists within the target
    const existingLoading = targetElement.querySelector('.chart-loading');
    if (!existingLoading) {
         // If adding to wrapper, preserve title and description
         if (targetElement === wrapper) {
             const title = wrapper.querySelector('.chart-title')?.outerHTML || '';
             const description = wrapper.querySelector('.chart-description')?.outerHTML || '';
             // Append loading indicator after title/description
             targetElement.innerHTML = title + description + ` 
                <div class="chart-loading">
                    <div class="loading-spinner" role="status">
                       <span class="sr-only">Loading...</span>
                    </div>
                    <p>Loading chart...</p> 
                </div>`;
         } else {
             // If adding directly to container (fallback), just set innerHTML
             targetElement.innerHTML = `
                <div class="chart-loading">
                     <div class="loading-spinner" role="status">
                       <span class="sr-only">Loading...</span>
                    </div>
                    <p>Loading chart...</p>
                </div>`;
         }
    } else {
        console.log(`[${containerId}] Loading indicator already present in target.`);
    }
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