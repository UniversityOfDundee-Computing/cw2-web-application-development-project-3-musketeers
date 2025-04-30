/**
 * Continent Population Chart Component
 * Extends BaseChart to create continent-specific visualizations
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

export class ContinentChart extends BaseChart {
    /**
     * Create a new ContinentChart instance
     * @param {string} containerId - The ID of the container element
     * @param {Object} options - Chart configuration options
     */
    constructor(containerId, options = {}) {
        super(containerId, {
            title: 'World Population by Continent',
            type: 'doughnut',
            colorScheme: 'default',
            chartType: 'continent', // Add chart type identifier for dynamic descriptions
            supportedChartTypes: ['doughnut', 'pie', 'bar', 'polarArea'],
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
            console.error('Invalid country data received for continent chart');
            return { labels: [], values: [], formatted: [] };
        }
        
        // Group countries by continent
        const continents = {};
        const continentArea = {};
        const continentPopulation = {};
        
        // Process each country
        data.forEach(country => {
            if (country.continents && country.continents[0]) {
                const continent = country.continents[0];
                
                // Initialize continent data if it doesn't exist
                if (!continents[continent]) {
                    continents[continent] = 0;
                    continentArea[continent] = 0;
                    continentPopulation[continent] = 0;
                }
                
                // Add country population to continent
                if (country.population) {
                    continents[continent]++;
                    continentPopulation[continent] += country.population;
                }
                
                // Add country area to continent
                if (country.area) {
                    continentArea[continent] += country.area;
                }
            }
        });
        
        // Prepare data arrays based on selected view
        let continentData = [];
        
        if (this.options.dataView === 'area') {
            // Land area view
            continentData = Object.entries(continentArea).map(([continent, area]) => ({
                name: continent,
                value: area,
                countries: continents[continent],
                population: continentPopulation[continent],
                area: area
            }));
        } else if (this.options.dataView === 'density') {
            // Density view (population / area)
            continentData = Object.entries(continentArea).map(([continent, area]) => ({
                name: continent,
                value: area > 0 ? Math.round(continentPopulation[continent] / area) : 0,
                countries: continents[continent],
                population: continentPopulation[continent],
                area: area
            }));
        } else {
            // Default: Population view
            continentData = Object.entries(continentPopulation).map(([continent, population]) => ({
                name: continent,
                value: population,
                countries: continents[continent],
                population: population,
                area: continentArea[continent]
            }));
        }
        
        // Calculate total for percentages
        const totalValue = continentData.reduce((sum, item) => sum + item.value, 0);
        
        // Sort continents based on sort option
        switch (this.options.sort) {
            case 'asc':
                continentData.sort((a, b) => a.value - b.value);
                break;
            case 'desc':
            default:
                continentData.sort((a, b) => b.value - a.value);
                break;
        }
        
        // Format data
        return {
            labels: continentData.map(c => c.name),
            values: continentData.map(c => c.value),
            formatted: continentData.map(c => {
                const percentage = ((c.value / totalValue) * 100).toFixed(2);
                let metric = '';
                
                if (this.options.dataView === 'population') {
                    metric = 'people';
                } else if (this.options.dataView === 'area') {
                    metric = 'km²';
                } else if (this.options.dataView === 'density') {
                    metric = 'people/km²';
                }
                
                return {
                    continent: c.name,
                    value: c.value,
                    formatted: new Intl.NumberFormat().format(c.value),
                    percentage: percentage,
                    population: c.population,
                    area: c.area,
                    countries: c.countries,
                    metric: metric
                };
            })
        };
    }

    /**
     * Create chart configuration for continent data
     * @param {Object} data - Processed continent data
     * @returns {Object} Chart configuration for QuickChart API
     */
    createChartConfig(data) {
        // Use the currently selected chart type instead of hardcoding
        const chartType = this.options.type || 'doughnut';
        console.log(`[${this.containerId}] Creating continent chart with type: ${chartType}`);

        const baseColors = generateHueVariants(COLORS.primary, data.labels.length);
        const backgroundColors = baseColors.map(color => hexToRgba(color, 0.75));
        const borderColors = baseColors.map(color => darkenHexColor(color, 0.8));
        
        // Set up label formatting based on percentage view option
        const labelCallback = (context) => {
            const item = data.formatted[context.dataIndex];
            if (!item) return '';
            
            if (this.options.showPercentage) {
                return `${item.percentage}%`;
            } else {
                return item.formatted;
            }
        };
        
        // Format data for display
        const values = this.options.showPercentage 
            ? data.formatted.map(item => parseFloat(item.percentage)) 
            : data.values;
        
        // Get title based on the current sort order
        const titleText = this.getTitleBasedOnSortOrder();
            
        const config = {
            type: chartType, // Use the variable instead of hardcoding
            data: {
                labels: data.labels,
                datasets: [{
                    data: values,
                    backgroundColor: generateHueVariants(COLORS.primary, data.labels.length).map(color =>
                        hexToRgba(color, 0.75)
                    ),
                    // borderColor: hexToRgba(COLORS.primary, 1),
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
                        text: titleText,
                        font: {
                            size: 24,
                            family: 'Roboto, sans-serif',
                            weight: 600
                        },
                        color: COLORS.textPrimary,
                        padding: {bottom: 24}
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: COLORS.textSecondary,
                            font: {
                                size: 14,
                                family: 'Roboto, sans-serif',
                                weight: 'bold'
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const item = data.formatted[context.dataIndex];
                                if (!item) return 'No data';
                                
                                // Different tooltip based on data view
                                const valueLabel = this.options.showPercentage 
                                    ? `${item.percentage}%` 
                                    : `${item.formatted} ${item.metric}`;
                                    
                                return [
                                    `${this.getDataViewLabel()}: ${valueLabel}`,
                                    `Countries: ${item.countries}`,
                                    `Population: ${new Intl.NumberFormat().format(item.population)}`,
                                    `Area: ${new Intl.NumberFormat().format(item.area)} km²`
                                ];
                            }
                        }
                    }
                }
            }
        };
        
        // Add specific configurations based on chart type
        if (chartType === 'pie' || chartType === 'doughnut' || chartType === 'polarArea') {
            // Explicitly hide numerical values for non-bar chart types
            if (!config.options.plugins.datalabels) {
                config.options.plugins.datalabels = {};
            }
            config.options.plugins.datalabels.display = false;
        } else if (chartType === 'bar' || chartType === 'line') {
            // Add scales for cartesian charts (bar, line)
            config.options.scales = {
                x: {
                    ticks: {
                        color: COLORS.textSecondary,
                        font: {
                            size: 14,
                            family: 'Roboto, sans-serif',
                            weight: 'bold'
                        }
                    },
                    grid: { display: false }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: COLORS.textSecondary,
                        font: {
                            size: 14,
                            family: 'Roboto, sans-serif',
                            weight: 'bold'
                        },
                        callback: value => {
                            if (this.options.showPercentage) {
                                return `${value}%`;
                            }
                            return dataProcessing.formatNumber(value);
                        }
                    },
                    grid: { color: "#eee" }
                }
            };
            
            // For bar charts, we might want to hide the legend
            if (chartType === 'bar') {
                config.options.plugins.legend.display = false;
            }
        }
        
        return config;
    }

    /**
     * Create continent-specific chart controls
     */
    createChartControls() {
        // Create base controls first (chart type selector)
        super.createChartControls();
        
        if (!this.chartControls) return;
        
        // 1. Add a continent-specific view toggle for population vs area
        const viewGroup = document.createElement('div');
        viewGroup.className = 'form-group me-2 mb-2';
        
        const viewSelect = document.createElement('select');
        viewSelect.className = 'form-select form-select-sm continent-view-select';
        viewSelect.setAttribute('aria-label', 'Select data view');
        
        const viewOptions = [
            { value: 'population', text: 'Population' },
            { value: 'area', text: 'Land Area' },
            { value: 'density', text: 'Population Density' }
        ];
        
        viewOptions.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.text;
            if (option.value === (this.options.dataView || 'population')) {
                optionEl.selected = true;
            }
            viewSelect.appendChild(optionEl);
        });
        
        viewSelect.addEventListener('change', (e) => {
            this.changeDataView(e.target.value);
        });
        
        viewGroup.appendChild(viewSelect);
        this.chartControls.appendChild(viewGroup);
        
        // 2. Add percentage/absolute toggle
        const displayGroup = document.createElement('div');
        displayGroup.className = 'form-group me-2 mb-2';
        
        const displayCheck = document.createElement('div');
        displayCheck.className = 'form-check form-switch';
        
        const displayInput = document.createElement('input');
        displayInput.className = 'form-check-input';
        displayInput.type = 'checkbox';
        displayInput.id = `${this.containerId}-percentage-toggle`;
        displayInput.setAttribute('role', 'switch');
        displayInput.checked = this.options.showPercentage || false;
        
        const displayLabel = document.createElement('label');
        displayLabel.className = 'form-check-label ms-2';
        displayLabel.htmlFor = `${this.containerId}-percentage-toggle`;
        displayLabel.textContent = 'Show Percentages';
        
        displayInput.addEventListener('change', (e) => {
            this.togglePercentageView(e.target.checked);
        });
        
        displayCheck.appendChild(displayInput);
        displayCheck.appendChild(displayLabel);
        displayGroup.appendChild(displayCheck);
        this.chartControls.appendChild(displayGroup);
    }

    /**
     * Change the data view (population, area, or density)
     * @param {string} view - Type of data to display
     */
    async changeDataView(view) {
        console.log(`[${this.containerId}] Changing data view to: ${view}`);
        
        // Show loading overlay
        this.showLoading();
        
        try {
            // Clean up existing chart before updating
            this.cleanupExistingChart();
            
            // Store view option
            this.options.dataView = view;
            
            // Re-process data with the new view
            this.processedData = await this.processData(this.rawData);
            
            // Update title based on the data view and sort order
            this.options.title = this.getTitleBasedOnSortOrder();
            
            // Create new chart configuration
            const chartConfig = this.createChartConfig(this.processedData);
            
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
            
            // Update the chart title in the DOM
            const titleElement = this.container.querySelector('.chart-title');
            if (titleElement) {
                titleElement.textContent = this.options.title;
            }
        } catch (error) {
            console.error(`[${this.containerId}] Error changing data view:`, error);
            this.showError(`Failed to change data view: ${error.message}`);
        }
    }

    /**
     * Toggle between absolute values and percentages
     * @param {boolean} showPercentage - Whether to show percentage values
     */
    async togglePercentageView(showPercentage) {
        console.log(`[${this.containerId}] Toggling percentage view: ${showPercentage}`);
        
        // Show loading overlay
        this.showLoading();
        
        try {
            // Clean up existing chart before updating
            this.cleanupExistingChart();
            
            // Store percentage view option
            this.options.showPercentage = showPercentage;
            
            // No need to re-process data, just update the chart configuration
            const chartConfig = this.createChartConfig(this.processedData);
            
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
            console.error(`[${this.containerId}] Error toggling percentage view:`, error);
            this.showError(`Failed to update percentage view: ${error.message}`);
        }
    }

    /**
     * Get an appropriate title based on current options and sort order
     * @returns {string} Chart title
     */
    getTitleBasedOnSortOrder() {
        const sortOrder = this.options.sort || 'desc';
        const dataView = this.options.dataView || 'population';
        
        // Base title parts
        let baseTitle = '';
        
        // Set base title based on data view
        switch (dataView) {
            case 'area':
                baseTitle = 'Continental Land Area';
                break;
            case 'density':
                baseTitle = 'Population Density by Continent';
                break;
            case 'population':
            default:
                baseTitle = 'World Population by Continent';
                break;
        }
        
        // Add sort order context for bar charts
        if (this.options.type === 'bar') {
            const sortContext = sortOrder === 'asc' ? '(Smallest to Largest)' : '(Largest to Smallest)';
            return `${baseTitle} ${sortContext}`;
        }
        
        return baseTitle;
    }
    
    /**
     * Get the label for the current data view
     * @returns {string} The label describing the current data view
     */
    getDataViewLabel() {
        switch (this.options.dataView) {
            case 'area':
                return 'Land Area';
            case 'density':
                return 'Population Density';
            case 'population':
            default:
                return 'Population';
        }
    }
    
    /**
     * Override the base class method to ensure sort order is reflected in title and descriptions
     * @param {string} sortOrder - Sort order ('asc', 'desc', or 'alpha')
     */
    async changeSortOrder(sortOrder) {
        if (['asc', 'desc'].includes(sortOrder)) {
            console.log(`[${this.containerId}] Changing sort order to ${sortOrder}...`);
            
            // Show loading overlay
            this.showLoading();
            
            try {
                // Clean up existing chart before updating
                this.cleanupExistingChart();
                
                // Update options
                this.options.sort = sortOrder;
                
                // Re-process data with new sort order
                if (this.rawData) {
                    this.processedData = await this.processData(this.rawData);
                }
                
                // Update title to reflect the sort order
                this.options.title = this.getTitleBasedOnSortOrder();
                
                // Re-create chart configuration with updated title
                const chartConfig = this.createChartConfig(this.processedData);
                
                // Ensure we're using the correct chart type
                chartConfig.type = this.options.type;
                
                // Generate chart URL
                const chartUrl = chartService.createChartUrl(chartConfig);
                
                // Update the chart
                chartUtils.displayChart(
                    this.containerId,
                    chartUrl,
                    this.options.title
                );
                
                // Generate and update descriptions to reflect the sort change
                const descriptions = this.generateDescriptions(this.processedData);
                this.updateChartDescriptions(descriptions);
                
                // Update the chart title in the DOM
                const titleElement = this.container.querySelector('.chart-title');
                if (titleElement) {
                    titleElement.textContent = this.options.title;
                }
                
                console.log(`[${this.containerId}] Sort order changed successfully to ${sortOrder}.`);
            } catch (error) {
                console.error(`[${this.containerId}] Error changing sort order:`, error);
                this.showError(`Failed to change sort order: ${error.message}`);
            }
        }
    }
    
    /**
     * Override the base class method to ensure chart type changes include cleanup
     * @param {string} newType - New chart type ('bar', 'pie', etc.)
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
                
                // Store the original title to preserve it after chart type change
                const originalTitle = this.options.title;
                
                // Re-process data to ensure correct formatting for the new chart type
                if (this.rawData) {
                    this.processedData = await this.processData(this.rawData);
                }
                
                // Update title based on the new chart type
                this.options.title = this.getTitleBasedOnSortOrder();
                
                // Create new chart configuration
                const chartConfig = this.createChartConfig(this.processedData);
                
                // Force the chart type to be the selected type
                chartConfig.type = newType;
                
                // Generate chart URL
                const chartUrl = chartService.createChartUrl(chartConfig);
                
                // Update the chart
                chartUtils.displayChart(
                    this.containerId,
                    chartUrl,
                    this.options.title
                );
                
                // Update descriptions
                const descriptions = this.generateDescriptions(this.processedData);
                this.updateChartDescriptions(descriptions);
                
                // Update the chart title in the DOM
                const titleElement = this.container.querySelector('.chart-title');
                if (titleElement) {
                    titleElement.textContent = this.options.title;
                }
                
                console.log(`[${this.containerId}] Chart type changed successfully to ${newType}.`);
            } catch (error) {
                console.error(`[${this.containerId}] Error changing chart type:`, error);
                this.showError(`Failed to change chart type: ${error.message}`);
            }
        }
    }
    
    /**
     * Override the base class method to ensure data limits include cleanup
     * @param {number} limit - Number of items to display
     */
    async changeDataLimit(limit) {
        if (!isNaN(limit) && limit > 0) {
            console.log(`[${this.containerId}] Changing data limit to ${limit}...`);
            
            // Show loading overlay
            this.showLoading();
            
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
                this.showError(`Failed to change data limit: ${error.message}`);
            }
        }
    }

    /**
     * Generate continent-specific descriptions
     * Override the base class method to ensure descriptions match the current sort order
     * @param {Object} data - Processed chart data
     * @returns {Object} Object containing chart descriptions
     */
    generateDescriptions(data) {
        // Get current options
        const isAscending = this.options.sort === 'asc';
        const dataView = this.options.dataView || 'population';
        const showingPercentage = this.options.showPercentage || false;
        const chartType = this.options.type || 'doughnut';
        
        // Get information about continents
        const continentCount = data.labels ? data.labels.length : 0;
        
        // Get metric type based on data view
        let metricType, metricUnit;
        switch (dataView) {
            case 'area':
                metricType = 'land area';
                metricUnit = 'km²';
                break;
            case 'density':
                metricType = 'population density';
                metricUnit = 'people per km²';
                break;
            case 'population':
            default:
                metricType = 'population';
                metricUnit = 'people';
                break;
        }
        
        // Get top continent based on sorting
        const topContinent = data.formatted && data.formatted.length > 0 ? data.formatted[0].continent : 'Unknown';
        
        // Get appropriate superlatives based on sort order
        const superlative = isAscending ? 'smallest' : 'largest';
        const densitySuperlative = isAscending ? 'lowest' : 'highest';
        const sortContext = isAscending ? 'smallest to largest' : 'largest to smallest';
        
        // Get appropriate superlative based on data view
        let viewSuperlative = '';
        switch (dataView) {
            case 'area':
                viewSuperlative = isAscending ? 'smallest' : 'largest';
                break;
            case 'density':
                viewSuperlative = isAscending ? 'least densely populated' : 'most densely populated';
                break;
            case 'population':
            default:
                viewSuperlative = isAscending ? 'least populated' : 'most populated';
                break;
        }
        
        // Create insights array
        const insights = [];
        
        // Add insights based on data
        if (data.formatted && data.formatted.length > 0) {
            const first = data.formatted[0];
            const viewLabel = this.getDataViewLabel().toLowerCase();
            
            // First insight: top continent
            if (dataView === 'population') {
                insights.push(`${first.continent} is the ${viewSuperlative} continent with ${first.formatted} ${first.metric}, representing ${first.percentage}% of the world's population.`);
            } else if (dataView === 'area') {
                insights.push(`${first.continent} has the ${viewSuperlative} landmass with ${first.formatted} ${first.metric}, representing ${first.percentage}% of the world's land area.`);
            } else {
                insights.push(`${first.continent} has the ${viewSuperlative} with ${first.formatted} ${first.metric}.`);
            }
            
            // Additional insights
            if (data.formatted.length > 1) {
                const secondContinent = data.formatted[1].continent;
                const secondValue = data.formatted[1].formatted;
                const secondMetric = data.formatted[1].metric;
                
                insights.push(`${secondContinent} is second with ${secondValue} ${secondMetric}.`);
            }
            
            // Comparison between largest and smallest
            if (data.formatted.length > 1) {
                const last = data.formatted[data.formatted.length - 1];
                const ratio = Math.round(first.value / last.value * 10) / 10;
                
                if (ratio > 1) {
                    insights.push(`${first.continent} has approximately ${ratio} times the ${viewLabel} of ${last.continent}.`);
                }
            }
            
            // Final insight about overall world distribution
            switch (dataView) {
                case 'area':
                    insights.push(`Continental land area distribution affects population density, resources, and biodiversity patterns.`);
                    break;
                case 'density':
                    insights.push(`Population density variations reflect differences in urbanization, geography, and development.`);
                    break;
                case 'population':
                default:
                    insights.push(`Population distribution across continents reflects historical patterns of migration, development, and resource availability.`);
                    break;
            }
        }
        
        // Create title based on options
        const title = this.getTitleBasedOnSortOrder();
        
        // Create detailed description based on chart type and data view
        let detailedDesc = `This ${chartType} chart displays the ${metricType} distribution across ${continentCount} continents`;
        
        if (chartType === 'bar') {
            detailedDesc += `, sorted from ${sortContext}`;
        }
        
        if (showingPercentage) {
            detailedDesc += `, with values shown as percentages of the total.`;
        } else {
            detailedDesc += `, with absolute values in ${metricUnit}.`;
        }
        
        // Create short description
        const shortDesc = `Comparison of continental ${metricType} showing ${topContinent} with the ${viewSuperlative} value.`;
        
        // Analysis text (for expanded view)
        const analysisText = `This visualization presents ${metricType} data across all continents, highlighting ${topContinent} as having the ${viewSuperlative} value. The chart reveals geographical patterns in global ${metricType} distribution.`;
        
        return {
            title: title,
            short: shortDesc,
            detailed: detailedDesc,
            analysis: analysisText,
            insights: insights
        };
    }
}