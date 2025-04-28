/**
 * Chart Service
 * Handles all interactions with the QuickChart API
 * Acts as the second API in our Method 2 implementation
 */

class ChartService {
    constructor() {
        this.baseUrl = "https://quickchart.io/chart";
        this.defaultOptions = {
            plugins: {
                title: {
                    font: {
                        size: 22,
                        weight: 'bold',
                        family: 'Arial'
                    },
                    color: '#222'
                },
                legend: {
                    labels: {
                        color: "#444",
                        font: { size: 12, weight: "bold" }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: "#444",
                        font: { size: 12, weight: "bold" }
                    },
                    grid: { color: "#eee" }
                },
                y: {
                    ticks: {
                        color: "#444",
                        font: { size: 12, weight: "bold" }
                    },
                    grid: { color: "#eee" }
                }
            }
        };

        this.colorSchemes = {
            default: ["#ff6384", "#36a2eb", "#ffcd56", "#4bc0c0", "#9966ff"],
            blue: ["#36a2eb", "#4299e1", "#63b3ed", "#90cdf4", "#bee3f8"],
            red: ["#ff6384", "#fc8181", "#feb2b2", "#fed7d7", "#fff5f5"]
        };
    }

    /**
     * Create chart configuration URL
     * @param {Object} config - Chart configuration
     * @returns {string} Full chart URL
     */
    createChartUrl(config) {
        return `${this.baseUrl}?version=4&c=${encodeURIComponent(JSON.stringify(config))}`;
    }

    /**
     * Create bar chart configuration
     * @param {Object} data - Chart data
     * @param {Object} options - Additional options
     * @returns {Object} Chart configuration
     */
    createBarChart({ labels, values, title, colorScheme = 'default', horizontal = false }) {
        return {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: title,
                    data: values,
                    backgroundColor: this.colorSchemes[colorScheme],
                    borderColor: "#333",
                    borderWidth: 1.5,
                    borderRadius: 6,
                    barThickness: 40
                }]
            },
            options: {
                ...this.defaultOptions,
                indexAxis: horizontal ? 'y' : 'x',
                plugins: {
                    ...this.defaultOptions.plugins,
                    title: {
                        ...this.defaultOptions.plugins.title,
                        display: true,
                        text: title
                    }
                }
            }
        };
    }

    /**
     * Create pie/doughnut chart configuration
     * @param {Object} data - Chart data
     * @param {Object} options - Additional options
     * @returns {Object} Chart configuration
     */
    createPieChart({ labels, values, title, colorScheme = 'default', isDoughnut = false }) {
        return {
            type: isDoughnut ? "doughnut" : "pie",
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: this.colorSchemes[colorScheme],
                    borderColor: "#fff",
                    borderWidth: 2
                }]
            },
            options: {
                plugins: {
                    ...this.defaultOptions.plugins,
                    title: {
                        ...this.defaultOptions.plugins.title,
                        display: true,
                        text: title
                    },
                    legend: {
                        ...this.defaultOptions.plugins.legend,
                        position: 'bottom'
                    }
                }
            }
        };
    }

    /**
     * Create radar chart configuration
     * @param {Object} data - Chart data
     * @param {Object} options - Additional options
     * @returns {Object} Chart configuration
     */
    createRadarChart({ labels, values, title }) {
        return {
            type: "radar",
            data: {
                labels,
                datasets: [{
                    label: title,
                    data: values,
                    backgroundColor: "rgba(54, 162, 235, 0.2)",
                    borderColor: "rgba(54, 162, 235, 1)",
                    pointBackgroundColor: "#36a2eb",
                    pointBorderColor: "#fff",
                    pointHoverBackgroundColor: "#fff",
                    pointHoverBorderColor: "#36a2eb"
                }]
            },
            options: {
                ...this.defaultOptions,
                plugins: {
                    ...this.defaultOptions.plugins,
                    title: {
                        ...this.defaultOptions.plugins.title,
                        display: true,
                        text: title
                    }
                }
            }
        };
    }
}

// Export a singleton instance
export const chartService = new ChartService();