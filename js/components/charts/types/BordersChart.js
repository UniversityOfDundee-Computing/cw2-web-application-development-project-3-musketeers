/**
 * Borders Chart Component
 * Extends BaseChart to visualize countries with the most borders
 */

import { BaseChart } from '../BaseChart.js';
import * as dataProcessing from '../../../utils/dataProcessing.js';

export class BordersChart extends BaseChart {
    /**
     * Create a new BordersChart instance
     * @param {string} containerId - The ID of the container element
     * @param {Object} options - Chart configuration options
     */
    constructor(containerId, options = {}) {
        super(containerId, {
            title: 'Top 5 Countries with Most Borders',
            type: 'bar',
            colorScheme: 'default',
            limit: 5,
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
        // Filter and map countries with borders
        const countriesWithBorders = data
            .filter(country => country.borders && country.borders.length > 0)
            .map(country => ({
                name: country.name.common,
                borderCount: country.borders.length,
                borders: country.borders
            }))
            .sort((a, b) => b.borderCount - a.borderCount)
            .slice(0, this.options.limit);

        // Create lookup for border codes to names
        const borderCodeToName = data.reduce((acc, country) => {
            if (country.cca3) {
                acc[country.cca3] = country.name.common;
            }
            return acc;
        }, {});

        return {
            labels: countriesWithBorders.map(c => c.name),
            values: countriesWithBorders.map(c => c.borderCount),
            formatted: countriesWithBorders.map(country => ({
                name: country.name,
                count: country.borderCount,
                borderingCountries: country.borders
                    .map(code => borderCodeToName[code])
                    .filter(Boolean)
                    .join(', ')
            }))
        };
    }

    /**
     * Create chart configuration for borders data
     * @param {Object} data - Processed borders data
     * @returns {Object} Chart configuration for QuickChart API
     */
    createChartConfig(data) {
        return {
            type: this.options.type,
            data: {
                labels: data.labels,
                datasets: [{
                    label: "Number of Borders",
                    data: data.values,
                    backgroundColor: [
                        "#FF6384",
                        "#36A2EB",
                        "#FFCD56",
                        "#4BC0C0",
                        "#9966FF"
                    ],
                    borderColor: "#2a2a2a",
                    borderWidth: 1.5,
                    borderRadius: 5,
                    barThickness: 30
                }]
            },
            options: {
                indexAxis: "y", // Horizontal bar chart
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: this.options.title,
                        font: {
                            size: 22,
                            weight: 'bold',
                            family: 'Arial'
                        },
                        color: '#222'
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const item = data.formatted[context.dataIndex];
                                return [
                                    `Borders: ${item.count}`,
                                    `Bordering: ${item.borderingCountries}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
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
                        grid: { display: false }
                    }
                }
            }
        };
    }
}