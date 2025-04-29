/**
 * Timezone Chart Component
 * Extends BaseChart to visualize timezone distribution across countries
 */

import { BaseChart } from '../BaseChart.js';
import * as dataProcessing from '../../../utils/dataProcessing.js';

export class TimezoneChart extends BaseChart {
    /**
     * Create a new TimezoneChart instance
     * @param {string} containerId - The ID of the container element
     * @param {Object} options - Chart configuration options
     */
    constructor(containerId, options = {}) {
        super(containerId, {
            title: 'Countries per Timezone (Top 5)',
            type: 'bar', // Changed from line to bar for more reliable rendering
            colorScheme: 'blue',
            limit: 5,
            chartType: 'timezone', // Add chart type identifier for dynamic descriptions
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
        try {
            // Safety check for data
            if (!Array.isArray(data) || data.length === 0) {
                console.error('Invalid country data received for timezone chart');
                return this.getFallbackData();
            }

            const timezoneCountMap = {};

            // Count countries per timezone
            let validTimezoneFound = false;
            
            data.forEach(country => {
                if (country && country.timezones && Array.isArray(country.timezones)) {
                    country.timezones.forEach(timezone => {
                        // Clean up timezone string to handle any formatting inconsistencies
                        const cleanedTimezone = timezone.trim();
                        
                        // Skip empty or invalid timezones
                        if (!cleanedTimezone || cleanedTimezone === 'UTC' || cleanedTimezone === 'undefined') {
                            return;
                        }
                        
                        // Apply range filter if specified
                        if (this.options.tzRange === 'positive' && !cleanedTimezone.includes('+')) {
                            return;
                        }
                        
                        if (this.options.tzRange === 'negative' && !cleanedTimezone.includes('-')) {
                            return;
                        }
                        
                        // For "major" zones, only include whole hour offsets
                        if (this.options.tzRange === 'major' && cleanedTimezone.includes(':') && 
                            !cleanedTimezone.includes(':00') && !cleanedTimezone.includes('UTC')) {
                            return;
                        }
                        
                        // Apply grouping if specified
                        let groupedTimezone = cleanedTimezone;
                        
                        if (this.options.tzGrouping === 'hour') {
                            // Group by whole hours (round to nearest hour)
                            const match = cleanedTimezone.match(/UTC([+-])(\d+):?(\d*)/);
                            if (match) {
                                const sign = match[1];
                                const hours = parseInt(match[2], 10);
                                const minutes = match[3] ? parseInt(match[3], 10) : 0;
                                
                                let roundedHours = hours;
                                if (minutes >= 30) {
                                    roundedHours++;
                                }
                                
                                groupedTimezone = `UTC${sign}${roundedHours}`;
                            }
                        } else if (this.options.tzGrouping === 'region') {
                            // Group by geographical region
                            // This is a simplified approach
                            if (cleanedTimezone.includes('+')) {
                                const offset = parseFloat(cleanedTimezone.replace('UTC+', '').replace(':', '.'));
                                if (offset >= 8) {
                                    groupedTimezone = 'Asia/Pacific';
                                } else if (offset >= 3) {
                                    groupedTimezone = 'Middle East/Asia';
                                } else {
                                    groupedTimezone = 'Europe/Africa';
                                }
                            } else if (cleanedTimezone.includes('-')) {
                                const offset = parseFloat(cleanedTimezone.replace('UTC-', '').replace(':', '.'));
                                if (offset >= 7) {
                                    groupedTimezone = 'Americas (West)';
                                } else if (offset >= 4) {
                                    groupedTimezone = 'Americas (Central)';
                                } else {
                                    groupedTimezone = 'Americas (East)';
                                }
                            } else {
                                groupedTimezone = 'GMT/UTC';
                            }
                        }
                        
                        validTimezoneFound = true;
                        timezoneCountMap[groupedTimezone] = (timezoneCountMap[groupedTimezone] || 0) + 1;
                    });
                }
            });

            // If no valid timezone data found, provide fallback data
            if (!validTimezoneFound || Object.keys(timezoneCountMap).length === 0) {
                console.warn('No valid timezone data found, using fallback data');
                return this.getFallbackData();
            }

            // Sort and get top timezones
            const sortedTimezones = Object.entries(timezoneCountMap)
                .sort((a, b) => b[1] - a[1])
                .slice(0, this.options.limit);

            // Split into labels and values
            const labels = sortedTimezones.map(([timezone]) => timezone);
            const values = sortedTimezones.map(([_, count]) => count);

            const totalCountries = data.length;

            return {
                labels,
                values,
                formatted: labels.map((timezone, index) => ({
                    timezone,
                    count: values[index],
                    percentage: dataProcessing.calculatePercentage(values[index], totalCountries)
                }))
            };
        } catch (error) {
            console.error('Error processing timezone data:', error);
            return this.getFallbackData();
        }
    }

    /**
     * Get fallback data when timezone data is unavailable
     * @returns {Object} Fallback data for the chart
     */
    getFallbackData() {
        return {
            labels: ['UTC', 'UTC+1', 'UTC+2', 'UTC-5', 'UTC-8'],
            values: [30, 25, 20, 15, 10],
            formatted: [
                { timezone: 'UTC', count: 30, percentage: '15.00' },
                { timezone: 'UTC+1', count: 25, percentage: '12.50' },
                { timezone: 'UTC+2', count: 20, percentage: '10.00' },
                { timezone: 'UTC-5', count: 15, percentage: '7.50' },
                { timezone: 'UTC-8', count: 10, percentage: '5.00' }
            ]
        };
    }

    /**
     * Create chart configuration for timezone data
     * @param {Object} data - Processed timezone data
     * @returns {Object} Chart configuration for QuickChart API
     */
    createChartConfig(data) {
        const chartConfig = {
            type: this.options.type || 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: "Countries per Timezone",
                    data: data.values,
                    backgroundColor: "rgba(54, 162, 235, 0.7)",
                    borderColor: "rgba(54, 162, 235, 1)",
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: this.options.title || 'Countries per Timezone',
                        font: {
                            size: 22,
                            weight: "bold",
                            family: "Arial"
                        },
                        color: "#222"
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const item = data.formatted[context.dataIndex];
                                if (!item) return 'No data';
                                return [
                                    `Timezone: ${item.timezone}`,
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
                            font: { size: 12, weight: "bold" },
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: { color: "#eee" }
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
        
        // Add business hours overlay if requested
        if (this.options.showBusinessHours) {
            // Define business hours for major financial centers
            const businessHours = {
                'UTC+1': '8am-4pm', // London
                'UTC+2': '9am-5pm', // Frankfurt, Paris
                'UTC+9': '9am-5pm', // Tokyo
                'UTC+8': '9am-5pm', // Hong Kong, Singapore
                'UTC-4': '9am-5pm', // New York
                'UTC-7': '9am-5pm', // Los Angeles
            };
            
            // For exact timezone grouping, add business hours annotation
            if (this.options.tzGrouping === 'exact') {
                // Add annotation plugin for business hours
                chartConfig.options.plugins.annotation = {
                    annotations: {}
                };
                
                // Add background for business hours
                data.labels.forEach((timezone, index) => {
                    if (businessHours[timezone]) {
                        chartConfig.options.plugins.annotation.annotations[`business-${index}`] = {
                            type: 'box',
                            xMin: index - 0.4,
                            xMax: index + 0.4,
                            yMin: 0,
                            yMax: data.values[index],
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 2
                        };
                    }
                });
                
                // Add business hours to datasets for highlighting
                chartConfig.data.datasets.push({
                    label: 'Business Hours',
                    data: data.values.map((value, index) => 
                        businessHours[data.labels[index]] ? value : null
                    ),
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    borderRadius: 4
                });
            }
        }
        
        return chartConfig;
    }

    /**
     * Create timezone-specific chart controls
     */
    createChartControls() {
        // Create base controls first
        super.createChartControls();
        
        if (!this.chartControls) return;
        
        // Add a timezone range selector
        const rangeGroup = document.createElement('div');
        rangeGroup.className = 'form-group me-2 mb-2';
        
        const rangeLabel = document.createElement('label');
        rangeLabel.className = 'me-2 fw-bold';
        rangeLabel.textContent = 'Show Zones:';
        rangeGroup.appendChild(rangeLabel);
        
        const rangeSelect = document.createElement('select');
        rangeSelect.className = 'form-select form-select-sm timezone-range-select';
        rangeSelect.setAttribute('aria-label', 'Select timezone range');
        
        const rangeOptions = [
            { value: 'all', text: 'All Timezones' },
            { value: 'positive', text: 'UTC+ (East)' },
            { value: 'negative', text: 'UTC- (West)' },
            { value: 'major', text: 'Major Zones Only' }
        ];
        
        rangeOptions.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.text;
            if (option.value === (this.options.tzRange || 'all')) {
                optionEl.selected = true;
            }
            rangeSelect.appendChild(optionEl);
        });
        
        rangeSelect.addEventListener('change', (e) => {
            this.filterTimezoneRange(e.target.value);
        });
        
        rangeGroup.appendChild(rangeSelect);
        this.chartControls.appendChild(rangeGroup);
        
        // Add grouping selector
        const groupGroup = document.createElement('div');
        groupGroup.className = 'form-group me-2 mb-2';
        
        const groupLabel = document.createElement('label');
        groupLabel.className = 'me-2 fw-bold';
        groupLabel.textContent = 'Group By:';
        groupGroup.appendChild(groupLabel);
        
        const groupSelect = document.createElement('select');
        groupSelect.className = 'form-select form-select-sm timezone-group-select';
        groupSelect.setAttribute('aria-label', 'Select timezone grouping');
        
        const groupOptions = [
            { value: 'exact', text: 'Exact Timezones' },
            { value: 'hour', text: 'Rounded Hours' },
            { value: 'region', text: 'Geographical Region' }
        ];
        
        groupOptions.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.text;
            if (option.value === (this.options.tzGrouping || 'exact')) {
                optionEl.selected = true;
            }
            groupSelect.appendChild(optionEl);
        });
        
        groupSelect.addEventListener('change', (e) => {
            this.changeTimezoneGrouping(e.target.value);
        });
        
        groupGroup.appendChild(groupSelect);
        this.chartControls.appendChild(groupGroup);
        
        // Add business hours overlay toggle
        const businessGroup = document.createElement('div');
        businessGroup.className = 'form-group me-2 mb-2';
        
        const businessCheck = document.createElement('div');
        businessCheck.className = 'form-check form-switch';
        
        const businessInput = document.createElement('input');
        businessInput.className = 'form-check-input';
        businessInput.type = 'checkbox';
        businessInput.id = `${this.containerId}-business-toggle`;
        businessInput.setAttribute('role', 'switch');
        businessInput.checked = this.options.showBusinessHours || false;
        
        const businessLabel = document.createElement('label');
        businessLabel.className = 'form-check-label ms-2';
        businessLabel.htmlFor = `${this.containerId}-business-toggle`;
        businessLabel.textContent = 'Show Business Hours';
        
        businessInput.addEventListener('change', (e) => {
            this.toggleBusinessHours(e.target.checked);
        });
        
        businessCheck.appendChild(businessInput);
        businessCheck.appendChild(businessLabel);
        businessGroup.appendChild(businessCheck);
        this.chartControls.appendChild(businessGroup);
    }

    /**
     * Filter timezones by range
     * @param {string} range - Range of timezones to show
     */
    async filterTimezoneRange(range) {
        console.log(`[${this.containerId}] Filtering timezone range: ${range}`);
        
        // Show loading overlay
        this.showLoading();
        
        try {
            // Store range option
            this.options.tzRange = range;
            
            // Re-process data with the new range filter
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
            
            // Update title based on range
            let titlePrefix = 'Countries per Timezone';
            if (range === 'positive') {
                titlePrefix = 'Countries in Eastern Timezones (UTC+)';
            } else if (range === 'negative') {
                titlePrefix = 'Countries in Western Timezones (UTC-)';
            } else if (range === 'major') {
                titlePrefix = 'Countries in Major Timezones';
            }
            
            this.options.title = `${titlePrefix} (Top ${this.options.limit || 5})`;
            
            // Update the chart title in the DOM
            const titleElement = this.container.querySelector('.chart-title');
            if (titleElement) {
                titleElement.textContent = this.options.title;
            }
        } catch (error) {
            console.error(`[${this.containerId}] Error filtering timezone range:`, error);
            this.showError(`Failed to filter timezone range: ${error.message}`);
        }
    }

    /**
     * Change timezone grouping
     * @param {string} grouping - How to group timezones
     */
    async changeTimezoneGrouping(grouping) {
        console.log(`[${this.containerId}] Changing timezone grouping: ${grouping}`);
        
        // Show loading overlay
        this.showLoading();
        
        try {
            // Store grouping option
            this.options.tzGrouping = grouping;
            
            // Re-process data with the new grouping
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
        } catch (error) {
            console.error(`[${this.containerId}] Error changing timezone grouping:`, error);
            this.showError(`Failed to change timezone grouping: ${error.message}`);
        }
    }

    /**
     * Toggle business hours overlay on the chart
     * @param {boolean} show - Whether to show business hours overlay
     */
    async toggleBusinessHours(show) {
        console.log(`[${this.containerId}] Toggling business hours overlay: ${show}`);
        
        // Show loading overlay
        this.showLoading();
        
        try {
            // Store business hours option
            this.options.showBusinessHours = show;
            
            // Create new chart configuration with business hours overlay
            const chartConfig = this.createChartConfig(this.processedData);
            
            // Generate chart URL
            const chartUrl = chartService.createChartUrl(chartConfig);
            
            // Update the chart
            chartUtils.displayChart(
                this.containerId,
                chartUrl,
                this.options.title || 'Chart'
            );
            
            // Update descriptions to include business hours context
            const descriptions = this.generateDescriptions(this.processedData);
            if (show && descriptions.short) {
                descriptions.short += ' The chart highlights standard business hours (9am-5pm) in major financial centers.';
            }
            this.updateChartDescriptions(descriptions);
        } catch (error) {
            console.error(`[${this.containerId}] Error toggling business hours:`, error);
            this.showError(`Failed to toggle business hours: ${error.message}`);
        }
    }
}