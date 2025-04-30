/**
 * Region Distribution Chart Component
 * Extends BaseChart to create region-specific visualizations
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

export class RegionChart extends BaseChart {
    /**
     * Create a new RegionChart instance
     * @param {string} containerId - The ID of the container element
     * @param {Object} options - Chart configuration options
     */
    constructor(containerId, options = {}) {
        super(containerId, {
            title: 'Number of Countries per Region',
            type: 'bar', // Changed default to bar as it works better for regions
            limit: 10,
            chartType: 'region', // Add chart type identifier for dynamic descriptions
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
            console.error('Invalid country data received for region chart');
            return { labels: [], values: [], formatted: [] };
        }
        
        // Group data based on selected grouping option
        let groupData = {};
        
        if (this.options.groupBy === 'continent') {
            // Group by continent
            data.forEach(country => {
                if (country.continents && country.continents[0]) {
                    const continent = country.continents[0];
                    if (!groupData[continent]) {
                        groupData[continent] = {
                            countries: 0,
                            population: 0,
                            area: 0
                        };
                    }
                    
                    groupData[continent].countries++;
                    
                    if (country.population) {
                        groupData[continent].population += country.population;
                    }
                    
                    if (country.area) {
                        groupData[continent].area += country.area;
                    }
                }
            });
        } else if (this.options.groupBy === 'development') {
            // Simple development status (based on GDP or UN definitions)
            // This is a simplified approach; in real-world you might want to use more accurate data
            groupData = {
                'Developed': { countries: 0, population: 0, area: 0 },
                'Developing': { countries: 0, population: 0, area: 0 }
            };
            
            // For simplicity, categorize based on region
            const developedRegions = ['Europe', 'Northern America', 'Australia and New Zealand'];
            
            data.forEach(country => {
                if (country.region) {
                    const isDeveloped = developedRegions.includes(country.region);
                    const category = isDeveloped ? 'Developed' : 'Developing';
                    
                    groupData[category].countries++;
                    
                    if (country.population) {
                        groupData[category].population += country.population;
                    }
                    
                    if (country.area) {
                        groupData[category].area += country.area;
                    }
                }
            });
        } else {
            // Default: group by region
            data.forEach(country => {
                if (country.region) {
                    const region = country.region;
                    if (!groupData[region]) {
                        groupData[region] = {
                            countries: 0,
                            population: 0,
                            area: 0
                        };
                    }
                    
                    groupData[region].countries++;
                    
                    if (country.population) {
                        groupData[region].population += country.population;
                    }
                    
                    if (country.area) {
                        groupData[area].area += country.area;
                    }
                }
            });
        }
        
        // Get values based on selected statistic
        let formattedData = Object.entries(groupData).map(([name, stats]) => {
            let value;
            let metric = '';
            
            switch (this.options.statistic) {
                case 'population':
                    value = stats.population;
                    metric = 'people';
                    break;
                case 'area':
                    value = stats.area;
                    metric = 'km²';
                    break;
                case 'countries':
                default:
                    value = stats.countries;
                    metric = 'countries';
                    break;
            }
            
            return {
                name,
                value,
                countries: stats.countries,
                population: stats.population,
                area: stats.area,
                metric
            };
        });
        
        // Sort data based on selected sort order
        switch (this.options.sort) {
            case 'asc':
                formattedData.sort((a, b) => a.value - b.value);
                break;
            case 'desc':
            default:
                formattedData.sort((a, b) => b.value - a.value);
                break;
        }
        
        // No limit needed for regions - we want to show all regions
        // formattedData = formattedData.slice(0, this.options.limit);
        
        // Calculate total for percentages
        const totalValue = formattedData.reduce((sum, item) => sum + item.value, 0);
        
        // Format for chart
        return {
            labels: formattedData.map(item => item.name),
            values: formattedData.map(item => item.value),
            formatted: formattedData.map(item => {
                const percentage = ((item.value / totalValue) * 100).toFixed(2);
                return {
                    name: item.name,
                    value: item.value,
                    formatted: new Intl.NumberFormat().format(item.value),
                    percentage: percentage,
                    countries: item.countries,
                    population: new Intl.NumberFormat().format(item.population),
                    area: new Intl.NumberFormat().format(item.area),
                    metric: item.metric
                };
            })
        };
    }

    /**
     * Create chart configuration for region data
     * @param {Object} data - Processed region data
     * @returns {Object} Chart configuration for QuickChart API
     */
    createChartConfig(data) {
        const colors = generateHueVariants(COLORS.primary, data.labels.length).map(color =>
            hexToRgba(color, 0.75)
        );

        const chartType = this.options.type || 'bar';
        const labelSuffix = this.getStatisticLabelSuffix();

        // Improved configuration for immediate good-looking rendering
        const config = {
            type: chartType,
            data: {
                labels: data.labels,
                datasets: [{
                    label: `Number of ${labelSuffix}`,
                    data: data.values,
                    backgroundColor: colors.slice(0, data.labels.length),
                    borderColor: hexToRgba(COLORS.primary, 1),
                    borderWidth: 1,
                    borderRadius: 12,
                    barThickness: 40
                }]
            },
            options: {
                indexAxis: this.options.horizontal !== false ? 'y' : 'x', // Default to horizontal for better region name display
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 0, // Initially render with no animation for immediate display
                    easing: 'easeOutQuad'
                },
                plugins: {
                    title: {
                        display: true,
                        text: this.options.title,
                        font: {
                            size: 24,
                            family: 'Roboto, sans-serif',
                            weight: 600
                        },
                        color: COLORS.textPrimary,
                        padding: {
                            top: 20,
                            bottom: 20
                        }
                    },
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const item = data.formatted[context.dataIndex];
                                if (!item) return 'No data';
                                
                                return [
                                    `${this.getStatisticLabel()}: ${item.formatted}`,
                                    `Countries: ${item.countries}`,
                                    `Population: ${item.population}`,
                                    `Area: ${item.area} km²`,
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
                            font: { size: 14, family: 'Roboto, sans-serif', weight: 'bold' },
                            color: COLORS.textSecondary
                        },
                        grid: {
                            color: hexToRgba(COLORS.textSecondary, 0.1)
                        }
                    },
                    y: {
                        ticks: {
                            font: {
                                size: 14,
                                family: 'Roboto, sans-serif',
                                weight: 'bold'
                            },
                            color: COLORS.textSecondary
                        },
                        grid: { display: false }
                    }
                },
                // Completely disable initial animations for immediate rendering
                transitions: {
                    active: {
                        animation: {
                            duration: 0
                        }
                    }
                }
            }
        };

        // Apply special formatting based on chart type
        this.formatLabelsForChartType(config, chartType);
        
        return config;
    }

    /**
     * Personalized formatting for region chart labels and visualization
     * @param {Object} chartConfig - The chart configuration
     * @param {string} chartType - The chart type
     */
    formatLabelsForChartType(chartConfig, chartType) {
        // First call the base implementation
        super.formatLabelsForChartType(chartConfig, chartType);
        
        // Define region-specific colors for better immediate visual appearance
        const regionColors = {
            "Europe": "#3498db", // Blue
            "Asia": "#e74c3c",   // Red
            "Africa": "#f1c40f", // Yellow
            "Americas": "#2ecc71", // Green
            "Oceania": "#9b59b6", // Purple
            "Antarctic": "#34495e", // Dark blue
            "North America": "#1abc9c", // Teal
            "South America": "#e67e22", // Orange
            "Central America": "#95a5a6", // Gray
            "Caribbean": "#d35400", // Dark orange
            "Middle East": "#c0392b", // Dark red
            "Southeast Asia": "#27ae60", // Dark green
            "Central Asia": "#8e44ad" // Dark purple
        };
        
        // Apply region-specific colors
        if (chartConfig.data && chartConfig.data.datasets && chartConfig.data.datasets.length > 0) {
            const labels = chartConfig.data.labels || [];
            const colors = labels.map(region => 
                regionColors[region] || `hsl(${(region.charCodeAt(0) * 5) % 360}, 70%, 60%)`
            );
            chartConfig.data.datasets[0].backgroundColor = colors;
        }
        
        // Apply specific customizations based on chart type
        if (chartType === 'bar') {
            // For bar charts, horizontal bars work better for region names
            chartConfig.options.indexAxis = 'y';
            
            if (chartConfig.options && chartConfig.options.scales) {
                // X-axis title
                chartConfig.options.scales.x.title = {
                    display: true,
                    text: this.getStatisticLabel(),
                    font: { size: 12, weight: 'bold' }
                };
                
                // Make room for longer region names
                chartConfig.options.scales.y.ticks = {
                    color: COLORS.textSecondary,
                    font: { size: 14, family: 'Roboto, sans-serif', weight: 'bold' }
                };
            }
        } else if (chartType === 'pie' || chartType === 'doughnut') {
            // For pie/doughnut charts, enhance tooltip
            if (chartConfig.options && chartConfig.options.plugins && chartConfig.options.plugins.tooltip) {
                chartConfig.options.plugins.tooltip.callbacks = {
                    label: (context) => {
                        const item = chartConfig.data._processedData?.formatted?.[context.dataIndex];
                        if (!item) {
                            const value = context.raw;
                            const total = context.chart.data.datasets[0].data.reduce((sum, val) => sum + val, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return [
                                `${context.label}: ${value}`,
                                `${percentage}% of total`
                            ];
                        }
                        
                        return [
                            `${this.getStatisticLabel()}: ${item.formatted}`,
                            `Countries: ${item.countries}`,
                            `Population: ${item.population}`,
                            `Area: ${item.area} km²`,
                            `Percentage: ${item.percentage}%`
                        ];
                    }
                };
            }
            
            // Position legend optimally based on data size
            if (chartConfig.options && chartConfig.options.plugins && chartConfig.options.plugins.legend) {
                const dataCount = chartConfig.data.labels ? chartConfig.data.labels.length : 0;
                chartConfig.options.plugins.legend.position = dataCount > 5 ? 'bottom' : 'right';
                chartConfig.options.plugins.legend.display = true;
                
                // Adjust legend label size based on data count
                chartConfig.options.plugins.legend.labels = {
                    font: {
                        size: dataCount > 8 ? 10 : 14,
                        family: 'Roboto, sans-serif'
                    },
                    boxWidth: dataCount > 8 ? 10 : 15,
                    padding: dataCount > 8 ? 5 : 10
                };
            }
            
            // For doughnut, smaller cutout to show more of the chart
            if (chartType === 'doughnut') {
                chartConfig.options.cutout = '40%';
            }
        } else if (chartType === 'polarArea') {
            // For polar area charts, special color handling
            if (chartConfig.options && chartConfig.options.scales && chartConfig.options.scales.r) {
                chartConfig.options.scales.r.angleLines = {
                    color: 'rgba(100, 100, 100, 0.1)'
                };
            }
            
            // Add legend for polar area chart for better clarity
            if (chartConfig.options && chartConfig.options.plugins) {
                chartConfig.options.plugins.legend = {
                    display: true,
                    position: 'right',
                    labels: {
                        font: {
                            size: 11
                        },
                        boxWidth: 12,
                        padding: 8
                    }
                };
            }
        }
        
        // Store processed data in chart configuration for tooltip access
        if (this.processedData) {
            chartConfig.data._processedData = this.processedData;
        }
        
        // Update title based on data shown
        if (chartConfig.options && chartConfig.options.plugins && chartConfig.options.plugins.title) {
            const dataCount = chartConfig.data.labels ? chartConfig.data.labels.length : 0;
            chartConfig.options.plugins.title.text = `Distribution of Countries by ${dataCount} UN Regions`;
        }
    }

    /**
     * Create region-specific chart controls
     * Removed the unnecessary "show" control as requested
     */
    createChartControls() {
        // Create base controls first
        super.createChartControls();
        
        if (!this.chartControls) return;
        
        // Add a region grouping selector without the "Group By:" label
        const groupGroup = document.createElement('div');
        groupGroup.className = 'form-group me-2 mb-2';
        
        const groupSelect = document.createElement('select');
        groupSelect.className = 'form-select form-select-sm region-group-select';
        groupSelect.setAttribute('aria-label', 'Select region grouping');
        
        const groupOptions = [
            { value: 'none', text: 'Show All Regions' },
            { value: 'continent', text: 'Group by Continent' }
        ];
        
        groupOptions.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.text;
            if (option.value === (this.options.groupBy || 'none')) {
                optionEl.selected = true;
            }
            groupSelect.appendChild(optionEl);
        });
        
        groupSelect.addEventListener('change', (e) => {
            this.changeGrouping(e.target.value);
        });
        
        groupGroup.appendChild(groupSelect);
        this.chartControls.appendChild(groupGroup);
        
        // "Show" stats selector is removed as requested since we always have a small number of regions/continents
    }

    /**
     * Change the region grouping
     * @param {string} groupBy - How to group regions
     */
    async changeGrouping(groupBy) {
        console.log(`[${this.containerId}] Changing region grouping to: ${groupBy}`);
        
        // Show loading overlay
        this.showLoading();
        
        try {
            // Store grouping option
            this.options.groupBy = groupBy;
            
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
            
            // Update descriptions to reflect current chart state
            const descriptions = this.generateDescriptions(this.processedData);
            this.updateChartDescriptions(descriptions);
            
            // Update title based on grouping
            if (groupBy === 'continent') {
                this.options.title = 'Regions Grouped by Continent';
            } else if (groupBy === 'development') {
                this.options.title = 'Regions by Development Status';
            } else {
                this.options.title = 'Number of Countries per Region';
            }
            
            // Update the chart title in the DOM
            const titleElement = this.container.querySelector('.chart-title');
            if (titleElement) {
                titleElement.textContent = this.options.title;
            }
        } catch (error) {
            console.error(`[${this.containerId}] Error changing region grouping:`, error);
            this.showError(`Failed to change region grouping: ${error.message}`);
        }
    }

    /**
     * Generate descriptions for the region chart
     * @param {Object} data - Processed chart data
     * @returns {Object} - Chart descriptions
     */
    generateDescriptions(data) {
        // Check data validity
        if (!data || !data.formatted || !Array.isArray(data.formatted) || data.formatted.length === 0) {
            return {
                title: 'Region Distribution',
                description: 'No region data available for analysis.',
                analysis: 'Unable to perform analysis due to missing data.',
                insights: 'Check data source and try again.'
            };
        }

        // Get current chart state info
        const groupingType = this.options.groupBy === 'continent' ? 'continent' : 'region';
        const statType = this.options.statistic || 'countries';
        const chartType = this.options.type || 'bar';
        
        // Get formatted data
        const formattedData = [...data.formatted].sort((a, b) => b.value - a.value);
        const totalItems = formattedData.reduce((sum, item) => sum + item.value, 0);
        const totalRegions = formattedData.length;
        
        // Get top and bottom regions
        const topRegion = formattedData[0];
        const bottomRegion = formattedData[formattedData.length - 1];
        
        // Calculate average value
        const avgValue = totalItems / totalRegions;
        
        // Count regions above and below average
        const regionsAboveAvg = formattedData.filter(item => item.value > avgValue).length;
        const regionsBelowAvg = formattedData.filter(item => item.value < avgValue).length;
        
        // Generate title that reflects current chart state
        let title = '';
        if (statType === 'countries') {
            title = `Countries by ${this.options.groupBy === 'continent' ? 'Continent' : 'UN Region'}`;
        } else if (statType === 'population') {
            title = `Population Distribution by ${this.options.groupBy === 'continent' ? 'Continent' : 'UN Region'}`;
        } else if (statType === 'area') {
            title = `Land Area Distribution by ${this.options.groupBy === 'continent' ? 'Continent' : 'UN Region'}`;
        }
        
        // Generate description that accurately reflects current chart state
        let description = '';
        if (statType === 'countries') {
            description = `This chart displays the distribution of countries across ${totalRegions} ${this.options.groupBy === 'continent' ? 'continents' : 'UN regions'} of the world. `;
            description += `${topRegion.name} has the highest number with ${topRegion.value} countries (${topRegion.percentage}%), `;
            description += `while ${bottomRegion.name} has the lowest with ${bottomRegion.value} countries (${bottomRegion.percentage}%).`;
        } else if (statType === 'population') {
            description = `This chart shows the population distribution across ${totalRegions} ${this.options.groupBy === 'continent' ? 'continents' : 'UN regions'} of the world. `;
            description += `${topRegion.name} is the most populated with ${topRegion.formatted} people (${topRegion.percentage}% of global population), `;
            description += `while ${bottomRegion.name} is the least populated with ${bottomRegion.formatted} people (${bottomRegion.percentage}%).`;
        } else if (statType === 'area') {
            description = `This chart illustrates the land area distribution across ${totalRegions} ${this.options.groupBy === 'continent' ? 'continents' : 'UN regions'} of the world. `;
            description += `${topRegion.name} covers the largest area with ${topRegion.formatted} square kilometers (${topRegion.percentage}% of global land area), `;
            description += `while ${bottomRegion.name} covers the smallest with ${bottomRegion.formatted} square kilometers (${bottomRegion.percentage}%).`;
        }
        
        // Generate analysis that accurately reflects current chart state
        let analysis = '';
        if (statType === 'countries') {
            analysis = `Among the ${totalRegions} ${groupingType}s, ${regionsAboveAvg} have more countries than the global average of ${avgValue.toFixed(1)}, and ${regionsBelowAvg} have fewer. `;
            
            // Calculate dispersion
            if (topRegion.value > bottomRegion.value * 3) {
                analysis += `There is a significant disparity in the distribution, with ${topRegion.name} having ${(topRegion.value / bottomRegion.value).toFixed(1)} times more countries than ${bottomRegion.name}.`;
            } else {
                analysis += `The distribution of countries shows a relatively balanced pattern across different ${groupingType}s.`;
            }
        } else if (statType === 'population') {
            analysis = `Of the ${totalRegions} ${groupingType}s shown, ${regionsAboveAvg} exceed the average population of ${new Intl.NumberFormat().format(Math.round(avgValue))}, while ${regionsBelowAvg} fall below this figure. `;
            
            // Population density insights
            const topDensityRegion = [...formattedData].sort((a, b) => (b.population / b.area) - (a.population / a.area))[0];
            analysis += `${topDensityRegion.name} has the highest population density among all ${groupingType}s.`;
        } else if (statType === 'area') {
            analysis = `Across the ${totalRegions} ${groupingType}s displayed, ${regionsAboveAvg} have more land area than the average of ${new Intl.NumberFormat().format(Math.round(avgValue))} square kilometers. `;
            
            // Land distribution insights
            const percentageTopThree = formattedData.slice(0, 3).reduce((sum, item) => sum + Number(item.percentage), 0);
            analysis += `The top three largest ${groupingType}s (${formattedData[0].name}, ${formattedData[1].name}, and ${formattedData[2].name}) account for ${percentageTopThree.toFixed(1)}% of the world's land area.`;
        }
        
        // Generate insights that accurately reflect current chart state
        let insights = '';
        if (statType === 'countries') {
            insights = `The distribution of countries reflects historical, political, and geographical factors. `;
            
            if (this.options.groupBy === 'continent') {
                insights += `With ${formattedData[0].value} countries, ${formattedData[0].name} contains the most nations, highlighting its complex political history and diverse cultural landscape. `;
                insights += `In contrast, ${formattedData[formattedData.length - 1].name} with ${formattedData[formattedData.length - 1].value} countries represents a more unified geographical entity.`;
            } else {
                insights += `${formattedData[0].name} with ${formattedData[0].value} countries reflects intense regional fragmentation, potentially due to historical colonization patterns, linguistic differences, or geographical barriers. `;
                insights += `The ${formattedData[formattedData.length - 1].name} region with ${formattedData[formattedData.length - 1].value} countries suggests greater political integration or shared cultural identity.`;
            }
        } else if (statType === 'population') {
            insights = `Population distribution reveals important patterns of human settlement and demographic trends. `;
            
            // Find most populous region and its percentage
            insights += `${formattedData[0].name} contains ${formattedData[0].percentage}% of the world's population, significantly influencing global demographics, economics, and environmental impact. `;
            
            // Compare population concentrations
            const topTwoPopulation = formattedData.slice(0, 2).reduce((sum, item) => sum + Number(item.percentage), 0);
            insights += `The fact that ${formattedData[0].name} and ${formattedData[1].name} together account for ${topTwoPopulation.toFixed(1)}% of global population highlights the concentration of humanity in these regions.`;
        } else if (statType === 'area') {
            insights = `Land area distribution helps explain resource availability, population density, and environmental challenges. `;
            
            // Find region with most area per country
            const regionWithMostAreaPerCountry = [...formattedData]
                .filter(r => r.countries > 1) // Avoid division by zero or single-country regions
                .sort((a, b) => (b.area / b.countries) - (a.area / a.countries))[0];
                
            insights += `Countries in ${regionWithMostAreaPerCountry.name} have the largest average land area, suggesting vast territories with potentially lower population densities. `;
            insights += `This can impact everything from resource management to transportation infrastructure and political organization.`;
        }
        
        return {
            title: title,
            description: description,
            analysis: analysis,
            insights: insights
        };
    }

    /**
     * Toggle between vertical and horizontal bar orientation
     * @param {boolean} horizontal - Whether to use horizontal bars
     */
    async toggleOrientation(horizontal) {
        console.log(`[${this.containerId}] Toggling horizontal orientation: ${horizontal}`);
        
        // Show loading overlay
        this.showLoading();
        
        try {
            // Store orientation option
            this.options.horizontal = horizontal;
            
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
        } catch (error) {
            console.error(`[${this.containerId}] Error toggling orientation:`, error);
            this.showError(`Failed to update chart orientation: ${error.message}`);
        }
    }

    /**
     * Get the label for the current statistic
     * @returns {string} The label describing the current statistic
     */
    getStatisticLabel() {
        switch (this.options.statistic) {
            case 'population':
                return 'Total Population';
            case 'area':
                return 'Land Area';
            case 'countries':
            default:
                return 'Country Count';
        }
    }

    /**
     * Get the suffix for the current statistic
     * @returns {string} The suffix for the current statistic
     */
    getStatisticLabelSuffix() {
        switch (this.options.statistic) {
            case 'population':
                return 'people';
            case 'area':
                return 'km²';
            case 'countries':
            default:
                return 'countries';
        }
    }
}