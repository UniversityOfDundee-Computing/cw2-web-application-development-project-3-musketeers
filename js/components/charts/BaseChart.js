/**
 * Base Chart Component
 * Provides common functionality for all chart types
 */

import { countryService } from '../../services/countryService.js';
import { chartService } from '../../services/chartService.js';
import * as chartUtils from '../../utils/chartUtils.js';
import * as dataProcessing from '../../utils/dataProcessing.js';

export class BaseChart {
    /**
     * @param {string} containerId - The ID of the container element
     * @param {Object} options - Chart configuration options
     */
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = options;
        this.container = document.getElementById(containerId);
        this.chartType = options.chartType || 'default';
        this.autoRefreshInterval = options.autoRefreshInterval || 60000; // Default to 1 minute
        this.refreshTimer = null;
        
        if (!this.container) {
            throw new Error(`Container element with ID '${containerId}' not found`);
        }
    }

    /**
     * Initialize the chart
     * Method 2 API Implementation:
     * 1. Fetch data from REST Countries API
     * 2. Process the data
     * 3. Create chart configuration
     * 4. Generate chart URL using QuickChart API
     * 5. Display the chart
     */
    async initialize() {
        console.log(`[${this.containerId}] Initializing chart...`);
        try {
            // Show loading state
            console.log(`[${this.containerId}] Displaying loading state.`);
            chartUtils.displayChartLoading(this.containerId);

            // 1. First API Call: Fetch country data
            console.log(`[${this.containerId}] Fetching data...`);
            const countryData = await this.fetchData();
            console.log(`[${this.containerId}] Data fetched successfully.`, countryData ? countryData.length : 0, 'items');

            // 2. Process and validate the data
            console.log(`[${this.containerId}] Processing data...`);
            const processedData = await this.processData(countryData);
            console.log(`[${this.containerId}] Data processed successfully.`, processedData);
            
            // Validate processed data
            if (!this.validateProcessedData(processedData)) {
                console.error(`[${this.containerId}] Invalid processed data format.`, processedData);
                throw new Error('Invalid data format after processing');
            }
            console.log(`[${this.containerId}] Processed data validated.`);

            // 3. Create chart configuration
            console.log(`[${this.containerId}] Creating chart config...`);
            const chartConfig = this.createChartConfig(processedData);
            console.log(`[${this.containerId}] Chart config created.`, chartConfig);

            // Validate chart configuration
            if (!this.validateChartConfig(chartConfig)) {
                console.error(`[${this.containerId}] Invalid chart configuration.`, chartConfig);
                throw new Error('Invalid chart configuration');
            }
            console.log(`[${this.containerId}] Chart config validated.`);

            // 4. Generate dynamic descriptions based on the processed data
            console.log(`[${this.containerId}] Generating dynamic descriptions...`);
            const descriptions = this.generateDescriptions(processedData);
            console.log(`[${this.containerId}] Descriptions generated:`, descriptions);

            // 5. Update chart descriptions in the DOM before displaying the chart
            console.log(`[${this.containerId}] Updating chart descriptions...`);
            this.updateChartDescriptions(descriptions);
            console.log(`[${this.containerId}] Chart descriptions updated.`);

            // 6. Second API Call: Generate chart URL
            console.log(`[${this.containerId}] Generating chart URL...`);
            const chartUrl = chartService.createChartUrl(chartConfig);
            console.log(`[${this.containerId}] Chart URL generated:`, chartUrl);
            
            // 7. Display the chart
            console.log(`[${this.containerId}] Displaying chart...`);
            chartUtils.displayChart(
                this.containerId,
                chartUrl,
                this.options.title || 'Chart'
            );
            console.log(`[${this.containerId}] Chart display initiated.`);
            
            // 8. Set up auto-refresh for live updates
            this.setupAutoRefresh();

        } catch (error) {
            console.error(`[${this.containerId}] Error initializing chart:`, error);
            chartUtils.displayChartError(this.containerId, `Failed to load chart: ${error.message}`);
        }
    }
    
    /**
     * Set up auto-refresh for live updates of chart data and descriptions
     */
    setupAutoRefresh() {
        // Clear any existing timer
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        
        // Set up a new timer to periodically refresh the chart
        this.refreshTimer = setInterval(async () => {
            console.log(`[${this.containerId}] Auto-refreshing chart data...`);
            try {
                // Fetch fresh data
                const freshData = await this.fetchData();
                
                // Process the data
                const processedData = await this.processData(freshData);
                
                // Generate new descriptions
                const descriptions = this.generateDescriptions(processedData);
                
                // Update descriptions in the DOM
                this.updateChartDescriptions(descriptions);
                
                console.log(`[${this.containerId}] Chart descriptions auto-refreshed.`);
                
                // Create new chart configuration and update the chart if needed
                const chartConfig = this.createChartConfig(processedData);
                const chartUrl = chartService.createChartUrl(chartConfig);
                
                // Update the chart image
                chartUtils.displayChart(
                    this.containerId,
                    chartUrl,
                    this.options.title || 'Chart'
                );
                
            } catch (error) {
                console.error(`[${this.containerId}] Error during auto-refresh:`, error);
                // Don't show error to user, just log it - auto-refresh should be non-intrusive
            }
        }, this.autoRefreshInterval);
        
        console.log(`[${this.containerId}] Auto-refresh set up with interval of ${this.autoRefreshInterval}ms`);
    }
    
    /**
     * Clean up resources when the chart is no longer needed
     */
    destroy() {
        // Clear auto-refresh timer
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
            console.log(`[${this.containerId}] Auto-refresh timer cleared.`);
        }
    }

    /**
     * Fetch data from the REST Countries API
     * Override this method in specific chart implementations if needed
     * @returns {Promise<Array>} Array of country data
     */
    async fetchData() {
        return await countryService.getAllCountries();
    }

    /**
     * Process the raw data into chart-ready format
     * Must be implemented by specific chart classes
     * @param {Array} data - Raw data from API
     * @returns {Object} Processed data ready for chart creation
     */
    async processData(data) {
        throw new Error('processData method must be implemented by child class');
    }

    /**
     * Create chart configuration
     * Must be implemented by specific chart classes
     * @param {Object} data - Processed data
     * @returns {Object} Chart configuration
     */
    createChartConfig(data) {
        throw new Error('createChartConfig method must be implemented by child class');
    }
    
    /**
     * Generate dynamic descriptions based on the chart data
     * @param {Object} data - Processed chart data
     * @returns {Object} Object containing various description elements
     */
    generateDescriptions(data) {
        // Default implementation uses the dataProcessing utility
        return dataProcessing.generateChartDescription(this.chartType, data, this.options);
    }
    
    /**
     * Update chart descriptions in the DOM
     * @param {Object} descriptions - Description object with various text elements
     */
    updateChartDescriptions(descriptions) {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        // Update basic description
        const descElem = container.querySelector('.chart-description');
        if (descElem && descriptions.short) {
            descElem.textContent = descriptions.short;
        }
        
        // Update detailed analysis
        const analysisElem = container.querySelector('.chart-detail-analysis');
        if (analysisElem) {
            // Update heading
            const heading = analysisElem.querySelector('h4');
            if (heading) {
                heading.textContent = `${this.options.title || 'Chart'} Analysis`;
            }
            
            // Update full description
            const fullDesc = analysisElem.querySelector('p');
            if (fullDesc && descriptions.full) {
                fullDesc.textContent = descriptions.full;
            }
            
            // Update insights
            const insightsList = analysisElem.querySelector('.analysis-data ul');
            if (insightsList && descriptions.insights && Array.isArray(descriptions.insights)) {
                insightsList.innerHTML = '';
                descriptions.insights.forEach(insight => {
                    const li = document.createElement('li');
                    li.textContent = insight;
                    insightsList.appendChild(li);
                });
            }
            
            // Update related metrics
            const relatedMetrics = analysisElem.querySelector('.analysis-data p:not(:first-child)');
            if (relatedMetrics && descriptions.relatedMetrics) {
                relatedMetrics.textContent = descriptions.relatedMetrics;
            }
            
            // Update source
            const source = analysisElem.querySelector('.data-source');
            if (source && descriptions.source) {
                source.textContent = `Data sources: ${descriptions.source}`;
            }
        }
        
        // Update hover overlay
        const overlayElem = container.querySelector('.chart-detail-overlay');
        if (overlayElem) {
            const overlayDesc = overlayElem.querySelector('p');
            if (overlayDesc && descriptions.full) {
                overlayDesc.textContent = descriptions.full;
            }
        }
        
        // Remove any existing last-updated timestamp
        const existingTimestamp = container.querySelector('.last-updated');
        if (existingTimestamp) {
            existingTimestamp.remove();
        }
    }

    /**
     * Validate processed data structure
     * @param {Object} data - Processed data to validate
     * @returns {boolean} True if data is valid
     */
    validateProcessedData(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }

        // Check for required properties
        const requiredProps = ['labels', 'values'];
        return requiredProps.every(prop =>
            Array.isArray(data[prop]) && data[prop].length > 0
        );
    }

    /**
     * Validate chart configuration
     * @param {Object} config - Chart configuration to validate
     * @returns {boolean} True if configuration is valid
     */
    validateChartConfig(config) {
        if (!config || typeof config !== 'object') {
            return false;
        }

        // Check required chart configuration properties
        return (
            config.type &&
            config.data &&
            Array.isArray(config.data.labels) &&
            Array.isArray(config.data.datasets) &&
            config.data.datasets.length > 0 &&
            config.options
        );
    }

    /**
     * Update the chart with new data
     * @param {Object} newData - New data to update the chart with
     */
    async update(newData) {
        try {
            const processedData = await this.processData(newData);
            const chartConfig = this.createChartConfig(processedData);
            const chartUrl = chartService.createChartUrl(chartConfig);
            
            // Generate new descriptions
            const descriptions = this.generateDescriptions(processedData);
            
            // Update descriptions in the DOM
            this.updateChartDescriptions(descriptions);
            
            chartUtils.displayChart(
                this.containerId,
                chartUrl,
                this.options.title || 'Chart'
            );
        } catch (error) {
            console.error('Error updating chart:', error);
            chartUtils.displayChartError(this.containerId, 'Failed to update chart');
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        chartUtils.displayChartLoading(this.containerId);
    }

    /**
     * Show error state
     * @param {string} message - Error message to display
     */
    showError(message) {
        chartUtils.displayChartError(this.containerId, message);
    }
}