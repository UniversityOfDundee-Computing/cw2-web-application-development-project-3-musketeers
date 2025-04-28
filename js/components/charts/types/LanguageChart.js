/**
 * Language Distribution Chart Component
 * Extends BaseChart to create language-specific visualizations
 */

import { BaseChart } from '../BaseChart.js';
import * as dataProcessing from '../../../utils/dataProcessing.js';

export class LanguageChart extends BaseChart {
    /**
     * Create a new LanguageChart instance
     * @param {string} containerId - The ID of the container element
     * @param {Object} options - Chart configuration options
     */
    constructor(containerId, options = {}) {
        super(containerId, {
            title: 'Most Common Official Languages',
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
        // Count language occurrences
        const languageCount = {};
        data.forEach(country => {
            if (country.languages) {
                Object.values(country.languages).forEach(language => {
                    languageCount[language] = (languageCount[language] || 0) + 1;
                });
            }
        });

        // Sort languages by frequency and take top N
        const sortedLanguages = Object.entries(languageCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, this.options.limit);

        // Separate into labels and values
        const labels = sortedLanguages.map(([language]) => language);
        const values = sortedLanguages.map(([_, count]) => count);
        const totalCountries = data.length;

        return {
            labels,
            values,
            formatted: labels.map((label, index) => ({
                language: label,
                count: values[index],
                percentage: dataProcessing.calculatePercentage(values[index], totalCountries)
            }))
        };
    }

    /**
     * Create chart configuration for language data
     * @param {Object} data - Processed language data
     * @returns {Object} Chart configuration for QuickChart API
     */
    createChartConfig(data) {
        return {
            type: this.options.type,
            data: {
                labels: data.labels,
                datasets: [{
                    label: "Number of Countries",
                    data: data.values,
                    backgroundColor: [
                        "#FF6384",
                        "#36A2EB",
                        "#FFCD56",
                        "#4BC0C0",
                        "#9966FF"
                    ],
                    borderColor: "#333",
                    borderWidth: 1.5,
                    borderRadius: 10,
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
                        ticks: {
                            color: "#444",
                            font: { size: 12, weight: "bold" }
                        },
                        grid: { display: false }
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