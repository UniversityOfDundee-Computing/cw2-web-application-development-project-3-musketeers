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
        this.rawData = null; // Store raw data for filtering/sorting
        this.processedData = null; // Store processed data
        this.chartControls = null; // Controls panel element
        this.supportedChartTypes = options.supportedChartTypes || ['bar', 'pie', 'doughnut', 'polarArea'];
        this.defaultChartType = options.type || 'bar';
        this.chartInstance = null;
        this.isLoading = false;
        this.timers = [];
        
        if (!this.container) {
            throw new Error(`Container element with ID '${containerId}' not found`);
        }

        // Add observer to watch for expanded state changes
        this.setupExpandedStateObserver();
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
            // Check if loading indicator already exists in the HTML
            const container = document.getElementById(this.containerId);
            const wrapper = container.querySelector('.chart-wrapper');
            const existingLoadingIndicator = container.querySelector('.chart-loading') || (wrapper && wrapper.querySelector('.chart-loading'));
            
            if (!existingLoadingIndicator) {
                // Only show loading state if not already present in the HTML
                console.log(`[${this.containerId}] Displaying loading state.`);
                chartUtils.displayChartLoading(this.containerId);
            } else {
                console.log(`[${this.containerId}] Using existing loading indicator in HTML.`);
            }

            // 1. First API Call: Fetch country data
            console.log(`[${this.containerId}] Fetching data...`);
            this.rawData = await this.fetchData();
            console.log(`[${this.containerId}] Data fetched successfully.`, this.rawData ? this.rawData.length : 0, 'items');

            // 2. Process and validate the data
            console.log(`[${this.containerId}] Processing data...`);
            this.processedData = await this.processData(this.rawData);
            console.log(`[${this.containerId}] Data processed successfully.`, this.processedData);
            
            // Validate processed data
            if (!this.validateProcessedData(this.processedData)) {
                console.error(`[${this.containerId}] Invalid processed data format.`, this.processedData);
                throw new Error('Invalid data format after processing');
            }
            console.log(`[${this.containerId}] Processed data validated.`);

            // 3. Create chart configuration
            console.log(`[${this.containerId}] Creating chart config...`);
            const chartConfig = this.createChartConfig(this.processedData);
            console.log(`[${this.containerId}] Chart config created.`, chartConfig);

            // Validate chart configuration
            if (!this.validateChartConfig(chartConfig)) {
                console.error(`[${this.containerId}] Invalid chart configuration.`, chartConfig);
                throw new Error('Invalid chart configuration');
            }
            console.log(`[${this.containerId}] Chart config validated.`);

            // 4. Generate dynamic descriptions based on the processed data
            console.log(`[${this.containerId}] Generating dynamic descriptions...`);
            const descriptions = this.generateDescriptions(this.processedData);
            console.log(`[${this.containerId}] Descriptions generated:`, descriptions);

            // 5. Update chart descriptions in the DOM before displaying the chart
            console.log(`[${this.containerId}] Updating chart descriptions...`);
            this.updateChartDescriptions(descriptions);
            console.log(`[${this.containerId}] Chart descriptions updated.`);

            // 5.5 Create chart controls (but don't add them to DOM yet - will be added on expand)
            console.log(`[${this.containerId}] Creating chart controls...`);
            this.createChartControls();
            console.log(`[${this.containerId}] Chart controls created.`);

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
     * Set up observer to watch for expanded state changes
     */
    setupExpandedStateObserver() {
        // Create a MutationObserver to watch for class changes on the container
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                if (mutation.attributeName === 'class') {
                    const isExpanded = this.container.classList.contains('expanded');
                    if (isExpanded) {
                        this.onChartExpanded();
                    } else {
                        this.onChartCollapsed();
                    }
                }
            });
        });

        // Start observing the container for class changes
        observer.observe(this.container, { attributes: true });
    }

    /**
     * Handle chart expanded state
     */
    onChartExpanded() {
        console.log(`[${this.containerId}] Chart expanded. Adding controls.`);
        // Add controls when chart is expanded
        this.addChartControls();
        
        // Add event listeners to prevent chart controls from closing the expanded chart
        if (this.chartControls) {
            this.chartControls.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            // Add event listeners to all select elements in the controls
            const selectElements = this.chartControls.querySelectorAll('select');
            selectElements.forEach(select => {
                select.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
                select.addEventListener('change', (e) => {
                    e.stopPropagation();
                });
            });
        }
    }

    /**
     * Handle chart collapsed state
     */
    onChartCollapsed() {
        console.log(`[${this.containerId}] Chart collapsed. Removing controls.`);
        // Remove controls when chart is collapsed
        this.removeChartControls();
    }
    
    /**
     * Create chart controls but don't add them to the DOM yet
     */
    createChartControls() {
        // Create controls container if it doesn't exist
        if (!this.chartControls) {
            // Create controls container
            this.chartControls = document.createElement('div');
            this.chartControls.className = 'chart-controls d-flex flex-wrap align-items-center justify-content-between mb-3 p-2 bg-light rounded';
            
            // Create chart type selector
            const chartTypeGroup = document.createElement('div');
            chartTypeGroup.className = 'form-group me-2 mb-2';
            
            const chartTypeLabel = document.createElement('label');
            chartTypeLabel.className = 'me-2 fw-bold';
            chartTypeLabel.textContent = 'Chart Type:';
            chartTypeGroup.appendChild(chartTypeLabel);
            
            const chartTypeSelect = document.createElement('select');
            chartTypeSelect.className = 'form-select form-select-sm chart-type-select';
            chartTypeSelect.setAttribute('aria-label', 'Select chart type');
            
            // Make sure we're using the current chart type
            const currentChartType = this.options.type || this.defaultChartType;
            console.log(`[${this.containerId}] Creating chart controls with current type: ${currentChartType}`);
            
            this.supportedChartTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
                // Check against the current type to select the right option
                if (type === currentChartType) {
                    option.selected = true;
                    console.log(`[${this.containerId}] Setting selected option to: ${type}`);
                }
                chartTypeSelect.appendChild(option);
            });
            
            chartTypeSelect.addEventListener('change', (e) => {
                this.changeChartType(e.target.value);
            });
            
            chartTypeGroup.appendChild(chartTypeSelect);
            this.chartControls.appendChild(chartTypeGroup);
            
            // Create data limit selector
            /*
            const limitGroup = document.createElement('div');
            limitGroup.className = 'form-group me-2 mb-2';
            
            const limitLabel = document.createElement('label');
            limitLabel.className = 'me-2 fw-bold';
            limitLabel.textContent = 'Show:';
            limitGroup.appendChild(limitLabel);
            
            const limitSelect = document.createElement('select');
            limitSelect.className = 'form-select form-select-sm data-limit-select';
            limitSelect.setAttribute('aria-label', 'Select number of items to display');
            
            [5, 10, 15, 20].forEach(limit => {
                const option = document.createElement('option');
                option.value = limit;
                option.textContent = `${limit} items`;
                if (limit === (this.options.limit || 5)) {
                    option.selected = true;
                }
                limitSelect.appendChild(option);
            });
            
            limitSelect.addEventListener('change', (e) => {
                this.changeDataLimit(parseInt(e.target.value, 10));
            });
            
            limitGroup.appendChild(limitSelect);
            this.chartControls.appendChild(limitGroup);
            */
            
            // Create sort order selector
            const sortGroup = document.createElement('div');
            sortGroup.className = 'form-group mb-2';
            
            const sortLabel = document.createElement('label');
            sortLabel.className = 'me-2 fw-bold';
            sortLabel.textContent = 'Sort:';
            sortGroup.appendChild(sortLabel);
            
            const sortSelect = document.createElement('select');
            sortSelect.className = 'form-select form-select-sm sort-select';
            sortSelect.setAttribute('aria-label', 'Select sort order');
            
            const sortOptions = [
                { value: 'desc', text: 'Highest first' },
                { value: 'asc', text: 'Lowest first' }
            ];
            
            sortOptions.forEach(option => {
                const optionEl = document.createElement('option');
                optionEl.value = option.value;
                optionEl.textContent = option.text;
                if (option.value === (this.options.sort || 'desc')) {
                    optionEl.selected = true;
                }
                sortSelect.appendChild(optionEl);
            });
            
            sortSelect.addEventListener('change', (e) => {
                this.changeSortOrder(e.target.value);
            });
            
            sortGroup.appendChild(sortSelect);
            this.chartControls.appendChild(sortGroup);
        }
    }

    /**
     * Add controls to allow users to customize the chart
     */
    addChartControls() {
        const chartContent = this.container.querySelector('.chart-content');
        if (!chartContent || !this.chartControls) return;
        
        // Check if controls are already added
        if (!chartContent.contains(this.chartControls)) {
            // Insert controls before the chart title
            chartContent.insertBefore(this.chartControls, chartContent.firstChild);
        }
    }
    
    /**
     * Remove chart controls from DOM
     */
    removeChartControls() {
        if (this.chartControls && this.chartControls.parentNode) {
            this.chartControls.parentNode.removeChild(this.chartControls);
        }
    }
    
    /**
     * Change the chart type and update the visualization
     * @param {string} newType - New chart type ('bar', 'pie', etc.)
     */
    async changeChartType(newType) {
        if (this.supportedChartTypes.includes(newType)) {
            console.log(`[${this.containerId}] Changing chart type to ${newType}...`);
            
            // First remove existing images so loading indicator is visible
            const container = document.getElementById(this.containerId);
            const wrapper = container.querySelector('.chart-wrapper');
            const images = wrapper ? wrapper.querySelectorAll('.chart-image') : [];
            
            // Remove images immediately to prevent them from covering the loading indicator
            images.forEach(img => img.remove());
                
            // Show loading overlay with clear visibility
            chartUtils.displayChartLoading(this.containerId, `Switching to ${newType} chart...`);
            
            // Update options
            this.options.type = newType;
            
            try {
                // Add a small delay to ensure the loading animation is visible
                await new Promise(resolve => setTimeout(resolve, 150));
                
                // Store the original title to preserve it after chart type change
                const originalTitle = this.options.title;
                
                // Re-process data to ensure correct formatting for the new chart type
                if (this.rawData) {
                    this.processedData = await this.processData(this.rawData);
                }
                
                // Create new chart configuration that explicitly uses the new chart type
                const chartConfig = this.createChartConfig(this.processedData);
                
                // Force the chart type to be the selected type
                chartConfig.type = newType;
                
                // Ensure the title is preserved
                if (chartConfig.options && chartConfig.options.plugins && chartConfig.options.plugins.title) {
                    chartConfig.options.plugins.title.text = originalTitle;
                }
                
                // Apply specific formatting for this chart type
                this.formatLabelsForChartType(chartConfig, newType);
                
                // Generate chart URL
                const chartUrl = chartService.createChartUrl(chartConfig);
                
                // Update the chart - loading indicator will be hidden after image loads
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
                chartUtils.displayChartError(this.containerId, `Failed to change chart type: ${error.message}`);
            }
        }
    }
    
    /**
     * Format labels according to chart type requirements
     * @param {Object} chartConfig - The chart configuration
     * @param {string} chartType - The chart type
     */
    formatLabelsForChartType(chartConfig, chartType) {
        if (!chartConfig || !chartConfig.data || !chartConfig.data.labels) {
            return;
        }
        
        // Handle specific chart type requirements
        if (chartType === 'pie' || chartType === 'doughnut' || chartType === 'polarArea') {
            // For non-cartesian charts, ensure scales are removed if they exist
            if (chartConfig.options && chartConfig.options.scales) {
                delete chartConfig.options.scales;
            }
            
            // Enable legend for pie/doughnut charts
            if (chartConfig.options && chartConfig.options.plugins && chartConfig.options.plugins.legend) {
                chartConfig.options.plugins.legend.display = true;
                chartConfig.options.plugins.legend.position = 'right';
            }
        } else if (chartType === 'bar' || chartType === 'line') {
            // Make sure cartesian charts have appropriate scales
            if (chartConfig.options && !chartConfig.options.scales) {
                chartConfig.options.scales = {
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
                };
            }
            
            // For bar chart, keep legend disabled unless specifically required
            if (chartConfig.options && chartConfig.options.plugins && chartConfig.options.plugins.legend) {
                chartConfig.options.plugins.legend.display = chartType !== 'bar';
            }
        }
        
        // Make sure labels aren't truncated
        if (chartType === 'bar' && chartConfig.options && chartConfig.options.scales && chartConfig.options.scales.x) {
            chartConfig.options.scales.x.ticks = {
                ...chartConfig.options.scales.x.ticks,
                maxRotation: 45,
                minRotation: 0
            };
        }
    }
    
    /**
     * Change the number of data items to display
     * @param {number} limit - Number of items to display
     */
    async changeDataLimit(limit) {
        if (!isNaN(limit) && limit > 0) {
            console.log(`[${this.containerId}] Changing data limit to ${limit}...`);
            
            // First remove existing images so loading indicator is visible
            const container = document.getElementById(this.containerId);
            const wrapper = container.querySelector('.chart-wrapper');
            const images = wrapper ? wrapper.querySelectorAll('.chart-image') : [];
            
            // Remove images immediately to prevent them from covering the loading indicator
            images.forEach(img => img.remove());
            
            // Show loading overlay with clear visibility
            chartUtils.displayChartLoading(this.containerId, `Updating to show ${limit} items...`);
            
            // Update options
            this.options.limit = limit;
            
            try {
                // Add a small delay to ensure the loading animation is visible
                await new Promise(resolve => setTimeout(resolve, 150));
                
                // Re-process data with new limit
                this.processedData = await this.processData(this.rawData);
                
                // Re-create chart configuration
                const chartConfig = this.createChartConfig(this.processedData);
                
                // Ensure all labels are visible regardless of data limit
                this.ensureAllLabelsVisible(chartConfig);
                
                // Generate chart URL
                const chartUrl = chartService.createChartUrl(chartConfig);
                
                // Update the chart - loading indicator will be hidden after image loads
                chartUtils.displayChart(
                    this.containerId,
                    chartUrl,
                    this.options.title || 'Chart'
                );
                
                // Update descriptions
                const descriptions = this.generateDescriptions(this.processedData);
                this.updateChartDescriptions(descriptions);
                
                console.log(`[${this.containerId}] Data limit changed successfully.`);
            } catch (error) {
                console.error(`[${this.containerId}] Error changing data limit:`, error);
                chartUtils.displayChartError(this.containerId, `Failed to change data limit: ${error.message}`);
            }
        }
    }
    
    /**
     * Ensure all labels are visible in the chart when data limit changes
     * @param {Object} chartConfig - The chart configuration
     */
    ensureAllLabelsVisible(chartConfig) {
        if (!chartConfig || !chartConfig.data || !chartConfig.data.labels) {
            return;
        }
        
        // Get current chart type
        const chartType = this.options.type || 'bar';
        
        // Handle specific chart type adjustments for visibility
        if (chartType === 'bar' || chartType === 'line') {
            // For cartesian charts, make sure all labels are shown
            if (chartConfig.options && chartConfig.options.scales && chartConfig.options.scales.x) {
                // Adjust rotation based on number of items for better visibility
                const labelCount = chartConfig.data.labels.length;
                let rotation = 0;
                
                if (labelCount > 10) {
                    rotation = 45; // Use 45-degree angle for many labels
                } else if (labelCount > 5) {
                    rotation = 25; // Use slight angle for medium number of labels
                }
                
                chartConfig.options.scales.x.ticks = {
                    ...chartConfig.options.scales.x.ticks,
                    maxRotation: rotation,
                    minRotation: rotation,
                    autoSkip: false, // Prevent automatic skipping of labels
                    font: { 
                        size: labelCount > 10 ? 10 : 12, // Smaller font for more labels
                        weight: "bold" 
                    }
                };
            }
        } else if (chartType === 'pie' || chartType === 'doughnut' || chartType === 'polarArea') {
            // For non-cartesian charts, ensure legend is visible and properly positioned
            if (chartConfig.options && chartConfig.options.plugins && chartConfig.options.plugins.legend) {
                const labelCount = chartConfig.data.labels.length;
                
                chartConfig.options.plugins.legend = {
                    ...chartConfig.options.plugins.legend,
                    display: true,
                    position: labelCount > 8 ? 'bottom' : 'right', // Bottom position for many items
                    labels: {
                        boxWidth: labelCount > 12 ? 10 : 12, // Smaller boxes for many labels
                        font: {
                            size: labelCount > 12 ? 10 : 12 // Smaller font for many labels
                        }
                    }
                };
            }
        }
    }
    
    /**
     * Change the sort order of data
     * @param {string} sortOrder - Sort order ('asc', 'desc', or 'alpha')
     */
    async changeSortOrder(sortOrder) {
        if (['asc', 'desc'].includes(sortOrder)) {
            console.log(`[${this.containerId}] Changing sort order to ${sortOrder}...`);
            
            // First remove existing images so loading indicator is visible
            const container = document.getElementById(this.containerId);
            const wrapper = container.querySelector('.chart-wrapper');
            const images = wrapper ? wrapper.querySelectorAll('.chart-image') : [];
            
            // Remove images immediately to prevent them from covering the loading indicator
            images.forEach(img => img.remove());
            
            // Show loading overlay with clear visibility
            chartUtils.displayChartLoading(this.containerId, `Sorting data ${sortOrder === 'asc' ? 'lowest to highest' : 'highest to lowest'}...`);
            
            // Update options
            this.options.sort = sortOrder;
            
            try {
                // Add a small delay to ensure the loading animation is visible
                await new Promise(resolve => setTimeout(resolve, 150));
                
                // Re-process data with new sort order
                if (this.rawData) {
                    this.processedData = await this.processData(this.rawData);
                }
                
                // Re-create chart configuration
                const chartConfig = this.createChartConfig(this.processedData);
                
                // Ensure we're using the correct chart type
                chartConfig.type = this.options.type;
                
                // Ensure all labels are correctly visible after sorting
                this.ensureAllLabelsVisible(chartConfig);
                
                // Generate chart URL
                const chartUrl = chartService.createChartUrl(chartConfig);
                
                // Update the chart - loading indicator will be hidden after image loads
                chartUtils.displayChart(
                    this.containerId,
                    chartUrl,
                    this.options.title || 'Chart'
                );
                
                // Generate and update descriptions to reflect the sort change
                const descriptions = this.generateDescriptions(this.processedData);
                
                // Add sorting context to descriptions
                const sortContext = sortOrder === 'asc' ? 'from lowest to highest' : 'from highest to lowest';
                if (descriptions.short) {
                    descriptions.short = descriptions.short.replace(/\. \(Data as of.*?\)/, '');
                    descriptions.short += ` (sorted ${sortContext}. Data as of ${new Date().toLocaleDateString()})`;
                }
                
                if (descriptions.full) {
                    // Update the full description with sort context if it doesn't already mention it
                    if (!descriptions.full.includes('sorted')) {
                        descriptions.full += ` The data is sorted ${sortContext}.`;
                    } else {
                        // Replace existing sort context
                        descriptions.full = descriptions.full.replace(/(sorted )(?:from highest to lowest|from lowest to highest)/, `$1${sortContext}`);
                    }
                }
                
                this.updateChartDescriptions(descriptions);
                
                console.log(`[${this.containerId}] Sort order changed successfully to ${sortOrder}.`);
            } catch (error) {
                console.error(`[${this.containerId}] Error changing sort order:`, error);
                chartUtils.displayChartError(this.containerId, `Failed to change sort order: ${error.message}`);
            }
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
                this.rawData = freshData;
                
                // Process the data
                this.processedData = await this.processData(freshData);
                
                // Generate new descriptions
                const descriptions = this.generateDescriptions(this.processedData);
                
                // Update descriptions in the DOM
                this.updateChartDescriptions(descriptions);
                
                console.log(`[${this.containerId}] Chart descriptions auto-refreshed.`);
                
                // Create new chart configuration and update the chart if needed
                const chartConfig = this.createChartConfig(this.processedData);
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
        console.log(`[${this.containerId}] Destroying chart`);
        this.clearTimers();
        this.destroyChartInstance();
        
        // Remove any event listeners if needed
        // This would be specific to each chart implementation
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
     * Generate chart descriptions based on data
     * @param {Object} data - Processed chart data
     * @returns {Object} Object containing short and detailed descriptions
     */
    generateDescriptions(data) {
        // Default fallback description if we can't generate a specific one
        const defaultDesc = {
            short: 'This chart shows data visualization of world countries.',
            detailed: 'Explore the data by interacting with the chart controls.',
            analysis: 'The chart presents patterns in global data.',
            insights: [
                'The data shows interesting patterns across different countries.',
                'Use the chart controls to explore different views of the data.'
            ]
        };

        // If no data, return default
        if (!data || !data.formatted || data.formatted.length === 0) {
            return defaultDesc;
        }

        try {
            // Get chart specific context
            const chartType = this.options.chartType || 'general';
            const currentChartType = this.options.type || 'bar';
            const totalItems = data.labels ? data.labels.length : 0;
            const totalCountries = this.rawData ? this.rawData.length : 0;

            // Generate chart-specific descriptions
            switch (chartType) {
                case 'population':
                    return this.generatePopulationDescriptions(data);
                case 'continent':
                    return this.generateContinentDescriptions(data);
                case 'region':
                    return this.generateRegionDescriptions(data);
                case 'language':
                    return this.generateLanguageDescriptions(data);
                case 'borders':
                    return this.generateBordersDescriptions(data);
                case 'independence':
                    return this.generateIndependenceDescriptions(data);
                case 'currency':
                    return this.generateCurrencyDescriptions(data);
                case 'timezone':
                    return this.generateTimezoneDescriptions(data);
                default:
                    // Generic description
                    return {
                        short: `This chart displays ${totalItems} data points related to world countries.`,
                        detailed: `The ${currentChartType} chart visualizes data across ${totalItems} categories from ${totalCountries} countries around the world.`,
                        analysis: `Analysis of the data reveals variations across the ${totalItems} displayed categories.`,
                        insights: [
                            `The chart includes data from ${totalCountries} countries.`,
                            `The visualization type (${currentChartType}) helps highlight key patterns in the data.`,
                            'Use the chart controls to explore different aspects of the data.'
                        ]
                    };
            }
        } catch (error) {
            console.error(`Error generating descriptions: ${error.message}`);
            return defaultDesc;
        }
    }

    /**
     * Generate population-specific chart descriptions
     * @param {Object} data - Processed chart data
     * @returns {Object} Population-specific descriptions
     */
    generatePopulationDescriptions(data) {
        const showingDensity = this.options.showDensity || false;
        const popFilter = this.options.populationFilter || 'all';
        const totalItems = data.labels ? data.labels.length : 0;
        const totalCountries = this.rawData ? this.rawData.length : 0;
        
        // Get top countries based on processed data
        const topCountries = data.formatted?.slice(0, 3).map(c => c.name).join(', ');
        
        // Get total population shown
        const totalPopulation = data.formatted?.reduce((sum, item) => sum + item.value, 0);
        const formattedTotalPop = new Intl.NumberFormat().format(totalPopulation);
        
        // Calculate percentages for insights
        const topCountryPercentage = data.formatted && data.formatted.length > 0 
            ? ((data.formatted[0].value / totalPopulation) * 100).toFixed(2)
            : 0;
            
        const top3Percentage = data.formatted && data.formatted.length >= 3
            ? ((data.formatted.slice(0, 3).reduce((sum, item) => sum + item.value, 0) / totalPopulation) * 100).toFixed(2)
            : 0;

        // Create appropriate title based on current options
        let title;
        if (showingDensity) {
            if (popFilter === 'highpop') {
                title = 'Population Density in High Population Countries';
            } else if (popFilter === 'lowpop') {
                title = 'Population Density in Low Population Countries';
            } else {
                title = 'Population Density Comparison';
            }
        } else {
            if (popFilter === 'highpop') {
                title = 'High Population Countries (>100M)';
            } else if (popFilter === 'lowpop') {
                title = 'Low Population Countries (<10M)';
            } else {
                title = 'Top Most Populous Countries';
            }
        }

        // Set appropriate description context
        let contextDesc = '';
        if (popFilter === 'highpop') {
            contextDesc = 'countries with populations over 100 million';
        } else if (popFilter === 'lowpop') {
            contextDesc = 'countries with populations under 10 million';
        } else {
            contextDesc = 'most populous countries in the world';
        }

        // Set appropriate metric
        const metric = showingDensity ? 'population density (people per km²)' : 'total population';

        return {
            title: title,
            short: `${showingDensity ? 'Population density' : 'Population'} comparison across ${contextDesc}.`,
            detailed: `This chart displays the ${metric} of ${totalItems} ${contextDesc}. The data is presented as a ${this.options.type} chart, with ${topCountries} ${showingDensity ? 'having the highest density values' : 'being the most populous'}.`,
            analysis: `${showingDensity ? 'Population density' : 'Population'} distribution showing ${contextDesc}, with ${topCountries} ${showingDensity ? 'having the highest density' : 'being the most populous'}. Total countries analyzed: ${totalCountries}.`,
            insights: [
                data.formatted && data.formatted.length > 0 ? `${data.formatted[0].name} has the ${showingDensity ? 'highest density' : 'largest population'} with ${data.formatted[0].formatted} ${data.formatted[0].metric}, representing about ${topCountryPercentage}% of the total shown.` : '',
                `The top 3 countries account for over ${top3Percentage}% of the ${showingDensity ? 'density' : 'population'} shown.`,
                showingDensity ? 'Population density varies significantly based on geography, urbanization, and land availability.' : 'Population distribution reflects historical, economic, and geographical factors.',
                showingDensity ? 'Densely populated areas face unique challenges in urban planning and resource management.' : 'Population growth rates continue to vary significantly across different regions of the world.'
            ].filter(insight => insight) // Remove empty insights
        };
    }

    /**
     * Generate continent-specific chart descriptions
     * @param {Object} data - Processed chart data
     * @returns {Object} Continent-specific descriptions
     */
    generateContinentDescriptions(data) {
        const dataView = this.options.dataView || 'population';
        const showPercentage = this.options.showPercentage || false;
        const totalItems = data.labels ? data.labels.length : 0;
        
        // Get appropriate labels based on current data view
        let metric, title, contextDesc;
        
        switch (dataView) {
            case 'area':
                metric = 'land area';
                title = showPercentage ? 'Continental Land Area (%)' : 'Continental Land Area (km²)';
                contextDesc = 'land area distribution';
                break;
            case 'density':
                metric = 'population density';
                title = 'Population Density by Continent';
                contextDesc = 'population density';
                break;
            case 'population':
            default:
                metric = 'population';
                title = showPercentage ? 'World Population by Continent (%)' : 'World Population by Continent';
                contextDesc = 'population distribution';
                break;
        }
        
        // Determine the chart type description
        const chartTypeDesc = this.getChartTypeDescription();
        
        // Find the largest continent by the current metric
        const largestContinent = data.formatted && data.formatted.length > 0 
            ? data.formatted[0].continent 
            : 'Asia';
            
        const largestValue = data.formatted && data.formatted.length > 0
            ? showPercentage ? `${data.formatted[0].percentage}%` : data.formatted[0].formatted
            : 'N/A';
            
        // Get the top 2 continents
        const top2Continents = data.formatted?.slice(0, 2).map(c => c.continent).join(' and ');
        
        // Calculate total for this metric
        const totalValue = showPercentage ? 100 : data.formatted?.reduce((sum, item) => sum + item.value, 0);
        const formattedTotal = showPercentage ? '100%' : new Intl.NumberFormat().format(totalValue);
        
        return {
            title: title,
            short: `This ${chartTypeDesc} shows ${contextDesc} across continents ${showPercentage ? 'as percentages' : 'in absolute values'}.`,
            detailed: `The chart displays ${metric} data for all ${totalItems} continents ${showPercentage ? 'as percentages of the total' : 'in absolute values'}. ${largestContinent} has the highest ${metric} at ${largestValue}${showPercentage ? '' : ` ${data.formatted[0].metric}`}.`,
            analysis: `Global ${metric} by continent shows that ${top2Continents} account for the majority of the world's ${metric}. The data demonstrates how ${metric} varies significantly across different continents.`,
            insights: [
                `${largestContinent} has the highest ${metric} with ${largestValue}${showPercentage ? '' : ` ${data.formatted[0].metric}`}.`,
                data.formatted && data.formatted.length > 1 ? `${data.formatted[1].continent} ranks second with ${showPercentage ? `${data.formatted[1].percentage}%` : data.formatted[1].formatted}${showPercentage ? '' : ` ${data.formatted[1].metric}`}.` : '',
                dataView === 'population' ? 'Population is unevenly distributed across continents due to historical settlement patterns and varying environmental conditions.' : '',
                dataView === 'area' ? 'Land area doesn\'t directly correlate with population, as some large continents have relatively sparse populations.' : '',
                dataView === 'density' ? 'Population density is influenced by a combination of land availability, economic development, and urbanization.' : ''
            ].filter(insight => insight) // Remove empty insights
        };
    }

    /**
     * Generate region-specific chart descriptions
     * @param {Object} data - Processed chart data
     * @returns {Object} Region-specific descriptions
     */
    generateRegionDescriptions(data) {
        const groupBy = this.options.groupBy || 'none';
        const statistic = this.options.statistic || 'countries';
        const totalItems = data.labels ? data.labels.length : 0;
        
        // Set appropriate metric and description based on current statistic
        let metric, metricDesc;
        switch (statistic) {
            case 'population':
                metric = 'population';
                metricDesc = 'total population';
                break;
            case 'area':
                metric = 'land area';
                metricDesc = 'total land area';
                break;
            case 'countries':
            default:
                metric = 'countries';
                metricDesc = 'number of countries';
                break;
        }
        
        // Set grouping context
        const groupContext = groupBy === 'continent' ? 'continental grouping' : 'individual regions';
        
        // Get the region with highest value
        const topRegion = data.formatted && data.formatted.length > 0 ? data.formatted[0].name : '';
        const topValue = data.formatted && data.formatted.length > 0 ? data.formatted[0].formatted : '';
        
        // Chart type description
        const chartTypeDesc = this.getChartTypeDescription();
        
        // Generate appropriate title
        let title;
        if (groupBy === 'continent') {
            title = `${statistic === 'countries' ? 'Country Count' : statistic === 'population' ? 'Population' : 'Land Area'} by Continent`;
        } else {
            title = `${statistic === 'countries' ? 'Country Count' : statistic === 'population' ? 'Population' : 'Land Area'} by Region`;
        }
        
        return {
            title: title,
            short: `This ${chartTypeDesc} shows the ${metricDesc} across ${totalItems} ${groupContext}.`,
            detailed: `The chart displays the distribution of ${metricDesc} across ${totalItems} ${groupContext}. ${topRegion} has the highest value with ${topValue} ${data.formatted[0].metric}.`,
            analysis: `Regional distribution analysis shows that ${topRegion} leads in terms of ${metricDesc} with ${topValue} ${data.formatted[0].metric}, highlighting geographical patterns in the data.`,
            insights: [
                `${topRegion} has the highest ${metricDesc} at ${topValue} ${data.formatted[0].metric}.`,
                data.formatted && data.formatted.length > 1 ? `${data.formatted[1].name} ranks second with ${data.formatted[1].formatted} ${data.formatted[1].metric}.` : '',
                statistic === 'population' ? 'Population distribution across regions reflects historical settlement patterns and economic development.' : '',
                statistic === 'area' ? 'Regional land area varies significantly, affecting population density and resource distribution.' : '',
                statistic === 'countries' ? 'The number of countries per region reflects historical, political, and geographical factors.' : '',
                `The ${this.options.type} chart format effectively highlights the differences between ${groupContext}.`
            ].filter(insight => insight)
        };
    }

    /**
     * Generate language-specific chart descriptions
     * @param {Object} data - Processed chart data
     * @returns {Object} Language-specific descriptions
     */
    generateLanguageDescriptions(data) {
        const continentFilter = this.options.continentFilter || 'all';
        const groupByFamily = this.options.groupByFamily || false;
        const totalItems = data.labels ? data.labels.length : 0;
        
        // Most common language
        const topLanguage = data.formatted && data.formatted.length > 0 ? data.formatted[0].language : '';
        const topCount = data.formatted && data.formatted.length > 0 ? data.formatted[0].count : 0;
        
        // Generate appropriate title
        let title;
        if (continentFilter !== 'all') {
            title = groupByFamily ? `Language Families in ${continentFilter}` : `Most Common Languages in ${continentFilter}`;
        } else {
            title = groupByFamily ? `World's Major Language Families` : `Most Common Official Languages`;
        }
        
        // Context description for filtering
        const contextDesc = continentFilter !== 'all' ? `in ${continentFilter}` : 'globally';
        
        // Generate description based on grouping
        const groupingDesc = groupByFamily ? 'language families' : 'individual languages';
        
        // Chart type description
        const chartTypeDesc = this.getChartTypeDescription();
        
        return {
            title: title,
            short: `This ${chartTypeDesc} shows the distribution of ${groupingDesc} ${contextDesc}.`,
            detailed: `The chart displays the ${totalItems} most common ${groupingDesc} ${contextDesc}. ${topLanguage} is ${groupByFamily ? 'the most prevalent family' : 'the most widely used language'} with usage in ${topCount} ${topCount === 1 ? 'country' : 'countries'}.`,
            analysis: `Language distribution analysis shows that ${topLanguage} is ${groupByFamily ? 'the most common language family' : 'the most widely spoken language'} ${contextDesc}, used in ${topCount} ${topCount === 1 ? 'country' : 'countries'}.`,
            insights: [
                `${topLanguage} is ${groupByFamily ? 'the most widespread language family' : 'the most common official language'} ${contextDesc}, used in ${topCount} ${topCount === 1 ? 'country' : 'countries'}.`,
                data.formatted && data.formatted.length > 1 ? `${data.formatted[1].language} ranks second with usage in ${data.formatted[1].count} ${data.formatted[1].count === 1 ? 'country' : 'countries'}.` : '',
                groupByFamily ? 'Language families share common linguistic ancestry and structural features.' : 'Many countries have multiple official languages, reflecting their cultural diversity.',
                continentFilter !== 'all' ? `${continentFilter} shows distinct linguistic patterns compared to other continents.` : 'Language distribution globally reflects historical colonization, migration, and cultural exchange.'
            ].filter(insight => insight)
        };
    }

    /**
     * Generate borders-specific chart descriptions
     * @param {Object} data - Processed chart data
     * @returns {Object} Borders-specific descriptions
     */
    generateBordersDescriptions(data) {
        const borderRange = this.options.borderRange || 'all';
        const highlightContinents = this.options.highlightContinents || false;
        const totalItems = data.labels ? data.labels.length : 0;
        
        // Get country with most borders
        const topCountry = data.formatted && data.formatted.length > 0 ? data.formatted[0].name : '';
        const topBorders = data.formatted && data.formatted.length > 0 ? data.formatted[0].borderCount : 0;
        
        // Chart type description
        const chartTypeDesc = this.getChartTypeDescription();
        
        // Context description based on filter
        let contextDesc, title;
        switch (borderRange) {
            case 'no-borders':
                contextDesc = 'countries with no land borders (islands and isolated territories)';
                title = 'Countries with No Land Borders';
                break;
            case '1-2':
                contextDesc = 'countries with 1-2 bordering neighbors';
                title = 'Countries with 1-2 Borders';
                break;
            case '3-5':
                contextDesc = 'countries with 3-5 bordering neighbors';
                title = 'Countries with 3-5 Borders';
                break;
            case '6-plus':
                contextDesc = 'countries with 6 or more bordering neighbors';
                title = 'Countries with 6+ Borders';
                break;
            default:
                contextDesc = 'countries based on their number of bordering neighbors';
                title = 'Countries by Number of Borders';
                break;
        }
        
        // Add continent highlight context to title if applicable
        if (highlightContinents) {
            title += ' (By Continent)';
        }
        
        return {
            title: title,
            short: `This ${chartTypeDesc} shows ${contextDesc}${highlightContinents ? ', color-coded by continent' : ''}.`,
            detailed: `The chart displays ${totalItems} ${contextDesc}. ${topCountry ? `${topCountry} has ${topBorders === 0 ? 'no bordering countries' : `${topBorders} bordering ${topBorders === 1 ? 'country' : 'countries'}`}` : ''} ${highlightContinents ? 'with countries color-coded by their continental location' : ''}.`,
            analysis: `Border analysis shows the geographical connectivity of ${contextDesc}. ${borderRange === 'no-borders' ? 'These are primarily island nations or territories with unique geographical isolation.' : `${topCountry} leads with ${topBorders} borders.`}`,
            insights: [
                topCountry ? `${topCountry} ${borderRange === 'no-borders' ? 'is an island nation with no land borders' : `has ${topBorders} bordering ${topBorders === 1 ? 'country' : 'countries'}`}.` : '',
                borderRange === 'no-borders' ? 'Island nations face unique challenges in trade and transportation due to their geographical isolation.' : '',
                borderRange === '6-plus' ? 'Countries with many borders often serve as important cultural and trade crossroads.' : '',
                highlightContinents ? 'The continental color-coding reveals regional patterns in border relationships.' : '',
                'Border counts reflect geographical position, historical developments, and political boundaries.'
            ].filter(insight => insight)
        };
    }

    /**
     * Generate independence-specific chart descriptions
     * @param {Object} data - Processed chart data
     * @returns {Object} Independence-specific descriptions
     */
    generateIndependenceDescriptions(data) {
        const period = this.options.period || 'all';
        const groupBy = this.options.groupBy || 'status';
        const totalItems = data.labels ? data.labels.length : 0;
        
        // Chart type description
        const chartTypeDesc = this.getChartTypeDescription();
        
        // Context descriptions
        let periodDesc, title;
        switch (period) {
            case 'pre1900':
                periodDesc = 'before 1900';
                title = 'Pre-1900 Independence';
                break;
            case '1900-1945':
                periodDesc = 'between 1900 and 1945';
                title = 'Independence: 1900-1945';
                break;
            case '1946-1989':
                periodDesc = 'during the Cold War period (1946-1989)';
                title = 'Cold War Independence (1946-1989)';
                break;
            case 'post1990':
                periodDesc = 'since 1990';
                title = 'Modern Era Independence (1990+)';
                break;
            default:
                periodDesc = 'throughout history';
                title = 'Independence Status';
                break;
        }
        
        // Modify title based on grouping
        if (groupBy === 'decade') {
            title = `Independence by Decade ${period !== 'all' ? `(${periodDesc})` : ''}`;
        } else if (groupBy === 'region') {
            title = `Independence by Region ${period !== 'all' ? `(${periodDesc})` : ''}`;
        }
        
        // Get most common category
        const topCategory = data.formatted && data.formatted.length > 0 ? data.formatted[0].status : '';
        const topCount = data.formatted && data.formatted.length > 0 ? data.formatted[0].count : 0;
        
        return {
            title: title,
            short: `This ${chartTypeDesc} shows countries' independence status ${periodDesc}${groupBy !== 'status' ? `, grouped by ${groupBy}` : ''}.`,
            detailed: `The chart displays the independence status of countries ${periodDesc}, with data organized by ${groupBy}. ${topCategory} is the largest category with ${topCount} countries.`,
            analysis: `Independence analysis ${periodDesc} shows that ${topCategory} is the most common status with ${topCount} countries. This reflects historical patterns of decolonization and political change.`,
            insights: [
                `The largest group is ${topCategory} with ${topCount} countries (${data.formatted && data.formatted.length > 0 ? data.formatted[0].percentage : 0}%).`,
                period === 'pre1900' ? 'Many countries with long-standing independence were colonial powers themselves.' : '',
                period === '1900-1945' ? 'This period saw independence movements coinciding with the World Wars and changing global power dynamics.' : '',
                period === '1946-1989' ? 'Cold War decolonization led to many new independent nations, especially in Africa and Asia.' : '',
                period === 'post1990' ? 'The fall of the Soviet Union triggered a new wave of independent states in Eastern Europe and Central Asia.' : '',
                'Independence status reflects complex historical processes including colonization, wars, treaties, and indigenous sovereignty movements.'
            ].filter(insight => insight)
        };
    }

    /**
     * Generate currency-specific chart descriptions
     * @param {Object} data - Processed chart data
     * @returns {Object} Currency-specific descriptions
     */
    generateCurrencyDescriptions(data) {
        const currView = this.options.currView || 'count';
        const regionFilter = this.options.regionFilter || 'all';
        const totalItems = data.labels ? data.labels.length : 0;
        
        // Context descriptions
        let viewDesc, title;
        switch (currView) {
            case 'shared':
                viewDesc = 'shared across multiple countries';
                title = 'Most Shared Currencies';
                break;
            case 'exclusive':
                viewDesc = 'used exclusively by single countries';
                title = 'Exclusive National Currencies';
                break;
            default:
                viewDesc = 'by number of countries using them';
                title = 'Most Common Currencies';
                break;
        }
        
        // Add region context if filtered
        if (regionFilter !== 'all') {
            title += ` in ${regionFilter}`;
            viewDesc += ` in ${regionFilter}`;
        }
        
        // Chart type description
        const chartTypeDesc = this.getChartTypeDescription();
        
        // Most used currency
        const topCurrency = data.formatted && data.formatted.length > 0 ? data.formatted[0].currency : '';
        const topCount = data.formatted && data.formatted.length > 0 ? data.formatted[0].count : 0;
        
        return {
            title: title,
            short: `This ${chartTypeDesc} shows currencies ${viewDesc}.`,
            detailed: `The chart displays ${totalItems} currencies ${viewDesc}. ${topCurrency} is the ${currView === 'count' || currView === 'shared' ? 'most widely used' : 'an exclusive'} currency, used in ${topCount} ${topCount === 1 ? 'country' : 'countries'}.`,
            analysis: `Currency analysis shows that ${topCurrency} is the ${currView === 'count' || currView === 'shared' ? 'most common' : 'a unique'} currency ${regionFilter !== 'all' ? `in ${regionFilter}` : 'globally'}, used in ${topCount} ${topCount === 1 ? 'country' : 'countries'}.`,
            insights: [
                `${topCurrency} is ${currView === 'exclusive' ? 'an exclusive currency' : 'the most widely used currency'} ${regionFilter !== 'all' ? `in ${regionFilter}` : 'globally'}, used in ${topCount} ${topCount === 1 ? 'country' : 'countries'}.`,
                currView === 'shared' ? 'Shared currencies often indicate economic cooperation, historical ties, or colonial legacies.' : '',
                currView === 'exclusive' ? 'Countries with exclusive currencies maintain monetary sovereignty and independent financial policies.' : '',
                regionFilter !== 'all' ? `${regionFilter} shows distinct currency patterns reflecting its regional economic integration.` : '',
                'Currency usage reflects economic relationships, historical connections, and monetary policy decisions.'
            ].filter(insight => insight)
        };
    }

    /**
     * Generate timezone-specific chart descriptions
     * @param {Object} data - Processed chart data
     * @returns {Object} Timezone-specific descriptions
     */
    generateTimezoneDescriptions(data) {
        const groupBy = this.options.groupBy || 'exact';
        const showOffset = this.options.showOffset || false;
        const totalItems = data.labels ? data.labels.length : 0;
        
        // Chart type description
        const chartTypeDesc = this.getChartTypeDescription();
        
        // Context descriptions
        let groupDesc, title;
        switch (groupBy) {
            case 'major':
                groupDesc = 'major timezone regions';
                title = 'Major Timezone Regions';
                break;
            case 'offset':
                groupDesc = 'UTC offset values';
                title = 'Countries by UTC Offset';
                break;
            default:
                groupDesc = 'exact timezone values';
                title = 'Exact Timezone Distribution';
                break;
        }
        
        if (showOffset) {
            title += ' (with UTC Offsets)';
        }
        
        // Most common timezone/offset
        const topTimezone = data.formatted && data.formatted.length > 0 ? data.formatted[0].timezone : '';
        const topCount = data.formatted && data.formatted.length > 0 ? data.formatted[0].count : 0;
        
        return {
            title: title,
            short: `This ${chartTypeDesc} shows the distribution of countries across ${groupDesc}${showOffset ? ' with UTC offsets' : ''}.`,
            detailed: `The chart displays ${totalItems} ${groupDesc}${showOffset ? ' with their UTC offsets' : ''}. ${topTimezone} is the most common with ${topCount} countries.`,
            analysis: `Timezone analysis shows that ${topTimezone} is the most common timezone with ${topCount} countries, reflecting geographical and political time standardization.`,
            insights: [
                `${topTimezone} is the most common timezone with ${topCount} countries.`,
                groupBy === 'offset' ? 'UTC offset distribution follows a pattern centered around the Prime Meridian, with clustering at whole-hour intervals.' : '',
                'Some countries span multiple timezones due to their large east-west extent.',
                'Timezone boundaries often follow political borders rather than strict longitudinal lines.',
                'Daylight saving time practices create seasonal timezone variations not reflected in this chart.'
            ].filter(insight => insight)
        };
    }

    /**
     * Get a descriptive phrase for the current chart type
     * @returns {string} Description of the chart type
     */
    getChartTypeDescription() {
        switch (this.options.type) {
            case 'bar': 
                return 'bar chart';
            case 'line': 
                return 'line chart';
            case 'pie': 
                return 'pie chart';
            case 'doughnut': 
                return 'doughnut chart';
            case 'polarArea': 
                return 'polar area chart';
            case 'radar': 
                return 'radar chart';
            case 'scatter': 
                return 'scatter plot';
            default: 
                return 'chart';
        }
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
            this.rawData = newData;
            this.processedData = await this.processData(newData);
            const chartConfig = this.createChartConfig(this.processedData);
            const chartUrl = chartService.createChartUrl(chartConfig);
            
            // Generate new descriptions
            const descriptions = this.generateDescriptions(this.processedData);
            
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

    /**
     * Clean up chart instance properly
     */
    destroyChartInstance() {
        console.log(`[${this.containerId}] Destroying chart instance`);
        
        // If we have a chart instance, properly dispose of it
        if (this.chartInstance) {
            if (typeof this.chartInstance.destroy === 'function') {
                this.chartInstance.destroy();
            }
            this.chartInstance = null;
        }
        
        // Remove any existing chart-image elements to prevent stacking
        const chartContainer = document.getElementById(this.containerId);
        if (chartContainer) {
            const wrapper = chartContainer.querySelector('.chart-wrapper') || chartContainer;
            const existingImages = wrapper.querySelectorAll('.chart-image');
            existingImages.forEach(img => img.remove());
        }
    }

    /**
     * Clean up existing chart elements to prevent stacking
     * This should be called before rendering a new chart
     */
    cleanupExistingChart() {
        console.log(`[${this.containerId}] Cleaning up existing chart elements...`);
        
        if (!this.container) {
            console.error(`[${this.containerId}] Container not found during cleanup`);
            return;
        }
        
        // Find the chart wrapper
        const chartWrapper = this.container.querySelector('.chart-wrapper');
        if (!chartWrapper) {
            console.error(`[${this.containerId}] Chart wrapper not found during cleanup`);
            return;
        }
        
        // Remove any existing chart images with a fade-out effect
        const existingImages = chartWrapper.querySelectorAll('.chart-image');
        if (existingImages.length > 0) {
            console.log(`[${this.containerId}] Removing ${existingImages.length} existing chart images`);
            existingImages.forEach(image => {
                // Apply fade-out transition
                image.style.transition = 'opacity 0.3s ease';
                image.style.opacity = '0';
                
                // Remove after transition completes
                setTimeout(() => {
                    if (image.parentNode) {
                        image.parentNode.removeChild(image);
                    }
                }, 300);
            });
        }
        
        // Remove any existing error messages
        const existingErrors = chartWrapper.querySelectorAll('.chart-error');
        if (existingErrors.length > 0) {
            console.log(`[${this.containerId}] Removing ${existingErrors.length} existing error messages`);
            existingErrors.forEach(error => {
                error.remove();
            });
        }
        
        // Remove any existing loading indicators
        const existingLoading = chartWrapper.querySelectorAll('.chart-loading');
        if (existingLoading.length > 0) {
            console.log(`[${this.containerId}] Removing ${existingLoading.length} existing loading indicators`);
            existingLoading.forEach(loading => {
                loading.remove();
            });
        }
        
        // If we have a chart instance, properly dispose of it
        if (this.chartInstance) {
            console.log(`[${this.containerId}] Destroying chart instance`);
            if (typeof this.chartInstance.destroy === 'function') {
                this.chartInstance.destroy();
            }
            this.chartInstance = null;
        }
        
        console.log(`[${this.containerId}] Chart cleanup completed`);
    }

    /**
     * Set a timer that will be automatically cleared when the chart is destroyed
     * @param {function} callback Function to execute
     * @param {number} delay Delay in milliseconds
     * @returns {number} Timer ID
     */
    setTimer(callback, delay) {
        const timerId = setTimeout(callback, delay);
        this.timers.push(timerId);
        return timerId;
    }

    /**
     * Clear all timers
     */
    clearTimers() {
        this.timers.forEach(timerId => clearTimeout(timerId));
        this.timers = [];
    }

    /**
     * Show a loading animation over the chart
     * @param {string} [message] Optional loading message
     */
    showLoading(message = 'Loading chart...') {
        if (!this.container) return;
        
        console.log(`[${this.containerId}] Showing loading animation`);
        this.isLoading = true;
        
        // Use the chartUtils method to show loading
        chartUtils.displayChartLoading(this.containerId, message);
    }
    
    /**
     * Hide loading animation
     */
    hideLoading() {
        if (!this.container) return;
        
        console.log(`[${this.containerId}] Hiding loading animation`);
        this.isLoading = false;
        
        // Use the improved helper function from chartUtils
        chartUtils.hideLoadingIndicator(this.containerId);
    }
    
    /**
     * Show an error message
     * @param {string} message Error message to display
     */
    showError(message) {
        if (!this.container) return;
        
        console.error(`[${this.containerId}] Chart error: ${message}`);
        
        // Use the chartUtils method to show an error
        chartUtils.displayChartError(this.containerId, message);
    }
    
    /**
     * Clean up existing chart resources to prepare for update
     * This should be called before updating a chart to prevent memory leaks
     */
    cleanupExistingChart() {
        // Remove any existing chart instance
        if (this.chartInstance) {
            console.log(`[${this.containerId}] Destroying existing chart instance`);
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
        
        // Remove any existing chart images
        const chartImages = this.container.querySelectorAll('.chart-image');
        if (chartImages.length > 0) {
            console.log(`[${this.containerId}] Removing ${chartImages.length} chart images`);
            chartImages.forEach(img => {
                img.style.transition = 'opacity 0.2s ease-out';
                img.style.opacity = '0';
                
                setTimeout(() => {
                    if (img.parentNode) {
                        img.parentNode.removeChild(img);
                    }
                }, 200);
            });
        }
        
        // Clear any associated timers
        this.clearTimers();
    }
    
    /**
     * Clear all timers associated with this chart
     */
    clearTimers() {
        // Clear refresh timer
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
        
        // Clear any other saved timers
        this.timers.forEach(timerId => {
            clearTimeout(timerId);
        });
        this.timers = [];
    }
}