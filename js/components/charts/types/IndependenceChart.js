/**
 * Independence Status Chart Component
 * Extends BaseChart to visualize independent vs non-independent countries
 */

import { BaseChart } from '../BaseChart.js';
import * as dataProcessing from '../../../utils/dataProcessing.js';
import { chartService } from '../../../services/chartService.js';
import * as chartUtils from '../../../utils/chartUtils.js';

export class IndependenceChart extends BaseChart {
    /**
     * Create a new IndependenceChart instance
     * @param {string} containerId - The ID of the container element
     * @param {Object} options - Chart configuration options
     */
    constructor(containerId, options = {}) {
        super(containerId, {
            title: 'Global Independence Status',
            type: 'pie',
            chartType: 'independence',
            ...options
        });
    }

    /**
     * Process the raw country data into chart-ready format
     * @param {Array} data - Raw country data from REST Countries API
     * @returns {Object} Processed data ready for chart creation
     */
    async processData(data) {
        // Safety check for data
        if (!Array.isArray(data) || data.length === 0) {
            console.error('Invalid country data received for independence chart');
            return { labels: [], values: [], formatted: [] };
        }
        
        // Count independent and non-independent countries
        let independentCount = 0;
        let nonIndependentCount = 0;
        
        // Keep track of countries for more detailed analysis
        const independentCountries = [];
        const nonIndependentCountries = [];
        
        data.forEach(country => {
            if (country.independent === true) {
                independentCount++;
                independentCountries.push(country.name.common);
            } else {
                nonIndependentCount++;
                nonIndependentCountries.push(country.name.common);
            }
        });
        
        const labels = ["Sovereign Nations", "Dependent Territories"];
        const values = [independentCount, nonIndependentCount];
        const total = independentCount + nonIndependentCount;
        
        return {
            labels,
            values,
            formatted: [
                {
                    status: "Independent",
                    count: independentCount,
                    percentage: dataProcessing.calculatePercentage(independentCount, total),
                    countries: independentCountries
                },
                {
                    status: "Non-Independent",
                    count: nonIndependentCount,
                    percentage: dataProcessing.calculatePercentage(nonIndependentCount, total),
                    countries: nonIndependentCountries
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
            type: 'pie',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: [
                        "#36a2eb",  // Blue for sovereign nations
                        "#ff6384",  // Pink for dependent territories
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
                                if (!item) return 'No data';
                                
                                return [
                                    `Count: ${item.count} countries`,
                                    `Percentage: ${item.percentage}%`
                                ];
                            }
                        }
                    }
                }
            }
        };
    }

    /**
     * Override the createChartControls method to not add any controls
     */
    createChartControls() {
        // Don't create any chart controls
        this.chartControls = null;
    }

    /**
     * Generate independence-specific chart descriptions with improved analysis
     * @param {Object} data - Processed chart data
     * @returns {Object} Independence-specific descriptions
     */
    generateIndependenceDescriptions(data) {
        // Find independent vs non-independent counts
        const independentData = data.formatted.find(item => item.status === "Independent");
        const nonIndependentData = data.formatted.find(item => item.status === "Non-Independent");
        
        const independentCount = independentData ? independentData.count : 0;
        const nonIndependentCount = nonIndependentData ? nonIndependentData.count : 0;
        const totalCount = independentCount + nonIndependentCount;
        
        // Calculate percentage
        const independentPercent = independentData ? independentData.percentage : 0;
        const nonIndependentPercent = nonIndependentData ? nonIndependentData.percentage : 0;
        
        // Get some example countries for insights
        const exampleIndependent = independentData && independentData.countries ? 
            this.getRandomItems(independentData.countries, 3) : [];
        const exampleNonIndependent = nonIndependentData && nonIndependentData.countries ? 
            this.getRandomItems(nonIndependentData.countries, 3) : [];
        
        const title = 'Global Independence Status';
        const shortDesc = `This visualization illustrates the global distribution of sovereign nations versus dependent territories.`;
        
        const detailedDesc = `The chart displays the independence status of ${totalCount} countries and territories worldwide. ` +
            `${independentCount} (${independentPercent}%) are recognized as sovereign independent states with full autonomy, ` +
            `while ${nonIndependentCount} (${nonIndependentPercent}%) are dependent territories with varying degrees of autonomy.`;
        
        const analysisText = `Analysis of global sovereignty status reveals that the vast majority (${independentPercent}%) of the world's political entities are independent nations. ` + 
            `This distribution reflects the profound impact of decolonization movements throughout the 20th century, particularly following World War II when numerous former colonies gained independence. ` +
            `Most remaining dependent territories maintain special relationships with larger sovereign states, often retaining autonomy over local affairs while relying on the sovereign power for defense and foreign relations.`;
        
        const insights = [
            `${independentCount} nations (${independentPercent}%) are internationally recognized sovereign states with their own governments, laws, and representation in international bodies.`,
            `${nonIndependentCount} territories (${nonIndependentPercent}%) maintain various forms of dependency relationships, including overseas territories, autonomous regions, and protectorates.`,
            exampleIndependent.length > 0 ? `Example sovereign nations include ${exampleIndependent.join(', ')}.` : '',
            exampleNonIndependent.length > 0 ? `Notable dependent territories include ${exampleNonIndependent.join(', ')}.` : '',
            'Sovereign states typically maintain control over their defense, foreign affairs, citizenship, and monetary policy.',
            'Many dependent territories enjoy significant internal autonomy while benefiting from security guarantees and economic support from their governing state.'
        ];
        
        return {
            title: title,
            short: shortDesc,
            detailed: detailedDesc,
            analysis: analysisText,
            insights: insights.filter(insight => insight)
        };
    }

    /**
     * Helper method to get random items from an array
     * @param {Array} array - The array to get random items from
     * @param {number} count - Number of random items to get
     * @returns {Array} Array of random items
     */
    getRandomItems(array, count) {
        if (!array || array.length <= count) {
            return array || [];
        }
        
        const shuffled = [...array].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    /**
     * Override the base class method to ensure we use our independence-specific description generator
     */
    generateDescriptions(data) {
        return this.generateIndependenceDescriptions(data);
    }
}