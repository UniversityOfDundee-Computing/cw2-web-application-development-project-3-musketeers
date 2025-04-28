/**
 * Region Distribution Chart Component
 * Extends BaseChart to create region-specific visualizations
 */

import { BaseChart } from '../BaseChart.js';
import * as dataProcessing from '../../../utils/dataProcessing.js';

export class RegionChart extends BaseChart {
    /**
     * Create a new RegionChart instance
     * @param {string} containerId - The ID of the container element
     * @param {Object} options - Chart configuration options
     */
    constructor(containerId, options = {}) {
        super(containerId, {
            title: 'Number of Countries per Region',
            type: 'bar',
            colorScheme: 'default',
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
        // Count countries per region
        const regionCount = dataProcessing.groupAndCount(
            data,
            country => country.region || "Unknown"
        );

        // Convert to arrays
        const { labels, values } = dataProcessing.objectToArrays(regionCount);

        const totalCountries = values.reduce((sum, count) => sum + count, 0);

        return {
            labels,
            values,
            formatted: labels.map((label, index) => ({
                region: label,
                count: values[index],
                percentage: dataProcessing.calculatePercentage(values[index], totalCountries)
            }))
        };
    }

    /**
     * Create chart configuration for region data
     * @param {Object} data - Processed region data
     * @returns {Object} Chart configuration for QuickChart API
     */
    createChartConfig(data) {
        const colors = [
            "#ff6384",
            "#36a2eb",
            "#ffcd56",
            "#4bc0c0",
            "#9966ff",
            "#f77825",
            "#8dc63f",
            "#c9cbcf"
        ];

        return {
            type: this.options.type,
            data: {
                labels: data.labels,
                datasets: [{
                    label: "Number of Countries",
                    data: data.values,
                    backgroundColor: colors.slice(0, data.labels.length),
                    borderColor: "#2a2a2a",
                    borderWidth: 1.5,
                    borderRadius: 5,
                    barThickness: 30
                }]
            },
            options: {
                indexAxis: 'y', // Horizontal bars
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
                                    `Countries: ${item.count}`,
                                    `Percentage: ${item.percentage}%`
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