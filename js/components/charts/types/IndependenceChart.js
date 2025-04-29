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
            supportedChartTypes: ['pie', 'doughnut', 'bar'],
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
        // Set chart type from options
        const chartType = this.options.type || 'pie';
        const isPieOrDoughnut = chartType === 'pie' || chartType === 'doughnut';
        
        // Create chart configuration
        const chartConfig = {
            type: chartType,
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
                        text: this.options.title || 'Global Independence Status',
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
                                    `Percentage: ${item.percentage}%`,
                                    // Add a sample of countries
                                    `Examples: ${this.getSampleCountries(item.countries)}`
                                ];
                            }
                        }
                    }
                }
            }
        };
        
        // Add specific configurations for bar charts
        if (chartType === 'bar') {
            chartConfig.options.scales = {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Countries'
                    }
                }
            };
            
            // For bar charts, we might want to hide or adjust the legend
            chartConfig.options.plugins.legend.display = false;
            
            // Add data labels for better readability
            chartConfig.options.plugins.datalabels = {
                color: '#444',
                font: {
                    weight: 'bold'
                },
                formatter: (value) => {
                    return value;
                }
            };
        }
        
        return chartConfig;
    }

    /**
     * Get a sample of countries to display in tooltips
     * @param {Array} countries - List of country names
     * @returns {string} Comma-separated list of sample country names
     */
    getSampleCountries(countries) {
        if (!countries || countries.length === 0) {
            return 'None';
        }
        
        // Get up to 3 random countries as examples
        const sampleSize = Math.min(3, countries.length);
        const samples = this.getRandomItems(countries, sampleSize);
        
        // Show sample countries and indicate if there are more
        if (countries.length > sampleSize) {
            return `${samples.join(', ')} and ${countries.length - sampleSize} more`;
        } else {
            return samples.join(', ');
        }
    }

    /**
     * Create chart controls for the independence chart
     * Override to add independence-specific controls
     */
    createChartControls() {
        // Create base controls (chart type)
        super.createChartControls();
        
        if (!this.chartControls) return;
        
        // Remove any controls that don't make sense for this chart
        // (Independence chart is simple with limited data, so we don't need sort or limit)
        const limitControl = this.chartControls.querySelector('.data-limit-select');
        if (limitControl) {
            const limitGroup = limitControl.closest('.form-group');
            if (limitGroup) {
                limitGroup.remove();
            }
        }
        
        const sortControl = this.chartControls.querySelector('.sort-select');
        if (sortControl) {
            const sortGroup = sortControl.closest('.form-group');
            if (sortGroup) {
                sortGroup.remove();
            }
        }
        
        // Add a visualization style toggle
        const displayGroup = document.createElement('div');
        displayGroup.className = 'form-group me-2 mb-2';
        
        const displayCheck = document.createElement('div');
        displayCheck.className = 'form-check form-switch';
        
        const displayInput = document.createElement('input');
        displayInput.className = 'form-check-input';
        displayInput.type = 'checkbox';
        displayInput.id = `${this.containerId}-show-examples`;
        displayInput.setAttribute('role', 'switch');
        displayInput.checked = this.options.showExamples || false;
        
        const displayLabel = document.createElement('label');
        displayLabel.className = 'form-check-label ms-2';
        displayLabel.htmlFor = `${this.containerId}-show-examples`;
        displayLabel.textContent = 'Show Country Examples';
        
        displayInput.addEventListener('change', (e) => {
            this.toggleExampleDisplay(e.target.checked);
        });
        
        displayCheck.appendChild(displayInput);
        displayCheck.appendChild(displayLabel);
        displayGroup.appendChild(displayCheck);
        this.chartControls.appendChild(displayGroup);
    }

    /**
     * Toggle the display of example countries in the visualization
     * @param {boolean} show - Whether to show example countries
     */
    async toggleExampleDisplay(show) {
        console.log(`[${this.containerId}] Toggling example country display: ${show}`);
        
        // Show loading overlay 
        this.showLoading();
        
        try {
            // Clean up existing chart before updating
            this.cleanupExistingChart();
            
            // Store the option
            this.options.showExamples = show;
            
            // Update the chart configuration
            const chartConfig = this.createChartConfig(this.processedData);
            
            // If showing examples, modify the chart config to include sample countries in labels
            if (show && this.processedData && this.processedData.formatted) {
                // For pie/doughnut charts, update the labels to include examples
                if (chartConfig.type === 'pie' || chartConfig.type === 'doughnut') {
                    chartConfig.data.labels = this.processedData.formatted.map(item => {
                        const examples = this.getSampleCountries(item.countries);
                        return `${item.status === "Independent" ? "Sovereign Nations" : "Dependent Territories"} (${examples})`;
                    });
                }
                
                // For all chart types, update the tooltips
                if (chartConfig.options && chartConfig.options.plugins && chartConfig.options.plugins.tooltip) {
                    chartConfig.options.plugins.tooltip.callbacks.label = (context) => {
                        const item = this.processedData.formatted[context.dataIndex];
                        if (!item) return 'No data';
                        
                        const examples = this.getSampleCountries(item.countries);
                        return [
                            `Count: ${item.count} countries`,
                            `Percentage: ${item.percentage}%`,
                            `Examples: ${examples}`
                        ];
                    };
                }
            }
            
            // Generate chart URL
            const chartUrl = chartService.createChartUrl(chartConfig);
            
            // Update the chart
            chartUtils.displayChart(
                this.containerId,
                chartUrl,
                this.options.title || 'Chart'
            );
            
            // Update descriptions
            const descriptions = this.generateDescriptions(this.processedData);
            this.updateChartDescriptions(descriptions);
        } catch (error) {
            console.error(`[${this.containerId}] Error toggling example display:`, error);
            this.showError(`Failed to update display: ${error.message}`);
        }
    }

    /**
     * Override the change chart type method to ensure proper cleanup and loading
     * @param {string} newType - The new chart type to use
     */
    async changeChartType(newType) {
        if (this.supportedChartTypes.includes(newType)) {
            console.log(`[${this.containerId}] Changing chart type to ${newType}...`);
            
            // Show loading overlay
            this.showLoading();
            
            try {
                // Clean up existing chart before updating
                this.cleanupExistingChart();
                
                // Update options
                this.options.type = newType;
                
                // Create new chart configuration with the new type
                const chartConfig = this.createChartConfig(this.processedData);
                
                // Force the chart type to be the selected type
                chartConfig.type = newType;
                
                // Generate chart URL
                const chartUrl = chartService.createChartUrl(chartConfig);
                
                // Update the chart
                chartUtils.displayChart(
                    this.containerId,
                    chartUrl,
                    this.options.title || 'Chart'
                );
                
                // Update descriptions
                const descriptions = this.generateDescriptions(this.processedData);
                this.updateChartDescriptions(descriptions);
                
                console.log(`[${this.containerId}] Chart type changed successfully to ${newType}.`);
            } catch (error) {
                console.error(`[${this.containerId}] Error changing chart type:`, error);
                this.showError(`Failed to change chart type: ${error.message}`);
            }
        }
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
        
        // Chart type description
        const chartType = this.options.type || 'pie';
        const chartTypeDesc = chartType === 'pie' || chartType === 'doughnut' ? 
            `${chartType} chart` : `${chartType} chart`;
        
        const title = 'Global Independence Status';
        const shortDesc = `This ${chartTypeDesc} illustrates the global distribution of sovereign nations versus dependent territories.`;
        
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
        ].filter(insight => insight);
        
        return {
            title: title,
            short: shortDesc,
            detailed: detailedDesc,
            analysis: analysisText,
            insights: insights
        };
    }

    /**
     * Override the base class method to ensure we use our specific implementation
     */
    generateDescriptions(data) {
        return this.generateIndependenceDescriptions(data);
    }
}