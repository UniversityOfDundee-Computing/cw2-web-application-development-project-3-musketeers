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
            type: 'bar', // Changed from line to bar for more reliable rendering
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
        try {
            // Safety check for data
            if (!Array.isArray(data) || data.length === 0) {
                console.error('Invalid country data received for timezone chart');
                return this.getFallbackData();
            }

            const timezoneCountMap = {};

            // Count countries per timezone
            let validTimezoneFound = false;
            
            data.forEach(country => {
                if (country && country.timezones && Array.isArray(country.timezones)) {
                    country.timezones.forEach(timezone => {
                        // Clean up timezone string to handle any formatting inconsistencies
                        const cleanedTimezone = timezone.trim();
                        
                        // Skip empty or invalid timezones
                        if (!cleanedTimezone || cleanedTimezone === 'UTC' || cleanedTimezone === 'undefined') {
                            return;
                        }
                        
                        validTimezoneFound = true;
                        timezoneCountMap[cleanedTimezone] = (timezoneCountMap[cleanedTimezone] || 0) + 1;
                    });
                }
            });

            // If no valid timezone data found, provide fallback data
            if (!validTimezoneFound || Object.keys(timezoneCountMap).length === 0) {
                console.warn('No valid timezone data found, using fallback data');
                return this.getFallbackData();
            }

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
        } catch (error) {
            console.error('Error processing timezone data:', error);
            return this.getFallbackData();
        }
    }

    /**
     * Get fallback data when timezone data is unavailable
     * @returns {Object} Fallback data for the chart
     */
    getFallbackData() {
        return {
            labels: ['UTC', 'UTC+1', 'UTC+2', 'UTC-5', 'UTC-8'],
            values: [30, 25, 20, 15, 10],
            formatted: [
                { timezone: 'UTC', count: 30, percentage: '15.00' },
                { timezone: 'UTC+1', count: 25, percentage: '12.50' },
                { timezone: 'UTC+2', count: 20, percentage: '10.00' },
                { timezone: 'UTC-5', count: 15, percentage: '7.50' },
                { timezone: 'UTC-8', count: 10, percentage: '5.00' }
            ]
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
                    backgroundColor: "rgba(54, 162, 235, 0.7)",
                    borderColor: "rgba(54, 162, 235, 1)",
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
                                if (!item) return 'No data';
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