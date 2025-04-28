/**
 * Population Chart Component
 * Extends BaseChart to create population-specific visualizations
 */

import { BaseChart } from '../BaseChart.js';
import * as dataProcessing from '../../../utils/dataProcessing.js';

export class PopulationChart extends BaseChart {
    /**
     * Create a new PopulationChart instance
     * @param {string} containerId - The ID of the container element
     * @param {Object} options - Chart configuration options
     */
    constructor(containerId, options = {}) {
        super(containerId, {
            title: 'Top 5 Most Populous Countries',
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
        // Filter and sort countries by population
        const topCountries = data
            .filter(c => c.population)
            .sort((a, b) => b.population - a.population)
            .slice(0, this.options.limit);

        return {
            labels: topCountries.map(c => c.name.common),
            values: topCountries.map(c => c.population),
            formatted: topCountries.map(country => ({
                name: country.name.common,
                population: dataProcessing.formatNumber(country.population),
                flag: country.flags?.svg || null
            }))
        };
    }

    /**
     * Create chart configuration for population data
     * @param {Object} data - Processed population data
     * @returns {Object} Chart configuration for QuickChart API
     */
    createChartConfig(data) {
        return {
            type: this.options.type,
            data: {
                labels: data.labels,
                datasets: [{
                    label: "Population",
                    data: data.values,
                    backgroundColor: [
                        "#ff6384",
                        "#36a2eb",
                        "#ffcd56",
                        "#4bc0c0",
                        "#9966ff"
                    ],
                    borderColor: "#333",
                    borderWidth: 1.5,
                    borderRadius: 6,
                    barThickness: 40
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
                            size: 24,
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
                                    `Population: ${item.population}`,
                                    `${item.flag ? '🏳️' : ''} ${item.name}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            maxRotation: 0,
                            minRotation: 0,
                            color: "#444",
                            font: { size: 12, weight: "bold" }
                        },
                        grid: { display: false }
                    },
                    y: {
                        ticks: {
                            color: "#444",
                            font: { size: 12, weight: "bold" },
                            callback: value => dataProcessing.formatNumber(value)
                        },
                        grid: { color: "#eee" }
                    }
                }
            }
        };
    }
}