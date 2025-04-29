/**
 * Independence Status Chart Component
 * Extends BaseChart to visualize independent vs non-independent countries
 */

import { BaseChart } from '../BaseChart.js';
import * as dataProcessing from '../../../utils/dataProcessing.js';

export class IndependenceChart extends BaseChart {
    /**
     * Create a new IndependenceChart instance
     * @param {string} containerId - The ID of the container element
     * @param {Object} options - Chart configuration options
     */
    constructor(containerId, options = {}) {
        super(containerId, {
            title: 'Independent vs Non-Independent States',
            type: 'pie',
            chartType: 'independence', // Add chart type identifier for dynamic descriptions
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
        let independentCount = 0;
        let nonIndependentCount = 0;

        // Count independent and non-independent countries
        data.forEach(country => {
            if (country.independent === true) {
                independentCount++;
            } else {
                nonIndependentCount++;
            }
        });

        const labels = ["Independent", "Non-Independent"];
        const values = [independentCount, nonIndependentCount];
        const total = independentCount + nonIndependentCount;

        return {
            labels,
            values,
            formatted: [
                {
                    status: "Independent",
                    count: independentCount,
                    percentage: dataProcessing.calculatePercentage(independentCount, total)
                },
                {
                    status: "Non-Independent",
                    count: nonIndependentCount,
                    percentage: dataProcessing.calculatePercentage(nonIndependentCount, total)
                }
            ]
        };
    }

    /**
     * Create chart configuration for independence data
     * @param {Object} data - Processed independence data
     * @returns {Object} Chart configuration for QuickChart API
     */
    createChartConfig(data) {
        return {
            type: this.options.type,
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: ["#36A2EB", "#FF6384"],
                    borderColor: "#fff",
                    borderWidth: 1
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
                        position: "top",
                        labels: {
                            color: "#444",
                            font: {
                                size: 14,
                                weight: "bold"
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const item = data.formatted[context.dataIndex];
                                return [
                                    `${item.status}: ${item.count} countries`,
                                    `Percentage: ${item.percentage}%`
                                ];
                            }
                        }
                    }
                },
                layout: {
                    padding: {
                        top: 20,
                        bottom: 20
                    }
                }
            }
        };
    }
}