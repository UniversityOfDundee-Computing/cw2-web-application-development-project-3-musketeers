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
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container ${containerId} not found`);
        return;
    }

    // Create image element
    const img = new Image();
    img.src = chartUrl;
    img.alt = altText;
    img.style.maxWidth = "100%";
    img.style.height = "auto";

    // Handle loading errors
    img.onerror = () => {
        container.innerHTML = `<p>Failed to load chart: ${altText}</p>`;
    };

    // Clear container and add image
    container.innerHTML = "";
    container.appendChild(img);
}

/**
 * Create error message element for chart container
 * @param {string} containerId The ID of the container element
 * @param {string} message Error message to display
 */
export function displayChartError(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="chart-error">
                <p>Error: ${message}</p>
                <button onclick="location.reload()">Retry</button>
            </div>
        `;
    }
}

/**
 * Create loading indicator for chart container
 * @param {string} containerId The ID of the container element
 */
export function displayChartLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="chart-loading">
                <p>Loading chart...</p>
            </div>
        `;
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