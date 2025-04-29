/**
 * Currency Usage Chart Component
 * Extends BaseChart to create currency-specific visualizations using radar chart
 */

import { BaseChart } from '../BaseChart.js';
import * as dataProcessing from '../../../utils/dataProcessing.js';

export class CurrencyChart extends BaseChart {
    /**
     * Create a new CurrencyChart instance
     * @param {string} containerId - The ID of the container element
     * @param {Object} options - Chart configuration options
     */
    constructor(containerId, options = {}) {
        super(containerId, {
            title: 'Top 5 Most Used Currencies',
            type: 'radar',
            colorScheme: 'blue',
            limit: 5,
            chartType: 'currency', // Add chart type identifier for dynamic descriptions
            ...options
        });
    }

    /**
     * Process the raw country data into chart-ready format
     * Implements Method 2's data transformation step
     * @param {Array} data - Raw country data from REST Countries API
     * @returns {Object} Processed data ready for chart creation
     */
    async processData(data) {
        const currencyDetails = {};
        const totalCountries = data.length;

        // Count currency usage and gather details
        data.forEach(country => {
            if (country.currencies) {
                Object.entries(country.currencies).forEach(([code, details]) => {
                    if (!currencyDetails[code]) {
                        currencyDetails[code] = {
                            code,
                            name: details.name || code,
                            symbol: details.symbol || code,
                            count: 0
                        };
                    }
                    currencyDetails[code].count++;
                });
            }
        });

        // Sort by usage and take top N
        const sortedCurrencies = Object.values(currencyDetails)
            .sort((a, b) => b.count - a.count)
            .slice(0, this.options.limit);

        return {
            labels: sortedCurrencies.map(c => c.code),
            values: sortedCurrencies.map(c => c.count),
            formatted: sortedCurrencies.map(currency => ({
                code: currency.code,
                name: currency.name,
                symbol: currency.symbol,
                count: currency.count,
                percentage: dataProcessing.calculatePercentage(currency.count, totalCountries)
            }))
        };
    }

    /**
     * Create chart configuration for currency data
     * @param {Object} data - Processed currency data
     * @returns {Object} Chart configuration for QuickChart API
     */
    createChartConfig(data) {
        return {
            type: this.options.type,
            data: {
                labels: data.labels,
                datasets: [{
                    label: "Currency Usage",
                    data: data.values,
                    backgroundColor: "rgba(54, 162, 235, 0.2)",
                    borderColor: "rgba(54, 162, 235, 1)",
                    pointBackgroundColor: "#36a2eb",
                    pointBorderColor: "#fff",
                    pointHoverBackgroundColor: "#fff",
                    pointHoverBorderColor: "#36a2eb"
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: this.options.title,
                        font: {
                            size: 20,
                            weight: "bold",
                            family: "Arial"
                        },
                        color: "#222"
                    },
                    legend: {
                        labels: {
                            color: "#444",
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const item = data.formatted[context.dataIndex];
                                return [
                                    `${item.name} (${item.symbol})`,
                                    `Countries: ${item.count}`,
                                    `Usage: ${item.percentage}%`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    r: {
                        angleLines: { color: "#ccc" },
                        grid: { color: "#eee" },
                        pointLabels: {
                            color: "#444",
                            font: { size: 12, weight: "bold" }
                        },
                        ticks: {
                            backdropColor: "transparent",
                            color: "#444",
                            font: { size: 10 }
                        }
                    }
                }
            }
        };
    }
}