/**
 * Borders Chart Component
 * Extends BaseChart to create border-specific visualizations
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

export class BordersChart extends BaseChart {
    /**
     * Create a new BordersChart instance
     * @param {string} containerId - The ID of the container element
     * @param {Object} options - Chart configuration options
     */
    constructor(containerId, options = {}) {
        super(containerId, {
            title: 'Border Count by Country',
            type: 'bar',
            colorScheme: 'default',
            limit: 5,
            sort: 'desc', // Default sort by most borders first
            chartType: 'borders', // Add chart type identifier for dynamic descriptions
            supportedChartTypes: ['bar', 'pie', 'doughnut'],
            ...options
        });
        
        // Remove showBorderDensity as we're removing that feature
        if (this.options.showBorderDensity) {
            delete this.options.showBorderDensity;
        }
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
            console.error('Invalid country data received for borders chart');
            return { labels: [], values: [], formatted: [] };
        }
        
        // Process border data for each country
        const countryBorders = [];
        
        data.forEach(country => {
            // Skip if missing relevant data
            if (!country.name) return;
            
            // Get number of borders - handle case where borders property is missing (island nations)
            const borders = country.borders || [];
            const borderCount = Array.isArray(borders) ? borders.length : 0;
            
            // Apply filter based on selected border range
            if (this.options.borderRange === 'no-borders' && borderCount > 0) {
                return;
            } else if (this.options.borderRange === '1-2' && (borderCount < 1 || borderCount > 2)) {
                return;
            } else if (this.options.borderRange === '3-5' && (borderCount < 3 || borderCount > 5)) {
                return;
            } else if (this.options.borderRange === '6-plus' && borderCount < 6) {
                return;
            }
            
            // Store relevant country data
            countryBorders.push({
                name: country.name.common,
                borderCount: borderCount,
                area: country.area || 0,
                continent: country.continent || country.region || 'Unknown',
                borderingCountries: borders || []
            });
        });

        // Log for debugging
        console.log(`[${this.containerId}] Filtered to ${countryBorders.length} countries for range: ${this.options.borderRange}`);
        
        // Check if we have any data after filtering
        if (countryBorders.length === 0) {
            console.warn(`[${this.containerId}] No countries match the current filter criteria.`);
            
            // For "no-borders" option, we might not be correctly identifying island countries
            // Add a fallback mechanism
            if (this.options.borderRange === 'no-borders') {
                console.log(`[${this.containerId}] Trying alternative approach for island countries...`);
                
                // Try a different approach to find island countries
                data.forEach(country => {
                    if (!country.name) return;
                    
                    // Check if this is an island (no borders or empty borders array)
                    const hasBorders = country.borders && Array.isArray(country.borders) && country.borders.length > 0;
                    
                    if (!hasBorders) {
                        countryBorders.push({
                            name: country.name.common,
                            borderCount: 0,
                            area: country.area || 0,
                            continent: country.continent || country.region || 'Unknown',
                            borderingCountries: []
                        });
                    }
                });
                
                console.log(`[${this.containerId}] Found ${countryBorders.length} island countries with alternative approach.`);
            }
        }
        
        // Sort the data based on selected sort option
        if (this.options.sort === 'asc') {
            countryBorders.sort((a, b) => a.borderCount - b.borderCount);
        } else if (this.options.sort === 'desc' || !this.options.sort) {
            countryBorders.sort((a, b) => b.borderCount - a.borderCount);
        } else if (this.options.sort === 'alphabetical') {
            countryBorders.sort((a, b) => a.name.localeCompare(b.name));
        } else if (this.options.sort === 'area') {
            countryBorders.sort((a, b) => b.area - a.area);
        } else {
            // Default: Sort by most borders
            countryBorders.sort((a, b) => b.borderCount - a.borderCount);
        }
        
        // Apply display limit
        let limitedBorders = countryBorders;
        const limit = parseInt(this.options.limit);
        if (!isNaN(limit) && limit > 0 && limit < countryBorders.length) {
            limitedBorders = countryBorders.slice(0, limit);
            
            // Update the title to reflect the number of items shown
            const currentTitle = this.options.title || 'Border Count by Country';
            
            // Remove any existing count indicators
            let updatedTitle = currentTitle.replace(/ \(Top \d+\)/, '');
            
            // Don't add "Top X" if we're showing all or no data is available
            if (limitedBorders.length > 0 && limitedBorders.length < countryBorders.length) {
                this.options.title = `${updatedTitle} (Top ${limitedBorders.length})`;
            } else {
                this.options.title = updatedTitle;
            }
        }
        
        // Generate chart data labels and values
        const labels = limitedBorders.map(country => country.name);
        const values = limitedBorders.map(country => country.borderCount);
        
        // Format data for chart
        return {
            labels: labels,
            values: values,
            formatted: limitedBorders,
            totalCount: countryBorders.length // Store total count for insights
        };
    }

    /**
     * Create chart configuration for borders data
     * @param {Object} data - Processed borders data
     * @returns {Object} Chart configuration for QuickChart API
     */
    createChartConfig(data) {
        // Determine appropriate colors based on options
        let backgroundColor, borderColor;
        const chartType = this.options.type || 'bar';
        const isPieOrDoughnut = chartType === 'pie' || chartType === 'doughnut';
        
        // Default color scheme
        if (isPieOrDoughnut) {
            // For pie/doughnut charts, use a color array for better distinction
            const pieColors = [
                'rgba(54, 162, 235, 0.7)',
                'rgba(255, 99, 132, 0.7)',
                'rgba(255, 206, 86, 0.7)',
                'rgba(75, 192, 192, 0.7)',
                'rgba(153, 102, 255, 0.7)',
                'rgba(255, 159, 64, 0.7)',
                'rgba(201, 203, 207, 0.7)',
                'rgba(100, 149, 237, 0.7)',
                'rgba(50, 205, 50, 0.7)',
                'rgba(255, 127, 80, 0.7)'
            ];
            
            backgroundColor = [];
            borderColor = [];
            data.formatted.forEach((_, idx) => {
                const colorIndex = idx % pieColors.length;
                backgroundColor.push(pieColors[colorIndex]);
                borderColor.push(pieColors[colorIndex].replace('0.7', '1.0'));
            });
        } else {
            backgroundColor = hexToRgba(COLORS.primaryLight, 0.75);
            borderColor = hexToRgba(COLORS.primary, 1);
        }
        
        const chartConfig = {
            type: chartType,
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Number of Borders',
                    data: data.values,
                    backgroundColor: backgroundColor,
                    borderColor: borderColor,
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
                        text: this.options.title || 'Border Count by Country',
                        font: {
                            size: 24,
                            family: 'Roboto, sans-serif',
                            weight: 600
                        },
                        color: COLORS.textPrimary,
                        padding: {bottom: 24}
                    },
                    legend: {
                        display: isPieOrDoughnut,
                        position: isPieOrDoughnut && data.labels.length <= 7 ? 'right' : 'bottom',
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
                                const country = data.formatted[context.dataIndex];
                                if (!country) return 'No data';
                                
                                const labels = [];
                                
                                // For pie/doughnut charts, add country name if not in label
                                if (isPieOrDoughnut) {
                                    labels.push(`${country.name}: ${country.borderCount} borders`);
                                } else {
                                    labels.push(`Borders: ${country.borderCount}`);
                                }
                                
                                if (country.borderCount > 0) {
                                    // Show a sample of bordering countries in tooltip
                                    const sampleSize = Math.min(country.borderingCountries.length, 3);
                                    const sampleBorders = country.borderingCountries.slice(0, sampleSize);
                                    const remainingCount = country.borderingCountries.length - sampleSize;
                                    
                                    labels.push(`Borders with: ${sampleBorders.join(', ')}${remainingCount > 0 ? ` and ${remainingCount} more` : ''}`);
                                }
                                
                                labels.push(`Continent: ${country.continent}`);
                                
                                return labels;
                            }
                        }
                    }
                }
            }
        };
        
        // Configure chart based on type
        if (!isPieOrDoughnut) {
            // Bar chart specific settings
            chartConfig.options.indexAxis = chartType === 'horizontalBar' ? 'y' : 'x';
            
            // Setup scales for bar charts
            chartConfig.options.scales = {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: chartType === 'horizontalBar' ? 'Country' : 'Number of Borders',
                        font: {
                            size: 14,
                            family: 'Roboto, sans-serif',
                            weight: 'bold'
                        },
                        color: COLORS.textSecondary,
                        padding: {bottom: 12}
                    },
                    ticks: {
                        maxRotation: chartType === 'horizontalBar' ? 0 : 45,
                        minRotation: chartType === 'horizontalBar' ? 0 : 45,
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: chartType === 'horizontalBar' ? 'Number of Borders' : 'Country',
                        font: {
                            size: 14,
                            family: 'Roboto, sans-serif',
                            weight: 'bold'
                        },
                        color: COLORS.textSecondary,
                        padding: {bottom: 12}
                    },
                    ticks: {
                        // Customize y-axis ticks based on item count
                        callback: function(value, index, values) {
                            // For standard bar charts, truncate country names if too long
                            if (chartType !== 'horizontalBar' && typeof value === 'string' && value.length > 15) {
                                return value.substring(0, 15) + '...';
                            }
                            return value;
                        }
                    }
                }
            };
            
            // Adjust label rotation and size based on the number of items
            if (data.labels && data.labels.length > 0) {
                const labelCount = data.labels.length;
                
                if (chartType === 'horizontalBar') {
                    // For horizontal bar charts
                    if (labelCount > 10) {
                        chartConfig.options.scales.y.ticks.font = { size: 10 };
                    } else if (labelCount > 5) {
                        chartConfig.options.scales.y.ticks.font = { size: 11 };
                    } else {
                        chartConfig.options.scales.y.ticks.font = { size: 12 };
                    }
                } else {
                    // For vertical bar charts
                    if (labelCount > 15) {
                        chartConfig.options.scales.x.ticks = {
                            maxRotation: 90,
                            minRotation: 75,
                            font: { size: 8 }
                        };
                    } else if (labelCount > 10) {
                        chartConfig.options.scales.x.ticks = {
                            maxRotation: 75,
                            minRotation: 75,
                            font: { size: 9 }
                        };
                    } else if (labelCount > 5) {
                        chartConfig.options.scales.x.ticks = {
                            maxRotation: 65,
                            minRotation: 45,
                            font: { size: 10 }
                        };
                    }
                }
            }
        } else {
            // Pie/Doughnut specific settings
            chartConfig.options.plugins.tooltip.callbacks.title = (tooltipItems) => {
                return tooltipItems[0].label;
            };
            
            // For pie/doughnut charts with many items, adjust the options
            if (data.labels && data.labels.length > 0) {
                const labelCount = data.labels.length;
                
                if (labelCount > 15) {
                    // Too many items for a pie/doughnut chart to be readable
                    // Hide legend completely and reduce label size
                    chartConfig.options.plugins.legend.display = false;
                    chartConfig.options.plugins.datalabels = {
                        display: false
                    };
                    // Make the chart smaller to fit more items
                    chartConfig.options.radius = '80%';
                } else if (labelCount > 10) {
                    // Many items - show legend at bottom with smaller font
                    chartConfig.options.plugins.legend.position = 'bottom';
                    chartConfig.options.plugins.legend.labels = {
                        font: { size: 9 },
                        boxWidth: 10
                    };
                    chartConfig.options.radius = '85%';
                } else if (labelCount > 5) {
                    // Medium number of items - right side legend works well
                    chartConfig.options.plugins.legend.position = 'right';
                    chartConfig.options.plugins.legend.labels = {
                        font: { size: 11 }
                    };
                    chartConfig.options.radius = '90%';
                } else {
                    // Few items - right side legend with normal sizing
                    chartConfig.options.plugins.legend.position = 'right';
                    chartConfig.options.plugins.legend.labels = {
                        font: { size: 12 }
                    };
                }
            }
        }
        
        
        return chartConfig;
    }

    /**
     * Create borders chart-specific chart controls
     */
    createChartControls() {
        // Create base controls first
        super.createChartControls();
        
        if (!this.chartControls) return;
        
        // Find the left controls container (created in BaseChart)
        const leftControls = this.chartControls.querySelector('div:first-child');
        if (!leftControls) return;
        
        // 1. Add border count range selector with consistent styling
        const rangeGroup = document.createElement('div');
        rangeGroup.className = 'form-group mb-0'; // Remove bottom margin for consistent alignment
        
        const rangeLabel = document.createElement('label');
        rangeLabel.className = 'me-2 fw-bold mb-0'; // Remove bottom margin for vertical alignment
        rangeLabel.style.minWidth = '80px'; // Ensure consistent label width
        rangeLabel.textContent = 'Border Count:';
        rangeGroup.appendChild(rangeLabel);
        
        const rangeSelect = document.createElement('select');
        rangeSelect.className = 'form-select form-select-sm border-range-select';
        rangeSelect.style.width = '130px'; // Fixed width for consistency
        rangeSelect.setAttribute('aria-label', 'Select border count range');
        
        const rangeOptions = [
            { value: 'all', text: 'All Countries' },
            { value: 'no-borders', text: 'No Borders (Islands)' },
            { value: '1-2', text: '1-2 Borders' },
            { value: '3-5', text: '3-5 Borders' },
            { value: '6-plus', text: '6+ Borders' },
        ];
        
        rangeOptions.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.text;
            if (option.value === (this.options.borderRange || 'all')) {
                optionEl.selected = true;
            }
            rangeSelect.appendChild(optionEl);
        });
        
        rangeSelect.addEventListener('click', (e) => {
            e.stopPropagation(); // Stop click from bubbling up
        });
        
        rangeSelect.addEventListener('change', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.changeBorderRange(e.target.value);
        });
        
        rangeGroup.appendChild(rangeSelect);
        leftControls.appendChild(rangeGroup);
        
    }

    /**
     * Change the border count range filter
     * @param {string} range - The border count range to filter by
     */
    async changeBorderRange(range) {
        console.log(`[${this.containerId}] Changing border range to: ${range}`);
        
        // Show loading overlay
        this.showLoading();
        
        try {
            // Clean up existing chart before updating
            this.cleanupExistingChart();
            
            // Store border range option
            this.options.borderRange = range;
            
            // Re-process data based on the border range
            this.processedData = await this.processData(this.rawData);
            
            // Update title based on range
            let rangeText = '';
            switch (range) {
                case 'no-borders':
                    rangeText = 'Countries with No Land Borders';
                    break;
                case '1-2':
                    rangeText = 'Countries with 1-2 Borders';
                    break;
                case '3-5':
                    rangeText = 'Countries with 3-5 Borders';
                    break;
                case '6-plus':
                    rangeText = 'Countries with 6+ Borders';
                    break;
                default:
                    rangeText = 'Border Count by Country';
            }
            
            this.options.title = rangeText;
            
            // Apply sort indicator to title if needed
            if (this.options.sort === 'asc') {
                this.options.title += ' (Fewest First)';
            } else if (this.options.sort === 'desc') {
                this.options.title += ' (Most First)';
            }
            
            // Create new chart configuration
            const chartConfig = this.createChartConfig(this.processedData);
            
            // Generate chart URL
            const chartUrl = chartService.createChartUrl(chartConfig);
            
            // Update the chart
            chartUtils.displayChart(
                this.containerId,
                chartUrl,
                this.options.title
            );
            
            // Generate descriptions that accurately reflect the current state
            const descriptions = this.generateBordersDescriptions(this.processedData);
            this.updateChartDescriptions(descriptions);
            
            // Update the chart title in the DOM
            const titleElement = this.container.querySelector('.chart-title');
            if (titleElement) {
                titleElement.textContent = this.options.title;
            }
        } catch (error) {
            console.error(`[${this.containerId}] Error changing border range:`, error);
            this.showError(`Failed to change border range: ${error.message}`);
        }
    }


    /**
     * Toggle between border count and border density
     * @param {boolean} showDensity - Whether to show border density
     */
    async toggleBorderDensity(showDensity) {
        console.log(`[${this.containerId}] Toggling border density: ${showDensity}`);
        
        // Show loading overlay
        this.showLoading();
        
        try {
            // Store density option
            this.options.showBorderDensity = showDensity;
            
            // Re-process data with new density setting
            this.processedData = await this.processData(this.rawData);
            
            // Update title to clearly indicate density or count
            const currentTitle = this.options.title || 'Border Count by Country';
            if (showDensity) {
                this.options.title = currentTitle.replace('Border Count', 'Border Density');
            } else {
                this.options.title = currentTitle.replace('Border Density', 'Border Count');
            }
            
            // Create new chart configuration
            const chartConfig = this.createChartConfig(this.processedData);
            
            // Generate chart URL
            const chartUrl = chartService.createChartUrl(chartConfig);
            
            // Update the chart
            chartUtils.displayChart(
                this.containerId,
                chartUrl,
                this.options.title
            );
            
            // Generate descriptions that accurately reflect the current density state
            const descriptions = this.generateBordersDescriptions(this.processedData);
            this.updateChartDescriptions(descriptions);
            
            // Update the chart title in the DOM
            const titleElement = this.container.querySelector('.chart-title');
            if (titleElement) {
                titleElement.textContent = this.options.title;
            }
        } catch (error) {
            console.error(`[${this.containerId}] Error toggling border density:`, error);
            this.showError(`Failed to toggle border density: ${error.message}`);
        }
    }

    /**
     * Override the base class method to ensure sort order is reflected in title and descriptions
     * @param {string} sortOrder - Sort order ('asc', 'desc', or 'alpha')
     */
    async changeSortOrder(sortOrder) {
        console.log(`[${this.containerId}] Changing sort order to: ${sortOrder}`);
        
        // Show loading overlay
        this.showLoading();
        
        try {
            // Clean up existing chart before updating
            this.cleanupExistingChart();
            
            // Store sort option
            this.options.sort = sortOrder;
            
            // Re-process data with new sort order
            this.processedData = await this.processData(this.rawData);
            
            // Update title based on sort order - first remove any existing sort indicators
            let currentTitle = this.options.title || 'Border Count by Country';
            currentTitle = currentTitle.replace(/ \(Fewest First\)| \(Most First\)/, '');
            
            // Add new sort indicator
            if (sortOrder === 'asc') {
                this.options.title = `${currentTitle} (Fewest First)`;
            } else if (sortOrder === 'desc') {
                this.options.title = `${currentTitle} (Most First)`;
            } else {
                this.options.title = currentTitle;
            }
            
            // Create new chart configuration
            const chartConfig = this.createChartConfig(this.processedData);
            
            // Generate chart URL
            const chartUrl = chartService.createChartUrl(chartConfig);
            
            // Update the chart
            chartUtils.displayChart(
                this.containerId,
                chartUrl,
                this.options.title
            );
            
            // Generate descriptions that accurately reflect the current sort order
            const descriptions = this.generateBordersDescriptions(this.processedData);
            this.updateChartDescriptions(descriptions);
            
            // Update the chart title in the DOM
            const titleElement = this.container.querySelector('.chart-title');
            if (titleElement) {
                titleElement.textContent = this.options.title;
            }
        } catch (error) {
            console.error(`[${this.containerId}] Error changing sort order:`, error);
            this.showError(`Failed to change sort order: ${error.message}`);
        }
    }

    /**
     * Override the base class method to ensure item limits are reflected in title and display
     * @param {number} limit - The number of items to display
     */
    async changeItemLimit(limit) {
        console.log(`[${this.containerId}] Changing item limit to: ${limit}`);
        
        // Show loading overlay
        this.showLoading();
        
        try {
            // Clean up existing chart before updating
            this.cleanupExistingChart();
            
            // Store new limit option
            this.options.limit = limit;
            
            // Re-process data
            this.processedData = await this.processData(this.rawData);
            
            // Update title to clearly show limit
            let currentTitle = this.options.title || 'Border Count by Country';
            
            // Remove any existing limit indicators
            currentTitle = currentTitle.replace(/ \(Top \d+\)/, '');
            
            // Add item count indicator if we're limiting the data
            const totalAvailable = this.processedData.totalCount || 0;
            const displayedItems = this.processedData.labels ? this.processedData.labels.length : 0;
            
            if (displayedItems > 0 && displayedItems < totalAvailable) {
                this.options.title = `${currentTitle} (Top ${displayedItems})`;
            } else {
                this.options.title = currentTitle;
            }
            
            // Create new chart configuration
            const chartConfig = this.createChartConfig(this.processedData);
            
            // Generate chart URL
            const chartUrl = chartService.createChartUrl(chartConfig);
            
            // Update the chart
            chartUtils.displayChart(
                this.containerId,
                chartUrl,
                this.options.title
            );
            
            // Generate descriptions that accurately reflect the current limit
            const descriptions = this.generateBordersDescriptions(this.processedData);
            this.updateChartDescriptions(descriptions);
            
            // Update the chart title in the DOM
            const titleElement = this.container.querySelector('.chart-title');
            if (titleElement) {
                titleElement.textContent = this.options.title;
            }
        } catch (error) {
            console.error(`[${this.containerId}] Error changing item limit:`, error);
            this.showError(`Failed to change item limit: ${error.message}`);
        }
    }

    /**
     * Generate borders-specific chart descriptions that accurately reflect current chart state
     * @param {Object} data - Processed chart data
     * @returns {Object} Borders-specific descriptions
     */
    generateBordersDescriptions(data) {
        const borderRange = this.options.borderRange || 'all';
        const totalItems = data.labels ? data.labels.length : 0;
        const totalAvailable = data.totalCount || totalItems;
        const sortOrder = this.options.sort || 'desc';
        const chartType = this.options.type || 'bar';
        const limit = parseInt(this.options.limit) || totalItems;
        
        // Get country with most/least borders based on sort order
        const topCountry = data.formatted && data.formatted.length > 0 ? data.formatted[0].name : '';
        const topBorders = data.formatted && data.formatted.length > 0 ? data.formatted[0].borderCount : 0;
        
        // Chart type description
        let chartTypeDesc = this.getChartTypeDescription();
        if (chartType === 'pie' || chartType === 'doughnut') {
            chartTypeDesc = `${chartType} chart`;
        }
        
        // Context description based on filter
        let contextDesc;
        switch (borderRange) {
            case 'no-borders':
                contextDesc = 'countries with no land borders (islands and isolated territories)';
                break;
            case '1-2':
                contextDesc = 'countries with 1-2 bordering neighbors';
                break;
            case '3-5':
                contextDesc = 'countries with 3-5 bordering neighbors';
                break;
            case '6-plus':
                contextDesc = 'countries with 6 or more bordering neighbors';
                break;
            default:
                contextDesc = 'countries based on their number of bordering neighbors';
                break;
        }
        
        // Get proper language for most/least borders based on sort order
        const borderSuperlative = sortOrder === 'asc' ? 'fewest' : 'most';
        
        // Create insights specific to the current chart state
        const insights = [];
        
        // Item count insight (showing limited subset or all data)
        if (totalItems < totalAvailable) {
            insights.push(`This chart shows the top ${totalItems} of ${totalAvailable} countries matching your criteria, representing ${Math.round((totalItems/totalAvailable)*100)}% of the available data.`);
        }
        
        // First insight: top country insight based on current sort and range
        if (topCountry) {
            if (borderRange === 'no-borders') {
                insights.push(`${topCountry} is ${sortOrder === 'alphabetical' ? 'alphabetically first among' : 'highlighted as'} an island nation with no land borders, relying entirely on maritime connections.`);
            } else {
                if (sortOrder === 'alphabetical') {
                    insights.push(`${topCountry} appears first alphabetically in this view with ${topBorders} bordering ${topBorders === 1 ? 'country' : 'countries'}.`);
                } else if (sortOrder === 'area') {
                    insights.push(`${topCountry}, the largest country in this view by area, has ${topBorders} bordering ${topBorders === 1 ? 'country' : 'countries'}.`);
                } else {
                    insights.push(`${topCountry} has ${topBorders} bordering ${topBorders === 1 ? 'country' : 'countries'}, the ${borderSuperlative} in this dataset.`);
                }
            }
        }
        
        // Chart type specific insights
        if (chartType === 'pie' || chartType === 'doughnut') {
            insights.push(`This ${chartType} chart visualization highlights the proportional differences in border counts among the ${totalItems} displayed countries.`);
        } else if (chartType === 'horizontalBar') {
            insights.push(`The horizontal bar format allows for easy comparison of border counts across the ${totalItems} countries displayed.`);
        }
        
        // Range specific insights with more detail
        if (borderRange === 'no-borders') {
            insights.push('Island nations and territories without land borders face unique challenges in trade and transportation but may have natural security advantages.');
            if (data.formatted && data.formatted.length >= 3) {
                const islandSample = data.formatted.slice(0, 3).map(c => c.name).join(', ');
                insights.push(`Notable examples like ${islandSample} illustrate how geography shapes international relations and development patterns.`);
            }
        } else if (borderRange === '1-2') {
            insights.push('Countries with few borders often have natural barriers like mountains or coastlines defining their boundaries, or are located on peninsulas.');
            if (sortOrder === 'desc' && data.formatted && data.formatted.length > 0) {
                const country = data.formatted[0];
                insights.push(`${country.name}, with ${country.borderCount} ${country.borderCount === 1 ? 'border' : 'borders'}, demonstrates how even countries with limited land connections maintain important regional relationships.`);
            }
        } else if (borderRange === '3-5') {
            insights.push('Countries with a moderate number of borders balance regional connectivity with defined boundaries, typical of many European and Asian nations.');
            if (data.formatted && data.formatted.length > 2) {
                const regionPatternsVisible = data.formatted.some(c => c.continent === 'Europe') && data.formatted.some(c => c.continent !== 'Europe');
                if (regionPatternsVisible) {
                    insights.push(`This dataset shows how the 3-5 border pattern appears across different regions of the world, with distinct continental patterns visible.`);
                }
            }
        } else if (borderRange === '6-plus') {
            insights.push('Countries with many borders often serve as important trade crossroads and face complex diplomatic and security challenges with multiple neighbors.');
            if (data.formatted && data.formatted.length > 0 && data.formatted[0].borderCount > 8) {
                insights.push(`${data.formatted[0].name} with ${data.formatted[0].borderCount} borders represents an extreme case of multi-border connectivity, highlighting its potential role as a regional crossroads.`);
            }
        } else if (data.formatted && data.formatted.length > 1) {
            // For "all countries" view, provide comparison insights between extremes
            if (data.formatted.length >= 2) {
                const firstCountry = data.formatted[0];
                const lastCountry = data.formatted[data.formatted.length - 1];
                
                if (sortOrder === 'desc' || sortOrder === 'asc') {
                    const mostBorders = sortOrder === 'desc' ? firstCountry : lastCountry;
                    const fewestBorders = sortOrder === 'desc' ? lastCountry : firstCountry;
                    
                    if (mostBorders.borderCount > 0 && fewestBorders.borderCount === 0) {
                        insights.push(`This view contrasts countries like ${mostBorders.name} with ${mostBorders.borderCount} borders against island nations like ${fewestBorders.name} with no land borders.`);
                    } else if (mostBorders.borderCount > 0 && fewestBorders.borderCount > 0) {
                        const ratio = Math.round(mostBorders.borderCount / fewestBorders.borderCount);
                        if (ratio > 1) {
                            insights.push(`${mostBorders.name} has ${ratio} times more bordering countries than ${fewestBorders.name}, demonstrating the wide spectrum of border connectivity.`);
                        }
                    }
                }
            }
        }
        
        
        // Sort-specific insights
        if (sortOrder === 'alphabetical') {
            insights.push(`Displaying countries in alphabetical order allows you to quickly locate specific nations regardless of their border count.`);
        } else if (sortOrder === 'area') {
            insights.push(`Sorting by country area reveals how physical size relates to border counts, with ${data.formatted && data.formatted.length > 1 ? (data.formatted[0].borderCount > data.formatted[data.formatted.length-1].borderCount ? 'larger' : 'smaller') : 'different'} countries typically having different border patterns.`);
        }
        
        // Final insight: general border information relevant to current view
        if (borderRange === 'all') {
            insights.push(`Border counts reflect geographical position, historical developments, and political boundaries throughout history.`);
        } else {
            const rangeText = borderRange === 'no-borders' ? 'absence of borders' : 
                           borderRange === '1-2' ? 'low border count' :
                           borderRange === '3-5' ? 'moderate border count' : 'high border count';
            insights.push(`The ${rangeText} shown here often correlates with specific geographical features, historical border developments, and regional political dynamics.`);
        }
        
        // Build short and detailed descriptions
        let shortDesc = `This ${chartTypeDesc} shows ${contextDesc}`;
        if (sortOrder === 'asc') shortDesc += ', sorted from fewest to most';
        if (sortOrder === 'desc') shortDesc += ', sorted from most to fewest';
        if (sortOrder === 'alphabetical') shortDesc += ', in alphabetical order';
        if (sortOrder === 'area') shortDesc += ', sorted by country area';
        if (totalItems < totalAvailable) shortDesc += `, displaying ${totalItems} of ${totalAvailable} countries`;
        shortDesc += '.';
        
        let detailedDesc = `The chart displays ${totalItems} ${contextDesc}.`;
        if (topCountry) {
            detailedDesc += ` ${topCountry} has ${topBorders === 0 ? 'no bordering countries' : `${topBorders} bordering ${topBorders === 1 ? 'country' : 'countries'}`}`;
            if (sortOrder === 'desc' && topBorders > 0) detailedDesc += `, the most in this dataset`;
            if (sortOrder === 'asc' && (borderRange !== 'no-borders' || data.formatted.length > 1)) detailedDesc += `, the fewest in this dataset`;
            detailedDesc += '.';
        }
        
        let analysisDesc;
        if (borderRange === 'no-borders') {
            analysisDesc = `Analysis of island nations and territories reveals unique geographical isolation that shapes their international relations and economic patterns.`;
        } else if (totalItems > 0) {
            if (sortOrder === 'alphabetical') {
                analysisDesc = `Border analysis of these ${totalItems} countries shows varied connectivity patterns that influence regional integration and geopolitical positioning.`;
            } else if (sortOrder === 'area') {
                analysisDesc = `Examining borders in relation to country area shows that ${data.formatted[0].name}, the largest country displayed, has ${data.formatted[0].borderCount} borders, highlighting how geographical size influences border relationships.`;
            } else {
                analysisDesc = `Border analysis shows the geographical connectivity of ${contextDesc}, with ${topCountry} ${sortOrder === 'asc' ? 'having the fewest with' : 'leading with'} ${topBorders} borders.`;
            }
        } else {
            analysisDesc = `Border analysis provides insights into geographical connectivity patterns between nations.`;
        }
        
        return {
            short: shortDesc,
            detailed: detailedDesc,
            analysis: analysisDesc,
            insights: insights.filter(insight => Boolean(insight.trim()))
        };
    }

    /**
     * Override the base class generateDescriptions to ensure we use our specific implementation
     * @param {Object} data - Processed chart data
     * @returns {Object} Chart descriptions
     */
    generateDescriptions(data) {
        return this.generateBordersDescriptions(data);
    }
    
    /**
     * Helper function to update chart with all current options
     * Can be called when multiple settings change at once
     */
    async updateChart() {
        try {
            // Show loading state
            this.showLoading();
            
            // Clean up existing chart elements before updating
            this.cleanupExistingChart();
            
            // Re-process data with current options
            this.processedData = await this.processData(this.rawData);
            
            // Create new chart configuration
            const chartConfig = this.createChartConfig(this.processedData);
            
            // Generate chart URL
            const chartUrl = chartService.createChartUrl(chartConfig);
            
            // Update the chart
            chartUtils.displayChart(
                this.containerId,
                chartUrl,
                this.options.title
            );
            
            // Generate descriptions that accurately reflect the current state
            const descriptions = this.generateBordersDescriptions(this.processedData);
            this.updateChartDescriptions(descriptions);
            
            // Update the chart title in the DOM
            const titleElement = this.container.querySelector('.chart-title');
            if (titleElement) {
                titleElement.textContent = this.options.title;
            }
        } catch (error) {
            console.error(`[${this.containerId}] Error updating chart:`, error);
            this.showError(`Failed to update chart: ${error.message}`);
        }
    }
}