/**
 * Continent Population Chart Component
 * Extends BaseChart to create continent-specific visualizations
 */

import { BaseChart } from '../BaseChart.js';
import * as dataProcessing from '../../../utils/dataProcessing.js';

export class ContinentChart extends BaseChart {
    /**
     * Create a new ContinentChart instance
     * @param {string} containerId - The ID of the container element
     * @param {Object} options - Chart configuration options
     */
    constructor(containerId, options = {}) {
        super(containerId, {
            title: 'World Population by Continent',
            type: 'doughnut',
            colorScheme: 'default',
            chartType: 'continent', // Add chart type identifier for dynamic descriptions
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
        // Group countries by continent and sum populations
        const continentData = dataProcessing.groupAndSum(
            data,
            country => country.continents?.[0],
            country => country.population || 0
        );

        // Convert to arrays and format data
        const { labels, values } = dataProcessing.objectToArrays(continentData);

        return {
            labels,
            values,
            formatted: labels.map((label, index) => ({
                continent: label,
                population: dataProcessing.formatNumber(values[index]),
                percentage: dataProcessing.calculatePercentage(
                    values[index],
                    values.reduce((sum, val) => sum + val, 0)
                )
            }))
        };
    }

    /**
     * Create chart configuration for continent data
     * @param {Object} data - Processed continent data
     * @returns {Object} Chart configuration for QuickChart API
     */
    createChartConfig(data) {
        return {
            type: 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: [
                        "#ff6384",
                        "#36a2eb",
                        "#ffcd56",
                        "#4bc0c0",
                        "#9966ff",
                        "#ff9f40",
                        "#c9cbcf"
                    ],
                    borderColor: "#444",
                    borderWidth: 2
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
                            size: 22,
                            weight: 'bold',
                            family: 'Arial'
                        },
                        color: '#222'
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: "#444",
                            font: {
                                size: 12,
                                weight: "bold"
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const item = data.formatted[context.dataIndex];
                                return [
                                    `Population: ${item.population}`,
                                    `Percentage: ${item.percentage}%`
                                ];
                            }
                        }
                    }
                }
            }
        };
    }
}