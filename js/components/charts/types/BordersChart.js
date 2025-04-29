/**
 * Borders Chart Component
 * Extends BaseChart to create border-specific visualizations
 */

import { BaseChart } from '../BaseChart.js';
import * as dataProcessing from '../../../utils/dataProcessing.js';
import { chartService } from '../../../services/chartService.js';
import * as chartUtils from '../../../utils/chartUtils.js';

export class BordersChart extends BaseChart {
    /**
     * Create a new BordersChart instance
     * @param {string} containerId - The ID of the container element
     * @param {Object} options - Chart configuration options
     */
    constructor(containerId, options = {}) {
        super(containerId, {
            title: 'Top 5 Countries with Most Borders',
            type: 'bar',
            colorScheme: 'default',
            limit: 5,
            chartType: 'borders', // Add chart type identifier for dynamic descriptions
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
            console.error('Invalid country data received for borders chart');
            return { labels: [], values: [], formatted: [] };
        }
        
        // Process border data for each country
        const countryBorders = [];
        
        data.forEach(country => {
            // Skip if missing relevant data
            if (!country.name || !country.borders) return;
            
            // Get number of borders
            const borderCount = Array.isArray(country.borders) ? country.borders.length : 0;
            
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
            
            // Calculate border density if area data is available
            let borderDensity = null;
            if (country.area && country.area > 0) {
                borderDensity = borderCount / (country.area / 1000000); // Borders per million square km
            }
            
            countryBorders.push({
                name: country.name.common,
                borderCount: borderCount,
                area: country.area || 0,
                borderDensity: borderDensity,
                continent: country.continent || country.region || 'Unknown',
                borderingCountries: country.borders || []
            });
        });
        
        // Sort the data based on selected sort option
        if (this.options.sortBy === 'least') {
            countryBorders.sort((a, b) => a.borderCount - b.borderCount);
        } else if (this.options.sortBy === 'alphabetical') {
            countryBorders.sort((a, b) => a.name.localeCompare(b.name));
        } else if (this.options.sortBy === 'area') {
            countryBorders.sort((a, b) => b.area - a.area);
        } else {
            // Default: Sort by most borders
            countryBorders.sort((a, b) => b.borderCount - a.borderCount);
        }
        
        // Apply display limit
        let limitedBorders = countryBorders;
        if (this.options.limit !== 'all') {
            const limit = parseInt(this.options.limit);
            if (!isNaN(limit)) {
                limitedBorders = countryBorders.slice(0, limit);
            }
        }
        
        // Generate chart data labels and values
        const labels = limitedBorders.map(country => country.name);
        const values = limitedBorders.map(country => 
            this.options.showBorderDensity && country.borderDensity !== null ? 
            country.borderDensity.toFixed(4) : 
            country.borderCount
        );
        
        // Format data for chart
        return {
            labels: labels,
            values: values,
            formatted: limitedBorders.map(country => ({
                name: country.name,
                borderCount: country.borderCount,
                area: country.area,
                borderDensity: country.borderDensity,
                continent: country.continent,
                borderingCountries: country.borderingCountries
            }))
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
        
        if (this.options.highlightContinents) {
            // Create a color mapping for continents
            const continentColors = {
                'Africa': 'rgba(255, 206, 86, 0.7)',
                'Asia': 'rgba(255, 99, 132, 0.7)',
                'Europe': 'rgba(54, 162, 235, 0.7)',
                'North America': 'rgba(75, 192, 192, 0.7)',
                'South America': 'rgba(153, 102, 255, 0.7)',
                'Oceania': 'rgba(255, 159, 64, 0.7)',
                'Antarctica': 'rgba(199, 199, 199, 0.7)',
                'Unknown': 'rgba(128, 128, 128, 0.7)'
            };
            
            // Map country colors based on their continent
            backgroundColor = data.formatted.map(country => {
                // Handle more general region names if continent not available
                if (continentColors[country.continent]) {
                    return continentColors[country.continent];
                } 
                
                // Handle regions that contain continent names
                for (const continent in continentColors) {
                    if (country.continent.includes(continent)) {
                        return continentColors[continent];
                    }
                }
                
                return continentColors['Unknown'];
            });
            
            borderColor = backgroundColor.map(color => color.replace('0.7', '1.0'));
        } else {
            // Default color scheme
            backgroundColor = 'rgba(54, 162, 235, 0.7)';
            borderColor = 'rgba(54, 162, 235, 1.0)';
        }
        
        const chartConfig = {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: this.options.showBorderDensity ? 'Border Density' : 'Number of Borders',
                    data: data.values,
                    backgroundColor: backgroundColor,
                    borderColor: borderColor,
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: this.options.title || 'Border Count by Country',
                        font: {
                            size: 18,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: this.options.highlightContinents,
                        position: 'bottom',
                        labels: {
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const country = data.formatted[context.dataIndex];
                                if (!country) return 'No data';
                                
                                const labels = [];
                                
                                if (this.options.showBorderDensity) {
                                    labels.push(`Border Density: ${country.borderDensity.toFixed(4)} borders/million km²`);
                                    labels.push(`Total Borders: ${country.borderCount}`);
                                    labels.push(`Area: ${(country.area / 1000000).toFixed(2)} million km²`);
                                } else {
                                    labels.push(`Borders: ${country.borderCount}`);
                                    
                                    if (country.borderCount > 0) {
                                        // Show a sample of bordering countries in tooltip
                                        const sampleSize = Math.min(country.borderingCountries.length, 3);
                                        const sampleBorders = country.borderingCountries.slice(0, sampleSize);
                                        const remainingCount = country.borderingCountries.length - sampleSize;
                                        
                                        labels.push(`Borders with: ${sampleBorders.join(', ')}${remainingCount > 0 ? ` and ${remainingCount} more` : ''}`);
                                    }
                                }
                                
                                labels.push(`Continent: ${country.continent}`);
                                
                                return labels;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: this.options.showBorderDensity ? 'Border Density (borders/million km²)' : 'Number of Borders',
                            font: { size: 12, weight: 'bold' }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Country',
                            font: { size: 12, weight: 'bold' }
                        }
                    }
                }
            }
        };
        
        // Add legend if using continental highlighting
        if (this.options.highlightContinents) {
            // Create custom legend using continent colors
            const continentLabels = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Antarctica'];
            
            chartConfig.options.plugins.legend = {
                display: true,
                position: 'bottom',
                labels: {
                    generateLabels: () => {
                        return continentLabels.map(label => {
                            const color = {
                                'Africa': 'rgba(255, 206, 86, 0.7)',
                                'Asia': 'rgba(255, 99, 132, 0.7)',
                                'Europe': 'rgba(54, 162, 235, 0.7)',
                                'North America': 'rgba(75, 192, 192, 0.7)',
                                'South America': 'rgba(153, 102, 255, 0.7)',
                                'Oceania': 'rgba(255, 159, 64, 0.7)',
                                'Antarctica': 'rgba(199, 199, 199, 0.7)'
                            }[label];
                            
                            return {
                                text: label,
                                fillStyle: color,
                                strokeStyle: color.replace('0.7', '1.0'),
                                lineWidth: 1
                            };
                        });
                    }
                }
            };
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
        
        // 1. Add border count range selector
        const rangeGroup = document.createElement('div');
        rangeGroup.className = 'form-group me-2 mb-2';
        
        const rangeLabel = document.createElement('label');
        rangeLabel.className = 'me-2 fw-bold';
        rangeLabel.textContent = 'Border Count:';
        rangeGroup.appendChild(rangeLabel);
        
        const rangeSelect = document.createElement('select');
        rangeSelect.className = 'form-select form-select-sm border-range-select';
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
        
        rangeSelect.addEventListener('change', (e) => {
            this.changeBorderRange(e.target.value);
        });
        
        rangeGroup.appendChild(rangeSelect);
        this.chartControls.appendChild(rangeGroup);
        
        // 2. Add continental highlight toggle
        const continentGroup = document.createElement('div');
        continentGroup.className = 'form-group me-2 mb-2';
        
        const continentCheck = document.createElement('div');
        continentCheck.className = 'form-check form-switch';
        
        const continentInput = document.createElement('input');
        continentInput.className = 'form-check-input';
        continentInput.type = 'checkbox';
        continentInput.id = `${this.containerId}-continent-toggle`;
        continentInput.setAttribute('role', 'switch');
        continentInput.checked = this.options.highlightContinents || false;
        
        const continentLabel = document.createElement('label');
        continentLabel.className = 'form-check-label ms-2';
        continentLabel.htmlFor = `${this.containerId}-continent-toggle`;
        continentLabel.textContent = 'Color by Continent';
        
        continentInput.addEventListener('change', (e) => {
            this.toggleContinentalHighlighting(e.target.checked);
        });
        
        continentCheck.appendChild(continentInput);
        continentCheck.appendChild(continentLabel);
        continentGroup.appendChild(continentCheck);
        this.chartControls.appendChild(continentGroup);
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
            // Store border range option
            this.options.borderRange = range;
            
            // Re-process data based on the border range
            this.processedData = await this.processData(this.rawData);
            
            // Create new chart configuration
            const chartConfig = this.createChartConfig(this.processedData);
            
            // Generate chart URL
            const chartUrl = chartService.createChartUrl(chartConfig);
            
            // Update the chart
            chartUtils.displayChart(
                this.containerId,
                chartUrl,
                this.options.title || 'Border Count Chart'
            );
            
            // Update descriptions
            const descriptions = this.generateDescriptions(this.processedData);
            this.updateChartDescriptions(descriptions);
            
            // Update the chart title based on range
            let rangeText = '';
            switch (range) {
                case 'no-borders':
                    rangeText = 'Islands and Territories with No Land Borders';
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
                    rangeText = 'All Countries';
            }
            
            this.options.title = rangeText !== 'All Countries' ? 
                `Border Count: ${rangeText}` : 
                'Border Count by Country';
            
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
     * Toggle coloring chart bars by continent
     * @param {boolean} highlight - Whether to color by continent
     */
    async toggleContinentalHighlighting(highlight) {
        console.log(`[${this.containerId}] Toggling continental highlighting: ${highlight}`);
        
        // Show loading overlay
        this.showLoading();
        
        try {
            // Store highlighting option
            this.options.highlightContinents = highlight;
            
            // Create new chart configuration
            const chartConfig = this.createChartConfig(this.processedData);
            
            // Generate chart URL
            const chartUrl = chartService.createChartUrl(chartConfig);
            
            // Update the chart
            chartUtils.displayChart(
                this.containerId,
                chartUrl,
                this.options.title || 'Border Count Chart'
            );
            
            // Update descriptions
            const descriptions = this.generateDescriptions(this.processedData);
            if (highlight) {
                descriptions.short = `${descriptions.short} The chart is color-coded by continent.`;
            }
            this.updateChartDescriptions(descriptions);
        } catch (error) {
            console.error(`[${this.containerId}] Error toggling continental highlighting:`, error);
            this.showError(`Failed to toggle continental highlighting: ${error.message}`);
        }
    }
}