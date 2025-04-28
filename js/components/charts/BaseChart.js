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
        try {
            // Show loading state
            chartUtils.displayChartLoading(this.containerId);

            // 1. First API Call: Fetch country data
            const countryData = await this.fetchData();

            // 2. Process and validate the data
            const processedData = await this.processData(countryData);
            
            // Validate processed data
            if (!this.validateProcessedData(processedData)) {
                throw new Error('Invalid data format');
            }

            // 3. Create chart configuration
            const chartConfig = this.createChartConfig(processedData);

            // Validate chart configuration
            if (!this.validateChartConfig(chartConfig)) {
                throw new Error('Invalid chart configuration');
            }

            // 4. Second API Call: Generate chart URL
            const chartUrl = chartService.createChartUrl(chartConfig);

            // 5. Display the chart
            chartUtils.displayChart(
                this.containerId,
                chartUrl,
                this.options.title || 'Chart'
            );

        } catch (error) {
            console.error('Error initializing chart:', error);
            chartUtils.displayChartError(this.containerId, 'Failed to load chart data');
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