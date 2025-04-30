/**
 * Population Chart Component
 * Extends BaseChart to create population-specific visualizations
 */

import { BaseChart } from '../BaseChart.js';
import * as dataProcessing from '../../../utils/dataProcessing.js';
import { chartService } from '../../../services/chartService.js';
import * as chartUtils from '../../../utils/chartUtils.js';

// Get the root styles for consistent theming
const styles = getComputedStyle(document.documentElement);
const COLORS = {
    primary: styles.getPropertyValue('--primary-color').trim(),
    primaryDark: styles.getPropertyValue('--primary-dark').trim(),
    primaryLight: styles.getPropertyValue('--primary-light').trim(),
    textPrimary: styles.getPropertyValue('--text-primary').trim(),
    textSecondary: styles.getPropertyValue('--text-secondary').trim(),
};

function hexToRgba(hex, alpha = 1) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function darkenHexColor(hex, factor = 0.85) {
    const r = Math.round(parseInt(hex.slice(1, 3), 16) * factor);
    const g = Math.round(parseInt(hex.slice(3, 5), 16) * factor);
    const b = Math.round(parseInt(hex.slice(5, 7), 16) * factor);
    return `rgba(${r}, ${g}, ${b}, 1)`;
}

function generateHueVariants(baseHex, numberOfVariants) {
    const hexToHsl = (hex) => {
        let r = parseInt(hex.slice(1, 3), 16) / 255;
        let g = parseInt(hex.slice(3, 5), 16) / 255;
        let b = parseInt(hex.slice(5, 7), 16) / 255;

        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h, s, l };
    };

    const hslToHex = ({ h, s, l }) => {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        const r = hue2rgb(p, q, h + 1/3);
        const g = hue2rgb(p, q, h);
        const b = hue2rgb(p, q, h - 1/3);

        const toHex = x => {
            const hex = Math.round(x * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };

        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    };

    const baseHSL = hexToHsl(baseHex);
    const variants = [];

    const step = 1 / numberOfVariants;
    for (let i = 0; i < numberOfVariants; i++) {
        let newHue = (baseHSL.h + i * step) % 1;
        variants.push(hslToHex({ h: newHue, s: baseHSL.s, l: baseHSL.l }));
    }

    return variants;
}

export class PopulationChart extends BaseChart {
    /**
     * Create a new PopulationChart instance
     * @param {string} containerId - The ID of the container element
     * @param {Object} options - Chart configuration options
     */
    constructor(containerId, options = {}) {
        super(containerId, {
            title: 'Global Population Distribution',
            type: 'bar',
            colorScheme: 'default',
            limit: 5,
            sort: 'desc',
            chartType: 'population', // Add chart type identifier for dynamic descriptions
            supportedChartTypes: ['bar', 'pie', 'doughnut', 'polarArea'],
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
        // Safety check for data
        if (!Array.isArray(data) || data.length === 0) {
            console.error('Invalid country data received');
            return { labels: [], values: [], formatted: [] };
        }

        // Apply filtering based on population range if specified
        let filteredData = [...data];
        if (this.options.populationFilter === 'highpop') {
            filteredData = data.filter(country => country.population >= 100000000);
        } else if (this.options.populationFilter === 'lowpop') {
            filteredData = data.filter(country => country.population < 10000000);
        }
        
        // Filter countries with population data and calculate density for each
        // We need to calculate density early to use it for sorting
        let filteredCountries = filteredData
            .filter(c => c.population)
            .map(country => {
                // Calculate density with proper error handling
                let density = 0;
                if (country.area && country.area > 0) {
                    density = Math.round(country.population / country.area);
                }
                // Return country with pre-calculated density
                return {
                    ...country,
                    calculatedDensity: density
                };
            });
        
        // Sort countries based on sort option and whether we're showing density or population
        const showingDensity = this.options.showDensity || false;
        
        switch (this.options.sort) {
            case 'asc':
                if (showingDensity) {
                    // Sort by density ascending
                    filteredCountries.sort((a, b) => a.calculatedDensity - b.calculatedDensity);
                } else {
                    // Sort by population ascending
                    filteredCountries.sort((a, b) => a.population - b.population);
                }
                break;
            case 'desc':
            default:
                if (showingDensity) {
                    // Sort by density descending
                    filteredCountries.sort((a, b) => b.calculatedDensity - a.calculatedDensity);
                } else {
                    // Sort by population descending
                    filteredCountries.sort((a, b) => b.population - a.population);
                }
                break;
        }
        
        // Apply limit after sorting
        const limit = this.options.limit || 5;
        const topCountries = filteredCountries.slice(0, limit);

        // Prepare data arrays
        const labels = topCountries.map(c => c.name.common);
        let values = [];
        
        // Get appropriate values based on display mode
        if (showingDensity) {
            values = topCountries.map(country => country.calculatedDensity);
        } else {
            values = topCountries.map(c => c.population);
        }

        return {
            labels: labels,
            values: values,
            rawCountries: topCountries, // Store the full country objects for reference
            totalCountriesCount: filteredData.length, // Used for insights
            formatted: topCountries.map((country, index) => {
                const value = values[index];
                const metric = showingDensity ? 'people/km²' : 'people';
                
                return {
                    name: country.name.common,
                    value: value,
                    formatted: dataProcessing.formatNumber(value),
                    population: country.population,
                    area: country.area || 0,
                    density: country.calculatedDensity, // Use pre-calculated density
                    flag: country.flags?.svg || null,
                    metric: metric,
                    region: country.region || 'Unknown',
                    subregion: country.subregion || 'Unknown'
                };
            })
        };
    }

    /**
     * Create chart configuration for population data
     * @param {Object} data - Processed population data
     * @returns {Object} Chart configuration for QuickChart API
     */
    createChartConfig(data) {
        // Generate colors using theme colors
        const colors = generateHueVariants(COLORS.primary, data.labels.length).map(color =>
            hexToRgba(color, 0.75)
        );

        const baseColors = generateHueVariants(COLORS.primary, data.labels.length);
        const backgroundColors = baseColors.map(color => hexToRgba(color, 0.75));
        const borderColors = baseColors.map(color => darkenHexColor(color, 0.8));

        
        // Configure based on chart type
        const chartType = this.options.type || 'bar';
        
        // Get chart image title based on sort order and data type
        const chartImageTitle = this.getTitleBasedOnSortOrder();
        
        // Base configuration
        const config = {
            type: chartType,
            data: {
                labels: data.labels,
                datasets: [{
                    label: this.options.showDensity ? "Population Density" : "Population",
                    data: data.values,
                    backgroundColor: colors,
                    borderColor: hexToRgba(COLORS.primary, 1),
                    borderColor: borderColors,
                    borderWidth: 1,
                    borderRadius: 12
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: chartImageTitle, // Use dynamic title for chart image
                        font: {
                            size: 24,
                            family: 'Roboto, sans-serif',
                            weight: 600
                        },
                        color: COLORS.textPrimary,
                        padding: {bottom: 24}
                    },
                    legend: {
                        display: chartType !== 'bar' && chartType !== 'line',
                        position: 'right'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const item = data.formatted[context.dataIndex];
                                if (this.options.showDensity) {
                                    return [
                                        `Density: ${item.formatted} ${item.metric}`,
                                        `Population: ${dataProcessing.formatNumber(item.population)}`,
                                        `Area: ${dataProcessing.formatNumber(item.area)} km²`
                                    ];
                                } else {
                                    return [
                                        `Population: ${item.formatted} ${item.metric}`,
                                        `${item.flag ? '🏳️' : ''} ${item.name}`
                                    ];
                                }
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            color: COLORS.textSecondary,
                            font: {
                                size: 14,
                                family: 'Roboto, sans-serif',
                                weight: 'bold'
                            },
                            autoSkip: false, // Disable auto-skipping of labels to ensure all are shown
                            autoSkipPadding: 5 // Add padding between labels
                        },
                        grid: {
                            color: hexToRgba(COLORS.textSecondary, 0.1),
                            display: false
                        }
                    },
                    y: {
                        ticks: {
                            color: COLORS.textSecondary,
                            font: {
                                size: 14,
                                family: 'Roboto, sans-serif',
                                weight: 'bold'
                            },
                            callback: value => dataProcessing.formatNumber(value)
                        },
                        grid: {
                            color: hexToRgba(COLORS.textSecondary, 0.1)
                        }
                    }
                },
                layout: {
                    padding: {
                        left: 10,
                        right: 10,
                        top: 20,
                        bottom: 30 // Increase bottom padding to give more space for labels
                    }
                }
            }
        };
        
        // Modify the configuration based on chart type
        if (chartType === 'pie' || chartType === 'doughnut' || chartType === 'polarArea') {
            // Remove scales for non-cartesian chart types
            delete config.options.scales;
            
            // Make legend visible
            config.options.plugins.legend.display = true;
            
            // Add percentage to tooltip
            config.options.plugins.tooltip.callbacks.label = (context) => {
                const item = data.formatted[context.dataIndex];
                const total = data.values.reduce((sum, val) => sum + val, 0);
                const percentage = ((data.values[context.dataIndex] / total) * 100).toFixed(1);
                
                if (this.options.showDensity) {
                    return [
                        `${item.name}: ${item.formatted} ${item.metric}`,
                        `Percentage: ${percentage}%`,
                        `Population: ${dataProcessing.formatNumber(item.population)}`
                    ];
                } else {
                    return [
                        `${item.name}: ${item.formatted} ${item.metric}`,
                        `Percentage: ${percentage}%`
                    ];
                }
            };
            
            // Explicitly hide numerical values for pie/doughnut/polarArea charts
            if (!config.options.plugins.datalabels) {
                config.options.plugins.datalabels = {};
            }
            config.options.plugins.datalabels.display = false;
            
            // For doughnut charts
            if (chartType === 'doughnut') {
                config.options.cutout = '50%';
            }
        } else if (chartType === 'line') {
            // For line charts
            config.data.datasets[0].borderWidth = 3;
            config.data.datasets[0].tension = 0.3;
            config.data.datasets[0].fill = false;
            config.data.datasets[0].pointBackgroundColor = colors;
            config.data.datasets[0].pointRadius = 5;
            config.data.datasets[0].pointHoverRadius = 7;
        } else {
            // For bar charts
            config.data.datasets[0].borderRadius = 12;
            config.data.datasets[0].barThickness = 40;
            
            // For horizontal bar charts if we have more than 5 items
            if (data.labels.length > 5) {
                // Adjust bar thickness for better readability with many items
                config.data.datasets[0].barThickness = Math.max(20, 100 / data.labels.length);
            }
        }
        
        return config;
    }
    
    // Colors are now generated using generateHueVariants
    
    /**
     * Create population-specific chart controls
     */
    createChartControls() {
        // Create base controls first (chart type selector)
        super.createChartControls();
        
        if (!this.chartControls) return;
        
        // 1. Add population filter dropdown
        const filterGroup = document.createElement('div');
        filterGroup.className = 'form-group me-2 mb-2';
        
        const filterSelect = document.createElement('select');
        filterSelect.className = 'form-select form-select-sm population-filter-select';
        filterSelect.setAttribute('aria-label', 'Filter population data');
        
        const filterOptions = [
            { value: 'all', text: 'All Countries' },
            { value: 'highpop', text: 'High Population (>100M)' },
            { value: 'lowpop', text: 'Low Population (<10M)' }
        ];
        
        filterOptions.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.text;
            if (option.value === (this.options.populationFilter || 'all')) {
                optionEl.selected = true;
            }
            filterSelect.appendChild(optionEl);
        });
        
        filterSelect.addEventListener('change', (e) => {
            this.filterPopulation(e.target.value);
        });
        
        filterGroup.appendChild(filterSelect);
        this.chartControls.appendChild(filterGroup);
        
        // 2. Add density toggle switch
        const densityGroup = document.createElement('div');
        densityGroup.className = 'form-group me-2 mb-2';
        
        const densityCheck = document.createElement('div');
        densityCheck.className = 'form-check form-switch';
        
        const densityInput = document.createElement('input');
        densityInput.className = 'form-check-input';
        densityInput.type = 'checkbox';
        densityInput.id = `${this.containerId}-density-toggle`;
        densityInput.setAttribute('role', 'switch');
        densityInput.checked = this.options.showDensity || false;
        
        const densityLabel = document.createElement('label');
        densityLabel.className = 'form-check-label ms-2';
        densityLabel.htmlFor = `${this.containerId}-density-toggle`;
        densityLabel.textContent = 'Show Density';
        
        densityInput.addEventListener('change', (e) => {
            this.toggleDensity(e.target.checked);
        });
        
        densityCheck.appendChild(densityInput);
        densityCheck.appendChild(densityLabel);
        densityGroup.appendChild(densityCheck);
        this.chartControls.appendChild(densityGroup);
    }

    /**
     * Filter population data
     * @param {string} filter - Filter type
     */
    async filterPopulation(filter) {
        console.log(`[${this.containerId}] Filtering population by: ${filter}`);
        
        // Show loading overlay
        this.showLoading('Filtering population data...');
        
        try {
            // Clean up existing chart before updating
            this.cleanupExistingChart();
            
            // Store filter option
            this.options.populationFilter = filter;
            
            // Re-process data with filter
            this.processedData = await this.processData(this.rawData);
            
            // Create new chart configuration with updated chart image title
            const chartConfig = this.createChartConfig(this.processedData);
            
            // Generate chart URL
            const chartUrl = chartService.createChartUrl(chartConfig);
            
            // Update the chart - use dynamic UI title
            const uiTitle = this.options.showDensity ? 'Global Population Density' : 'Global Population Distribution';
            
            chartUtils.displayChart(
                this.containerId,
                chartUrl,
                uiTitle
            );
            
            // Update the DOM title element
            const titleElement = this.container.querySelector('.chart-title');
            if (titleElement) {
                titleElement.textContent = uiTitle;
            }
            
            // Update descriptions with dynamic data-driven descriptions
            const descriptions = this.generateDescriptions(this.processedData);
            this.updateChartDescriptions(descriptions);
            
            // Hide the loading indicator
            this.hideLoading();
        } catch (error) {
            console.error(`[${this.containerId}] Error filtering population:`, error);
            this.showError(`Failed to filter population data: ${error.message}`);
        }
    }

    /**
     * Toggle between population and population density
     * @param {boolean} showDensity - Whether to show population density
     */
    async toggleDensity(showDensity) {
        console.log(`[${this.containerId}] Toggling density view: ${showDensity}`);
        
        // Show loading overlay
        this.showLoading('Updating density view...');
        
        try {
            // Clean up existing chart before updating
            this.cleanupExistingChart();
            
            // Store density option
            this.options.showDensity = showDensity;
            
            // Re-process data with density option - this will also resort based on density if needed
            this.processedData = await this.processData(this.rawData);
            
            // Create new chart configuration
            const chartConfig = this.createChartConfig(this.processedData);
            
            // Generate chart URL
            const chartUrl = chartService.createChartUrl(chartConfig);
            
            // Update the chart - update UI title
            const uiTitle = showDensity ? 'Global Population Density' : 'Global Population Distribution';
            
            chartUtils.displayChart(
                this.containerId,
                chartUrl,
                uiTitle
            );
            
            // Update the DOM title
            const titleElement = this.container.querySelector('.chart-title');
            if (titleElement) {
                titleElement.textContent = uiTitle;
            }
            
            // Update descriptions with dynamic data-driven descriptions
            const descriptions = this.generateDescriptions(this.processedData);
            this.updateChartDescriptions(descriptions);
            
            // Hide the loading indicator
            this.hideLoading();
        } catch (error) {
            console.error(`[${this.containerId}] Error toggling density view:`, error);
            this.showError(`Failed to toggle density view: ${error.message}`);
        }
    }

    /**
     * Get an appropriate title for the chart image based on current options and sort order
     * @returns {string} Chart title
     */
    getTitleBasedOnSortOrder() {
        const sortOrder = this.options.sort || 'desc';
        const showingDensity = this.options.showDensity || false;
        const popFilter = this.options.populationFilter || 'all';
        
        // Base title parts
        let baseTitle = '';
        let filterPart = '';
        let sortPart = '';
        
        // Set base title based on density toggle
        if (showingDensity) {
            baseTitle = 'Population Density';
        } else {
            baseTitle = 'Population Distribution';
        }
        
        // Add filter context
        if (popFilter === 'highpop') {
            filterPart = ' - High Pop. Countries';
        } else if (popFilter === 'lowpop') {
            filterPart = ' - Low Pop. Countries';
        }
        
        // Add sort order context
        sortPart = sortOrder === 'asc' ? ' (Lowest to Highest)' : ' (Highest to Lowest)';
        
        // For chart image title, include sort order
        return `${baseTitle}${filterPart}${sortPart}`;
    }

    /**
     * Override the base class method to ensure sort order is reflected in chart image title only
     * @param {string} sortOrder - Sort order ('asc', 'desc', or 'alpha')
     */
    async changeSortOrder(sortOrder) {
        if (['asc', 'desc'].includes(sortOrder)) {
            console.log(`[${this.containerId}] Changing sort order to ${sortOrder}...`);
            
            // Show loading overlay
            this.showLoading('Updating sort order...');
            
            try {
                // Clean up existing chart before updating
                this.cleanupExistingChart();
                
                // Update options
                this.options.sort = sortOrder;
                
                // Re-process data with new sort order
                if (this.rawData) {
                    this.processedData = await this.processData(this.rawData);
                }
                
                // Re-create chart configuration with updated chart image title
                const chartConfig = this.createChartConfig(this.processedData);
                
                // Ensure we're using the correct chart type
                chartConfig.type = this.options.type;
                
                // Generate chart URL
                const chartUrl = chartService.createChartUrl(chartConfig);
                
                // Update the chart
                const uiTitle = this.options.showDensity ? 'Global Population Density' : 'Global Population Distribution';
                
                chartUtils.displayChart(
                    this.containerId,
                    chartUrl,
                    uiTitle
                );
                
                // Apply the same title to the DOM element
                const titleElement = this.container.querySelector('.chart-title');
                if (titleElement) {
                    titleElement.textContent = uiTitle;
                }
                
                // Generate dynamic data-driven descriptions
                const descriptions = this.generateDescriptions(this.processedData);
                this.updateChartDescriptions(descriptions);
                
                // Hide the loading indicator
                this.hideLoading();
                
                console.log(`[${this.containerId}] Sort order changed successfully to ${sortOrder}.`);
            } catch (error) {
                console.error(`[${this.containerId}] Error changing sort order:`, error);
                this.showError(`Failed to change sort order: ${error.message}`);
            }
        }
    }

    /**
     * Override the base class method to ensure proper cleanup and loading states
     * @param {string} newType - New chart type ('bar', 'pie', etc.)
     */
    async changeChartType(newType) {
        if (this.supportedChartTypes.includes(newType)) {
            console.log(`[${this.containerId}] Changing chart type to ${newType}...`);
            
            // Show loading overlay
            this.showLoading(`Changing to ${newType} chart...`);
            
            try {
                // Clean up existing chart before updating
                this.cleanupExistingChart();
                
                // Update options
                this.options.type = newType;
                
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
                
                // Generate chart URL
                const chartUrl = chartService.createChartUrl(chartConfig);
                
                // Update the chart
                const uiTitle = this.options.showDensity ? 'Global Population Density' : 'Global Population Distribution';
                
                chartUtils.displayChart(
                    this.containerId,
                    chartUrl,
                    uiTitle
                );
                
                // Update descriptions
                const descriptions = this.generateDescriptions(this.processedData);
                this.updateChartDescriptions(descriptions);
                
                // Hide the loading indicator
                this.hideLoading();
                
                console.log(`[${this.containerId}] Chart type changed successfully to ${newType}.`);
            } catch (error) {
                console.error(`[${this.containerId}] Error changing chart type:`, error);
                this.showError(`Failed to change chart type: ${error.message}`);
            }
        }
    }

    /**
     * Override the base class method to ensure proper cleanup and loading states
     * @param {number} limit - Number of items to display
     */
    async changeDataLimit(limit) {
        if (!isNaN(limit) && limit > 0) {
            console.log(`[${this.containerId}] Changing data limit to ${limit}...`);
            
            // Show loading overlay
            this.showLoading('Updating data limit...');
            
            try {
                // Clean up existing chart before updating
                this.cleanupExistingChart();
                
                // Update options
                this.options.limit = limit;
                
                // Re-process data with new limit
                this.processedData = await this.processData(this.rawData);
                
                // Create new chart configuration
                const chartConfig = this.createChartConfig(this.processedData);
                
                // Generate chart URL
                const chartUrl = chartService.createChartUrl(chartConfig);
                
                // Update the chart
                const uiTitle = this.options.showDensity ? 'Global Population Density' : 'Global Population Distribution';
                
                chartUtils.displayChart(
                    this.containerId,
                    chartUrl,
                    uiTitle
                );
                
                // Update descriptions
                const descriptions = this.generateDescriptions(this.processedData);
                this.updateChartDescriptions(descriptions);
                
                // Hide the loading indicator
                this.hideLoading();
                
                console.log(`[${this.containerId}] Data limit changed successfully.`);
            } catch (error) {
                console.error(`[${this.containerId}] Error changing data limit:`, error);
                this.showError(`Failed to change data limit: ${error.message}`);
            }
        }
    }

    /**
     * Generate dynamic data-driven descriptions based on the actual chart data
     * @param {Object} data - Processed chart data
     * @returns {Object} Object containing chart descriptions
     */
    generateDescriptions(data) {
        // Safety check
        if (!data || !data.formatted || data.formatted.length === 0) {
            return this.generateStaticDescriptions();
        }
        
        // Get current options and state
        const sortOrder = this.options.sort || 'desc';
        const isAscending = sortOrder === 'asc';
        const showingDensity = this.options.showDensity || false;
        const popFilter = this.options.populationFilter || 'all';
        const chartType = this.options.type || 'bar';
        
        // Create context description based on filter
        let contextDesc = '';
        if (popFilter === 'highpop') {
            contextDesc = 'countries with populations over 100 million';
        } else if (popFilter === 'lowpop') {
            contextDesc = 'countries with populations under 10 million';
        } else {
            contextDesc = 'countries around the world';
        }
        
        // Set appropriate metric
        const metricName = showingDensity ? 'population density' : 'population';
        const metricUnit = showingDensity ? 'people per km²' : 'people';
        
        // Get insights based on actual data
        const insights = this.generateDataDrivenInsights(data);
        
        // Create title
        const title = showingDensity ? 'Global Population Density' : 'Global Population Distribution';
        
        // Create short description with actual data references
        const topCountry = data.formatted[0]?.name || 'Unknown';
        const bottomCountry = data.formatted[data.formatted.length - 1]?.name || 'Unknown';
        
        // Get superlative based on sort order and data view
        const superlative = isAscending ? 
            (showingDensity ? 'least densely populated' : 'least populated') : 
            (showingDensity ? 'most densely populated' : 'most populated');
        
        const shortDesc = `Comparison of ${metricName} across ${contextDesc}, highlighting ${topCountry} as the ${superlative} country shown.`;
        
        // Create detailed description
        let detailedDesc = `This chart displays the ${metricName} of ${data.formatted.length} ${contextDesc}`;
        
        if (chartType === 'bar' || chartType === 'line') {
            const sortContext = isAscending ? 'lowest to highest' : 'highest to lowest';
            detailedDesc += `, sorted from ${sortContext}. `;
        } else {
            detailedDesc += `. `;
        }
        
        // Add some contextual information about what's displayed
        if (showingDensity) {
            detailedDesc += `Population density (${metricUnit}) measures how many people live per square kilometer of land area.`;
        } else {
            detailedDesc += `The chart shows absolute population values measured in millions of ${metricUnit}.`;
        }
        
        // Create analysis text with real data insights
        let analysisText = `This visualization presents ${metricName} data across selected ${contextDesc}. `;
        
        if (data.formatted.length > 1) {
            const topValue = data.formatted[0].formatted;
            const secondValue = data.formatted[1].formatted;
            
            if (chartType === 'pie' || chartType === 'doughnut' || chartType === 'polarArea') {
                const total = data.values.reduce((sum, val) => sum + val, 0);
                const percentage = ((data.values[0] / total) * 100).toFixed(1);
                analysisText += `${topCountry} represents ${percentage}% of the total ${metricName} shown. `;
            } else {
                analysisText += `${topCountry} (${topValue} ${metricUnit}) leads, followed by ${data.formatted[1].name} (${secondValue} ${metricUnit}). `;
            }
        }
        
        // Add info about total countries in dataset
        analysisText += `Total countries in dataset: ${data.totalCountriesCount || 'unknown'}.`;
        
        return {
            title: title,
            short: shortDesc,
            detailed: detailedDesc,
            analysis: analysisText,
            insights: insights
        };
    }
    
    /**
     * Generate insights based on actual chart data
     * @param {Object} data - Processed chart data
     * @returns {Array} Array of insight strings
     */
    generateDataDrivenInsights(data) {
        const insights = [];
        const showingDensity = this.options.showDensity || false;
        const isAscending = this.options.sort === 'asc';
        
        // Safety check
        if (!data || !data.formatted || data.formatted.length === 0) {
            return [
                'No population data available for analysis.',
                'Try changing the population filter to view more countries.'
            ];
        }
        
        // Get top and bottom countries for reference
        const topCountry = data.formatted[0];
        const bottomCountry = data.formatted[data.formatted.length - 1];
        
        // First insight: Focus on the highest/lowest country
        if (showingDensity) {
            const densitySuperlative = isAscending ? 'lowest' : 'highest';
            insights.push(`${topCountry.name} has the ${densitySuperlative} population density at ${topCountry.formatted} people/km², reflecting its ${isAscending ? 'sparse' : 'dense'} settlement pattern.`);
        } else {
            const popSuperlative = isAscending ? 'smallest' : 'largest';
            insights.push(`${topCountry.name} has the ${popSuperlative} population at ${topCountry.formatted} people, representing a significant ${isAscending ? 'minority' : 'portion'} of global population.`);
        }
        
        // Second insight: Regional patterns if we have region data
        if (data.formatted.length > 1) {
            // Group by region to find patterns
            const regionCounts = {};
            data.formatted.forEach(country => {
                if (!regionCounts[country.region]) {
                    regionCounts[country.region] = 0;
                }
                regionCounts[country.region]++;
            });
            
            // Find most common region
            let mostCommonRegion = '';
            let highestCount = 0;
            
            for (const [region, count] of Object.entries(regionCounts)) {
                if (count > highestCount) {
                    mostCommonRegion = region;
                    highestCount = count;
                }
            }
            
            if (mostCommonRegion && mostCommonRegion !== 'Unknown') {
                insights.push(`${mostCommonRegion} is prominently represented with ${highestCount} countries in this chart, suggesting regional demographic patterns.`);
            }
        }
        
        // Third insight: Comparison between extremes
        if (data.formatted.length > 1) {
            if (showingDensity) {
                const ratio = Math.round(topCountry.value / bottomCountry.value * 10) / 10;
                if (ratio > 1) {
                    insights.push(`${topCountry.name} is approximately ${ratio} times more densely populated than ${bottomCountry.name}, highlighting significant settlement pattern differences.`);
                }
            } else {
                const ratio = Math.round(topCountry.value / bottomCountry.value);
                if (ratio > 1) {
                    insights.push(`${topCountry.name}'s population is approximately ${ratio} times larger than ${bottomCountry.name}'s, demonstrating wide demographic variation.`);
                }
            }
        }
        
        // Fourth insight: Special observation based on data view
        if (showingDensity) {
            // For density view, create insight about urbanization or geography
            const highDensityNames = data.formatted.filter(c => c.density > 200).map(c => c.name).slice(0, 2);
            
            if (highDensityNames.length > 0) {
                insights.push(`${highDensityNames.join(' and ')} show higher population densities often associated with urbanization, economic hubs, or geographic constraints.`);
            } else {
                insights.push(`Population density reflects geographic constraints, urbanization levels, and land use policies of different countries.`);
            }
        } else {
            // For population view, create insight about global influence
            const topThreePopulation = data.formatted.slice(0, Math.min(3, data.formatted.length)).map(c => c.name);
            
            if (topThreePopulation.length > 0) {
                insights.push(`${topThreePopulation.join(', ')} ${topThreePopulation.length > 1 ? 'are major demographic powers' : 'is a major demographic power'} with significant influence on global economics, politics, and resource consumption.`);
            }
        }
        
        // Final insight: Data-specific conclusion
        const popFilter = this.options.populationFilter || 'all';
        if (popFilter === 'highpop') {
            insights.push(`Countries with populations over 100 million face unique challenges in resource distribution, governance, and sustainable development.`);
        } else if (popFilter === 'lowpop') {
            insights.push(`Countries with smaller populations often have different economic models and development patterns compared to their larger counterparts.`);
        } else if (showingDensity) {
            insights.push(`Population density variations highlight different settlement patterns shaped by history, geography, and economic development.`);
        } else {
            insights.push(`Population distribution impacts a country's economic strength, international influence, and internal development priorities.`);
        }
        
        return insights;
    }
    
    /**
     * Generate static descriptions when no data is available
     * This method is kept for fallback purposes
     * @returns {Object} Object containing chart descriptions
     */
    generateStaticDescriptions() {
        const showingDensity = this.options.showDensity || false;
        const popFilter = this.options.populationFilter || 'all';
        
        // Get context description based on filter
        let contextDesc = '';
        if (popFilter === 'highpop') {
            contextDesc = 'countries with populations over 100 million';
        } else if (popFilter === 'lowpop') {
            contextDesc = 'countries with populations under 10 million';
        } else {
            contextDesc = 'countries around the world';
        }

        // Set appropriate metric
        const metric = showingDensity ? 'population density (people per km²)' : 'total population';

        return {
            title: showingDensity ? 'Global Population Density' : 'Global Population Distribution',
            short: `${showingDensity ? 'Population density' : 'Population'} comparison across ${contextDesc}.`,
            detailed: `This chart displays the ${metric} of selected ${contextDesc}. ` +
                     `You can sort the data in ascending or descending order using the controls above. ` +
                     `The chart type can be changed to view the data in different formats.`,
            analysis: `${showingDensity ? 'Population density' : 'Population'} distribution for ${contextDesc}. ` +
                      `Use the sort controls to arrange by highest or lowest values. ` +
                      `Total countries in database: ${this.rawData ? this.rawData.length : 'loading...'}`,
            insights: [
                showingDensity ? 
                  'Population density varies significantly based on geography, urbanization, and land availability.' : 
                  'The most populous countries have significant influence on global economics and politics.',
                'You can change the sort order using the controls to see different perspectives.',
                showingDensity ? 
                  'Densely populated areas face unique challenges in urban planning and resource management.' : 
                  'Population growth rates continue to vary significantly across different regions of the world.',
                'Switch between population and density views for different analytical perspectives.'
            ]
        };
    }
}