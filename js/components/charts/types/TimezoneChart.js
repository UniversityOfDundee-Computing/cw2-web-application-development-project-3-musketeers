/**
 * Timezone Chart Component
 * Extends BaseChart to visualize timezone distribution across countries
 */

import { BaseChart } from '../BaseChart.js';
import * as dataProcessing from '../../../utils/dataProcessing.js';

export class TimezoneChart extends BaseChart {
    /**
     * Create a new TimezoneChart instance
     * @param {string} containerId - The ID of the container element
     * @param {Object} options - Chart configuration options
     */
    constructor(containerId, options = {}) {
        super(containerId, {
            title: 'Countries per Timezone (Top 5)',
            type: 'line',
            colorScheme: 'blue',
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
        const timezoneCountMap = {};

        // Count countries per timezone
        data.forEach(country => {
            if (country.timezones) {
                country.timezones.forEach(timezone => {
                    timezoneCountMap[timezone] = (timezoneCountMap[timezone] || 0) + 1;
                });
            }
        });

        // Sort and get top timezones
        const sortedTimezones = Object.entries(timezoneCountMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, this.options.limit);

        // Split into labels and values
        const labels = sortedTimezones.map(([timezone]) => timezone);
        const values = sortedTimezones.map(([_, count]) => count);

        const totalCountries = data.length;

        return {
            labels,
            values,
            formatted: labels.map((timezone, index) => ({
                timezone,
                count: values[index],
                percentage: dataProcessing.calculatePercentage(values[index], totalCountries)
            }))
        };
    }

    /**
     * Create chart configuration for timezone data
     * @param {Object} data - Processed timezone data
     * @returns {Object} Chart configuration for QuickChart API
     */
    createChartConfig(data) {
        return {
            type: this.options.type,
            data: {
                labels: data.labels,
                datasets: [{
                    label: "Countries per Timezone",
                    data: data.values,
                    backgroundColor: "rgba(54, 162, 235, 0.2)",
                    borderColor: "rgba(54, 162, 235, 1)",
                    borderWidth: 2,
                    fill: true,  // Enable area fill
                    pointBackgroundColor: "#36a2eb",
                    pointRadius: 5,
                    pointHoverBackgroundColor: "#fff",
                    pointHoverBorderColor: "#36a2eb",
                    tension: 0.4 // Smooth curve
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
                            weight: "bold",
                            family: "Arial"
                        },
                        color: "#222"
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const item = data.formatted[context.dataIndex];
                                return [
                                    `Timezone: ${item.timezone}`,
                                    `Countries: ${item.count}`,
                                    `Percentage: ${item.percentage}%`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: "#444",
                            font: { size: 12, weight: "bold" },
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: { color: "#eee" }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: "#444",
                            font: { size: 12, weight: "bold" }
                        },
                        grid: { color: "#eee" }
                    }
                }
            }
        };
    }
}