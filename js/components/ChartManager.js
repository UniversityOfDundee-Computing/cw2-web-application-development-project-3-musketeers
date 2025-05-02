/**
 * ChartManager
 * Handles chart interactions including hover and click states
 */

import { countryService } from '../services/countryService.js';

export class ChartManager {
    constructor() {
        this.activeChart = null;
        this.apiData = null;
        this.chartInstances = new Map(); // Track chart instances from the page
        
        // Base descriptions that will be enhanced with API data
        this.baseDescriptions = {
            population: 'Population distribution showing world\'s most populous nations',
            continent: 'Analysis of continental population patterns',
            region: 'Breakdown of UN-defined geographical regions',
            currency: 'Analysis of global currency usage',
            timezone: 'Global timezone distribution',
            independence: 'Sovereignty status analysis',
            borders: 'Border statistics showing countries with most neighbors',
            language: 'Language distribution analysis'
        };
        
        // Enhanced descriptions will store API-enhanced versions
        this.enhancedDescriptions = {};
        
        this.setupEventListeners();
        this.fetchAPIData();
        this.findChartInstances();
    }
    
    /**
     * Attempt to find chart instances from the WorldDataPage
     */
    findChartInstances() {
        // Try to find the chart instances from the WorldDataPage
        // This will allow us to access the actual chart data
        setTimeout(() => {
            try {
                // Look for the WorldDataPage instance in the global scope or Window
                const worldDataPageVariable = Object.values(window).find(
                    value => value && 
                    typeof value === 'object' && 
                    value.charts instanceof Map && 
                    value.charts.size > 0
                );
                
                if (worldDataPageVariable && worldDataPageVariable.charts) {
                    this.chartInstances = worldDataPageVariable.charts;
                    // Now that we have the chart instances, update descriptions with live data
                    this.updateDescriptionsWithLiveData();
                }
            } catch (error) {
                // Error finding chart instances
            }
        }, 1500); // Give some time for charts to be initialized
    }
    
    /**
     * Update descriptions with live data from chart instances
     */
    updateDescriptionsWithLiveData() {
        if (!this.chartInstances || this.chartInstances.size === 0) {
            return;
        }
        
        // For each chart instance, update its description with actual data
        this.chartInstances.forEach((chartInstance, chartId) => {
            try {
                const type = this.getChartTypeFromId(chartId);
                if (!type || !this.baseDescriptions[type]) {
                    return;
                }
                
                // Get processed data from chart instance
                const processedData = chartInstance.processedData;
                if (!processedData) {
                    return;
                }
                
                // Generate description based on chart type and live data
                let liveDescription = this.generateLiveDescription(type, processedData, chartInstance);
                
                // Update enhanced descriptions
                if (liveDescription) {
                    this.enhancedDescriptions[type] = liveDescription;
                }
            } catch (error) {
                // Error updating description
            }
        });
    }
    
    /**
     * Generate live description based on chart type and data
     */
    generateLiveDescription(type, data, chartInstance) {
        const baseDescription = this.baseDescriptions[type];
        let description = baseDescription;
        
        try {
            // Get sort order (if available from chartInstance)
            const sortOrder = chartInstance && chartInstance.options ? chartInstance.options.sort || 'desc' : 'desc';
            const sortContext = sortOrder === 'asc' ? 'lowest to highest' : 'highest to lowest';
            const isAscending = sortOrder === 'asc';
            
            switch (type) {
                case 'population':
                    if (data.labels && data.values) {
                        // Adapt description based on sort order
                        const countries = isAscending ? 'smallest' : 'most populous';
                        const topCountries = data.labels.slice(0, 3).join(', ');
                        const totalPopulation = data.values.reduce((sum, val) => sum + val, 0);
                        const formattedTotal = new Intl.NumberFormat().format(totalPopulation);
                        description = `${baseDescription} showing the ${countries} nations. ${topCountries} ${isAscending ? 'have' : 'being'} the ${isAscending ? 'smallest' : 'largest'} populations. These countries represent ${formattedTotal} people combined.`;
                    }
                    break;
                    
                case 'continent':
                    if (data.labels && data.values) {
                        const topContinent = data.labels[0];
                        const topContinentPercent = Math.round((data.values[0] / data.values.reduce((sum, val) => sum + val, 0)) * 100);
                        description = `${baseDescription}. Data is sorted from ${sortContext}. ${topContinent} has the ${isAscending ? 'smallest' : 'largest'} population at approximately ${topContinentPercent}% of the world total.`;
                    }
                    break;
                    
                case 'region':
                    if (data.labels && data.values) {
                        const totalRegions = data.labels.length;
                        const regionWithMostCountries = data.labels[0];
                        description = `${baseDescription}. Data shows ${totalRegions} regions sorted from ${sortContext}, with ${regionWithMostCountries} having the ${isAscending ? 'fewest' : 'most'} countries.`;
                    }
                    break;
                    
                case 'currency':
                    if (data.labels && data.values) {
                        const topCurrency = data.labels[0];
                        const countryCount = data.values[0];
                        description = `${baseDescription}. ${topCurrency} is used in ${countryCount} countries, making it the ${isAscending ? 'least' : 'most'} widely used currency in this dataset.`;
                    }
                    break;
                    
                case 'timezone':
                    if (data.labels && data.values) {
                        const topTimezone = data.labels[0];
                        const countryCount = data.values[0];
                        description = `${baseDescription}. The timezone ${topTimezone} is used by ${countryCount} countries, making it the ${isAscending ? 'least' : 'most'} common timezone.`;
                    }
                    break;
                    
                case 'independence':
                    if (data.labels && data.values) {
                        const independentCount = data.values[0];
                        const dependentCount = data.values[1] || 0;
                        const total = independentCount + dependentCount;
                        const independentPercent = Math.round((independentCount / total) * 100);
                        description = `${baseDescription}. ${independentCount} countries (${independentPercent}%) are independent, while ${dependentCount} territories remain dependent.`;
                    }
                    break;
                    
                case 'borders':
                    if (data.labels && data.values) {
                        const countryWithMostBorders = data.labels[0];
                        const borderCount = data.values[0];
                        description = `${baseDescription}. ${countryWithMostBorders} has ${borderCount} neighboring countries, the ${isAscending ? 'lowest' : 'highest'} number in this dataset.`;
                    }
                    break;
                    
                case 'language':
                    if (data.labels && data.values) {
                        const topLanguages = data.labels.slice(0, 2).join(' and ');
                        description = `${baseDescription}. ${topLanguages} are the ${isAscending ? 'least' : 'most'} common official languages used globally.`;
                    }
                    break;
            }
            
            // Add timestamp to show data is current
            const currentDate = new Date();
            description += ` (Data as of ${currentDate.toLocaleDateString()})`;
            
            return description;
        } catch (error) {
            return this.enhancedDescriptions[type] || baseDescription;
        }
    }
    
    /**
     * Get chart type from chart ID
     */
    getChartTypeFromId(chartId) {
        // Handle both numeric and non-numeric IDs
        if (chartId === 'chartContainer' || chartId === 'chartContainer1' || chartId === 1) return 'population';
        if (chartId === 'chartContainer2' || chartId === 2) return 'continent';
        if (chartId === 'chartContainer3' || chartId === 3) return 'region';
        if (chartId === 'chartContainer4' || chartId === 4) return 'currency';
        if (chartId === 'chartContainer5' || chartId === 5) return 'timezone';
        if (chartId === 'chartContainer6' || chartId === 6) return 'independence';
        if (chartId === 'chartContainer7' || chartId === 7) return 'borders';
        if (chartId === 'chartContainer8' || chartId === 8) return 'language';
        
        // Extract number from ID if it's in a different format
        if (typeof chartId === 'string') {
            const match = chartId.match(/\d+$/);
            if (match) {
                const num = parseInt(match[0], 10);
                switch (num) {
                    case 1: return 'population';
                    case 2: return 'continent';
                    case 3: return 'region';
                    case 4: return 'currency';
                    case 5: return 'timezone';
                    case 6: return 'independence';
                    case 7: return 'borders';
                    case 8: return 'language';
                }
            }
        }
        
        return null;
    }
    
    /**
     * Fetch API data to enhance chart descriptions
     */
    async fetchAPIData() {
        try {
            const countries = await countryService.getAllCountries();
            this.apiData = countries;
            
            // Process the data and enhance descriptions
            this.enhanceDescriptionsWithAPIData();
        } catch (error) {
            // Fall back to base descriptions if API fails
            this.enhancedDescriptions = { ...this.baseDescriptions };
        }
    }
    
    /**
     * Enhance descriptions with API data
     */
    enhanceDescriptionsWithAPIData() {
        if (!this.apiData || this.apiData.length === 0) return;
        
        try {
            // Process population data
            const populationData = countryService.processPopulationData(this.apiData);
            const top3Population = populationData.slice(0, 3).map(c => c.name).join(', ');
            this.enhancedDescriptions.population = `${this.baseDescriptions.population}, with ${top3Population} being the most populous. Total countries analyzed: ${this.apiData.length}.`;
            
            // Process continent data
            const continentData = countryService.processContinentData(this.apiData);
            const continentCount = Object.keys(continentData).length;
            const mostPopulousContinent = Object.entries(continentData)
                .sort((a, b) => b[1] - a[1])[0][0];
            this.enhancedDescriptions.continent = `${this.baseDescriptions.continent} across ${continentCount} continents, with ${mostPopulousContinent} having the highest population density.`;
            
            // Process language data
            const languageData = countryService.processLanguageData(this.apiData);
            const languageCount = Object.keys(languageData).length;
            const topLanguage = Object.entries(languageData)
                .sort((a, b) => b[1] - a[1])[0][0];
            this.enhancedDescriptions.language = `${this.baseDescriptions.language} showing ${topLanguage} as the most common official language, used in ${languageData[topLanguage]} countries.`;
            
            // Process region data
            const regions = {};
            this.apiData.forEach(c => {
                if (c.region) {
                    regions[c.region] = (regions[c.region] || 0) + 1;
                }
            });
            const regionCount = Object.keys(regions).length;
            this.enhancedDescriptions.region = `${this.baseDescriptions.region} across ${regionCount} different regions, with varying economic and population metrics.`;
            
            // Process currency data
            const currencies = {};
            this.apiData.forEach(c => {
                if (c.currencies) {
                    Object.keys(c.currencies).forEach(code => {
                        currencies[code] = (currencies[code] || 0) + 1;
                    });
                }
            });
            const currencyCount = Object.keys(currencies).length;
            const topCurrency = Object.entries(currencies)
                .sort((a, b) => b[1] - a[1])[0][0];
            this.enhancedDescriptions.currency = `${this.baseDescriptions.currency} covering ${currencyCount} currencies, with ${topCurrency} being used in the most countries (${currencies[topCurrency]}).`;
            
            // Process timezone data
            const timezones = {};
            this.apiData.forEach(c => {
                if (c.timezones) {
                    c.timezones.forEach(tz => {
                        timezones[tz] = (timezones[tz] || 0) + 1;
                    });
                }
            });
            const timezoneCount = Object.keys(timezones).length;
            this.enhancedDescriptions.timezone = `${this.baseDescriptions.timezone} with data on ${timezoneCount} different time zones impacting international operations and business hour overlaps.`;
            
            // Process independence data
            const independent = this.apiData.filter(c => c.independent === true).length;
            const nonIndependent = this.apiData.filter(c => c.independent === false).length;
            this.enhancedDescriptions.independence = `${this.baseDescriptions.independence} showing ${independent} independent countries and ${nonIndependent} dependent territories.`;
            
            // Process border data
            const borderCounts = this.apiData
                .filter(c => c.borders && c.borders.length)
                .map(c => ({
                    name: c.name.common,
                    count: c.borders.length
                }))
                .sort((a, b) => b.count - a.count);
            
            const topBorderCountry = borderCounts.length > 0 ? borderCounts[0].name : 'Unknown';
            const topBorderCount = borderCounts.length > 0 ? borderCounts[0].count : 0;
            this.enhancedDescriptions.borders = `${this.baseDescriptions.borders}, with ${topBorderCountry} having the most at ${topBorderCount} neighboring countries.`;
            
        } catch (error) {
            // Fall back to base descriptions if processing fails
            this.enhancedDescriptions = { ...this.baseDescriptions };
        }
    }

    /**
     * Set up event listeners for chart interactions
     */
    setupEventListeners() {
        const setupChart = (chart) => {
            // *** ADDED: Check if this is the world stats container and skip if so ***
            if (chart.id === 'chartContainer9') {
                return; // Don't attach hover/click listeners to the world stats card
            }
            // *** END ADDED ***

            if (chart.dataset.initialized) return;

            // Mouse events - only keep hover effect, not description display
            chart.addEventListener('mouseenter', () => {
                // Only add hover class, don't show description
                if (this.activeChart !== chart) {
                    chart.classList.add('hover');
                }
            });
            
            chart.addEventListener('mouseleave', () => {
                chart.classList.remove('hover');
            });
            
            chart.addEventListener('click', (e) => {
                // Don't handle click if the close button was clicked
                if (e.target.closest('.chart-close-btn')) {
                    e.stopPropagation();
                    this.clearExpandedState();
                    return;
                }
                this.handleClick(chart);
            });

            // Add click handler for close button
            const closeBtn = chart.querySelector('.chart-close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.clearExpandedState();
                });
            }

            // Keyboard events for accessibility
            chart.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleClick(chart);
                }
                if (e.key === 'Escape' && this.activeChart === chart) {
                    this.clearExpandedState();
                }
            });

            chart.dataset.initialized = 'true';
        };

        // Set up initial charts
        const charts = document.querySelectorAll('.chart-container');
        charts.forEach(setupChart);

        // Watch for new charts being added
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    // *** ADDED: Check node type and class ***
                    if (node.nodeType === Node.ELEMENT_NODE && node.classList && node.classList.contains('chart-container')) {
                    // *** END ADDED ***
                        setupChart(node);
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Handle clicks on backdrop to close expanded charts
        const backdrop = document.querySelector('.chart-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', () => {
                this.clearExpandedState();
            });
        }

        // Handle clicks outside charts
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.chart-container')) {
                this.clearExpandedState();
            }
        });

        // Handle escape key to close expanded charts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeChart) {
                this.clearExpandedState();
            }
        });
    }

    /**
     * Handle chart click state
     */
    handleClick(chart) {
        // *** ADDED: Prevent click handling for world stats container ***
        if (chart.id === 'chartContainer9') {
            return; // Do nothing if the world stats card is clicked
        }
        // *** END ADDED ***

        if (this.activeChart === chart) {
            this.clearExpandedState();
        } else {
            this.setExpandedState(chart);
        }
    }

    /**
     * Set expanded state for a chart
     */
    setExpandedState(chart) {
        // Clear previous expanded state if any
        this.clearExpandedState();
        
        // Store the current card state to restore later
        this.storeOriginalState(chart);
        
        // Add body class to enable backdrop
        document.body.classList.add('chart-expanded');
        
        // Set new expanded state
        chart.classList.add('expanded');
        chart.setAttribute('aria-expanded', 'true');
        this.activeChart = chart;
        
        // Make the chart content area visible
        const chartContent = chart.querySelector('.chart-content');
        if (chartContent) {
            chartContent.style.display = 'flex';
        }
        
        // Show detailed analysis instead of overlay
        this.showDetailedAnalysis(chart);
        
        // Make backdrop visible
        const backdrop = document.querySelector('.chart-backdrop');
        if (backdrop) {
            backdrop.style.opacity = '1';
            backdrop.style.pointerEvents = 'auto';
        }
        
        // Prevent body scrolling when a chart is expanded
        document.body.style.overflow = 'hidden';
        
        // Announce for screen readers
        this.announceForScreenReader(chart, 'expanded');
    }

    /**
     * Store the original state of the chart before expansion
     */
    storeOriginalState(chart) {
        // Save position, size, and style properties
        const rect = chart.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(chart);
        
        chart._originalState = {
            rect: {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height
            },
            style: {
                position: chart.style.position || computedStyle.position,
                top: chart.style.top || computedStyle.top,
                left: chart.style.left || computedStyle.left,
                width: chart.style.width || computedStyle.width,
                height: chart.style.height || computedStyle.height,
                transform: chart.style.transform || computedStyle.transform,
                zIndex: chart.style.zIndex || computedStyle.zIndex
            },
            scrollTop: window.scrollY,
            scrollLeft: window.scrollX
        };
    }

    /**
     * Clear expanded state
     */
    clearExpandedState() {
        if (this.activeChart) {
            const chart = this.activeChart;
            
            // Hide detailed analysis first
            this.hideDetailedAnalysis(chart);
            
            // Remove expanded class
            chart.classList.remove('expanded');
            chart.setAttribute('aria-expanded', 'false');
            
            // Reset body class
            document.body.classList.remove('chart-expanded');
            
            // Hide backdrop
            const backdrop = document.querySelector('.chart-backdrop');
            if (backdrop) {
                backdrop.style.opacity = '0';
                backdrop.style.pointerEvents = 'none';
            }
            
            // Restore body scrolling
            document.body.style.overflow = '';
            
            // Announce for screen readers
            this.announceForScreenReader(chart, 'collapsed');
            
            // Reset the chart-content visibility
            const chartContent = chart.querySelector('.chart-content');
            if (chartContent) {
                // Ensure there's no duplicate title by restoring normal flow
                chartContent.style.display = 'block';
            }
            
            // Clean up all inline styles that might cause shrinking
            chart.style.removeProperty('position');
            chart.style.removeProperty('top');
            chart.style.removeProperty('left');
            chart.style.removeProperty('width');
            chart.style.removeProperty('height');
            chart.style.removeProperty('transform');
            chart.style.removeProperty('z-index');
            chart.style.removeProperty('max-width');
            chart.style.removeProperty('max-height');
            
            // Reset all card-body styles too
            const cardBody = chart.querySelector('.card-body');
            if (cardBody) {
                cardBody.style.removeProperty('display');
                cardBody.style.removeProperty('grid-template-columns');
                cardBody.style.removeProperty('grid-gap');
                cardBody.style.removeProperty('padding');
                cardBody.style.removeProperty('overflow-y');
            }
            
            this.activeChart = null;
        }
    }

    /**
     * Restore chart to its original state before expansion
     */
    restoreOriginalState(chart) {
        if (!chart._originalState) return;
        
        // Don't directly set fixed position, as this would cause a jump
        // Instead, let the CSS handle the transition back
    }

    /**
     * Clean up temporary inline styles after transition
     */
    cleanupTempStyles(chart) {
        if (!chart._originalState) return;
        
        // Remove all inline positioning styles
        chart.style.removeProperty('position');
        chart.style.removeProperty('top');
        chart.style.removeProperty('left');
        chart.style.removeProperty('width');
        chart.style.removeProperty('height');
        chart.style.removeProperty('transform');
        chart.style.removeProperty('z-index');
        
        // Clear the stored state
        delete chart._originalState;
    }

    /**
     * Show detailed analysis on the right side
     * Updated to use descriptions and insights based on live chart data
     */
    showDetailedAnalysis(chart) {
        const type = this.getChartType(chart);
        
        // Try to get real-time data for this specific chart
        const chartId = chart.id;
        let description = this.enhancedDescriptions[type] || this.baseDescriptions[type];
        let insights = [];
        
        // If we have chart instances, try to get live data right now
        if (this.chartInstances && this.chartInstances.has(chartId)) {
            const chartInstance = this.chartInstances.get(chartId);
            if (chartInstance && chartInstance.processedData) {
                const liveDescription = this.generateLiveDescription(type, chartInstance.processedData, chartInstance);
                if (liveDescription) {
                    description = liveDescription;
                }
                
                // Generate dynamic insights based on chart type and data
                insights = this.generateDynamicInsights(type, chartInstance.processedData);
            }
        }
        
        // Analysis is already in the HTML, we just need to ensure it's visible
        const analysisDiv = chart.querySelector('.chart-detail-analysis');
        if (!analysisDiv) {
            return;
        }
        
        // Update the description paragraph with API-enhanced data
        const descParagraph = analysisDiv.querySelector('p');
        if (descParagraph) {
            descParagraph.textContent = description;
        }
        
        // Update the key insights with dynamically generated ones
        const insightsList = analysisDiv.querySelector('.analysis-data ul');
        if (insightsList && insights.length > 0) {
            insightsList.innerHTML = '';
            insights.forEach(insight => {
                const li = document.createElement('li');
                li.textContent = insight;
                insightsList.appendChild(li);
            });
        }
        
        // Remove related metrics section or hide it
        const relatedMetricsHeading = analysisDiv.querySelector('.analysis-data h5:nth-of-type(2)');
        const relatedMetricsP = analysisDiv.querySelector('.analysis-data h5 + p');
        if (relatedMetricsHeading) {
            relatedMetricsHeading.style.display = 'none';
        }
        if (relatedMetricsP) {
            relatedMetricsP.style.display = 'none';
        }
        
        // Remove data source information
        const dataSourceDiv = analysisDiv.querySelector('.data-source');
        if (dataSourceDiv) {
            dataSourceDiv.style.display = 'none';
        }
        
        analysisDiv.style.display = 'flex';
        analysisDiv.style.opacity = '1';
        
        // Hide the bottom overlay
        const overlay = chart.querySelector('.chart-detail-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    /**
     * Generate dynamic insights based on chart type and data
     */
    generateDynamicInsights(type, data) {
        const insights = [];
        
        try {
            // Get sort order from data arrangement and chart instance
            // For population chart, we can determine if we're showing least populous by checking the chart title
            // or by comparing the values (if first value is smaller than last, it's ascending order)
            const isAscending = data.values && data.values.length > 1 && 
                (data.values[0] < data.values[data.values.length - 1] || 
                 (data.title && data.title.toLowerCase().includes('least')));
            
            switch (type) {
                case 'population':
                    if (data.labels && data.values && data.labels.length > 0) {
                        if (isAscending) {
                            // For ascending order (least populous first)
                            const leastPopulous = data.labels[0];
                            const populationLeastPopulous = new Intl.NumberFormat().format(data.values[0]);
                            insights.push(`${leastPopulous} has the smallest population with ${populationLeastPopulous} people.`);
                            
                            if (data.labels.length > 1) {
                                const secondLeastPopulous = data.labels[1];
                                insights.push(`${secondLeastPopulous} is the second least populous with ${new Intl.NumberFormat().format(data.values[1])} people.`);
                            }
                            
                            // Calculate total population of bottom 5
                            const totalBottom5 = data.values.reduce((sum, val) => sum + val, 0);
                            const formattedTotal = new Intl.NumberFormat().format(totalBottom5);
                            insights.push(`The 5 least populous territories shown represent only ${formattedTotal} people combined.`);
                            
                            // Calculate percentage of world population (very small)
                            const worldPopulation = 8000000000; // Approximation of world population
                            const percentage = ((totalBottom5 / worldPopulation) * 100).toFixed(8);
                            insights.push(`These territories represent approximately ${percentage}% of the world's population.`);
                        } else {
                            // For descending order (most populous first)
                            const mostPopulous = data.labels[0];
                            const populationMostPopulous = new Intl.NumberFormat().format(data.values[0]);
                            insights.push(`${mostPopulous} is the most populous country with ${populationMostPopulous} people.`);
                            
                            if (data.labels.length > 1) {
                                const secondMostPopulous = data.labels[1];
                                insights.push(`${secondMostPopulous} is the second most populous country with ${new Intl.NumberFormat().format(data.values[1])} people.`);
                            }
                            
                            // Calculate total population of top 5
                            const totalTop5 = data.values.reduce((sum, val) => sum + val, 0);
                            const formattedTotal = new Intl.NumberFormat().format(totalTop5);
                            insights.push(`The top 5 most populous countries represent approximately ${formattedTotal} people combined.`);
                            
                            // Calculate ratio between most and least populous in top 5
                            if (data.values.length >= 5) {
                                const ratio = Math.round(data.values[0] / data.values[4]);
                                if (ratio > 1) {
                                    insights.push(`${mostPopulous} has approximately ${ratio} times the population of ${data.labels[4]}.`);
                                }
                            }
                        }
                    }
                    break;
                    
                case 'continent':
                    if (data.labels && data.values && data.labels.length > 0) {
                        const totalPopulation = data.values.reduce((sum, val) => sum + val, 0);
                        const formattedTotal = new Intl.NumberFormat().format(totalPopulation);
                        insights.push(`The world population across all continents is approximately ${formattedTotal} people.`);
                        
                        const mostPopulous = data.labels[0];
                        const populationPercentage = Math.round((data.values[0] / totalPopulation) * 100);
                        insights.push(`${mostPopulous} is the most populous continent with ${populationPercentage}% of the world's population.`);
                        
                        const leastPopulous = data.labels[data.values.indexOf(Math.min(...data.values))];
                        const leastPopulousPercentage = Math.round((Math.min(...data.values) / totalPopulation) * 10000) / 100;
                        insights.push(`${leastPopulous} is the least populous continent with only ${leastPopulousPercentage}% of the world's population.`);
                        
                        // Comparison between continents
                        if (data.labels.length > 1) {
                            const ratio = Math.round(data.values[0] / Math.min(...data.values));
                            if (ratio > 0) {
                                insights.push(`${mostPopulous} has approximately ${ratio} times the population of ${leastPopulous}.`);
                            }
                        }
                    }
                    break;
                    
                case 'region':
                    if (data.labels && data.values && data.labels.length > 0) {
                        const totalRegions = data.labels.length;
                        insights.push(`There are ${totalRegions} regions defined in the UN classification system shown in this chart.`);
                        
                        const regionWithMostCountries = data.labels[data.values.indexOf(Math.max(...data.values))];
                        const countryCountMax = Math.max(...data.values);
                        insights.push(`${regionWithMostCountries} has the most countries with ${countryCountMax} nations.`);
                        
                        const regionWithLeastCountries = data.labels[data.values.indexOf(Math.min(...data.values))];
                        const countryCountMin = Math.min(...data.values);
                        insights.push(`${regionWithLeastCountries} has the fewest countries with ${countryCountMin} territories.`);
                        
                        const totalCountries = data.values.reduce((sum, val) => sum + val, 0);
                        insights.push(`There are a total of ${totalCountries} countries and territories across these regions according to the dataset.`);
                    }
                    break;
                    
                case 'currency':
                    if (data.labels && data.values && data.labels.length > 0) {
                        const mostCommon = data.labels[0];
                        const countryCountMost = data.values[0];
                        insights.push(`${mostCommon} is used in ${countryCountMost} countries, making it the most widely used currency in the dataset.`);
                        
                        if (data.labels.length > 1) {
                            const secondMostCommon = data.labels[1];
                            insights.push(`${secondMostCommon} is the second most common currency, used in ${data.values[1]} countries.`);
                        }
                        
                        const totalCurrencies = data.labels.length;
                        insights.push(`This chart shows ${totalCurrencies} currencies from the dataset.`);
                        
                        const totalCountriesUsingTop5 = data.values.reduce((sum, val) => sum + val, 0);
                        insights.push(`${totalCountriesUsingTop5} countries use one of these currencies as their official currency.`);
                    }
                    break;
                    
                case 'timezone':
                    if (data.labels && data.values && data.labels.length > 0) {
                        const mostCommon = data.labels[0];
                        const countryCountMost = data.values[0];
                        insights.push(`${mostCommon} is used by ${countryCountMost} countries, making it the most common timezone.`);
                        
                        if (data.values.length > 1) {
                            const secondMostCommon = data.labels[1];
                            insights.push(`${secondMostCommon} is the second most common timezone, used in ${data.values[1]} countries.`);
                        }
                        
                        const totalShown = data.labels.length;
                        insights.push(`The chart displays the ${totalShown} most common timezones from the dataset.`);
                        
                        const totalCountriesInTop = data.values.reduce((sum, val) => sum + val, 0);
                        insights.push(`${totalCountriesInTop} countries use one of these displayed timezones.`);
                    }
                    break;
                    
                case 'independence':
                    if (data.labels && data.values && data.labels.length > 0) {
                        const independentCount = data.values[0] || 0;
                        const dependentCount = data.values[1] || 0;
                        const total = independentCount + dependentCount;
                        const independentPercentage = Math.round((independentCount / total) * 100);
                        const dependentPercentage = Math.round((dependentCount / total) * 100);
                        
                        insights.push(`${independentCount} countries (${independentPercentage}%) are internationally recognized as independent sovereign states.`);
                        insights.push(`${dependentCount} territories (${dependentPercentage}%) have dependent or special sovereignty status.`);
                        insights.push(`The dataset contains a total of ${total} countries and territories.`);
                        insights.push(`The ratio of independent to dependent territories is ${(independentCount / dependentCount).toFixed(1)} to 1.`);
                    }
                    break;
                    
                case 'borders':
                    if (data.labels && data.values && data.labels.length > 0) {
                        const countryWithMostBorders = data.labels[0];
                        const borderCount = data.values[0];
                        insights.push(`${countryWithMostBorders} has ${borderCount} neighboring countries, the most according to the dataset.`);
                        
                        if (data.labels.length > 1) {
                            insights.push(`${data.labels[1]} has ${data.values[1]} borders, making it the country with the second highest number of neighbors.`);
                        }
                        
                        // Calculate average borders in top 5
                        if (data.values.length >= 3) {
                            const avgBorders = data.values.slice(0, 5).reduce((sum, val) => sum + val, 0) / Math.min(5, data.values.length);
                            insights.push(`Countries with the most borders average ${avgBorders.toFixed(1)} neighboring nations.`);
                        }
                        
                        // Calculate total borders shown in chart
                        const totalBorders = data.values.reduce((sum, val) => sum + val, 0);
                        insights.push(`The countries in this chart share a total of ${totalBorders} borders with neighboring nations.`);
                    }
                    break;
                    
                case 'language':
                    if (data.labels && data.values && data.labels.length > 0) {
                        const mostCommon = data.labels[0];
                        const countryCountMost = data.values[0];
                        insights.push(`${mostCommon} is an official language in ${countryCountMost} countries, making it the most common in the dataset.`);
                        
                        if (data.labels.length > 1) {
                            const secondMostCommon = data.labels[1];
                            insights.push(`${secondMostCommon} is the second most common official language, used in ${data.values[1]} countries.`);
                        }
                        
                        const totalLangsShown = data.labels.length;
                        insights.push(`This chart displays the ${totalLangsShown} most common official languages from the dataset.`);
                        
                        // Calculate percentage of countries using these top languages
                        const totalCountriesUsingTopLangs = data.values.reduce((sum, val) => sum + val, 0);
                        insights.push(`These displayed languages are used officially in ${totalCountriesUsingTopLangs} countries combined.`);
                    }
                    break;
                    
                default:
                    insights.push(`This chart displays ${type} data from the REST Countries API.`);
                    insights.push(`The chart contains ${data.labels ? data.labels.length : 0} data points.`);
                    insights.push(`The data was retrieved from the REST Countries API.`);
                    insights.push(`Last updated: ${new Date().toLocaleString()}`);
            }
        } catch (error) {
            insights.push(`This chart shows ${type} data from the REST Countries API.`);
            insights.push(`The chart contains ${data.labels ? data.labels.length : 0} data points.`);
            insights.push(`Data is current as of ${new Date().toLocaleDateString()}.`);
        }
        
        return insights;
    }

    /**
     * Hide detailed analysis
     */
    hideDetailedAnalysis(chart) {
        const analysisDiv = chart.querySelector('.chart-detail-analysis');
        if (!analysisDiv) return;
        
        analysisDiv.style.display = 'none';
        
        // Reset overlay display
        const overlay = chart.querySelector('.chart-detail-overlay');
        if (overlay) {
            overlay.style.display = '';
        }
    }

    /**
     * Get chart type from chart title
     */
    getChartType(chart) {
        // First try to get type from id
        const id = chart.id.toLowerCase();
        
        // Direct test for specific chart IDs
        if (id === 'chartcontainer' || id === 'chartcontainer1') return 'population';
        if (id === 'chartcontainer2') return 'continent';
        if (id === 'chartcontainer3') return 'region';
        if (id === 'chartcontainer4') return 'currency';
        if (id === 'chartcontainer5') return 'timezone';
        if (id === 'chartcontainer6') return 'independence';
        if (id === 'chartcontainer7') return 'borders';
        if (id === 'chartcontainer8') return 'language';
        
        // Use regex to extract numbers from IDs that might have different formats
        const match = id.match(/(\d+)/);
        if (match) {
            const num = parseInt(match[0], 10);
            switch (num) {
                case 1: return 'population';
                case 2: return 'continent';
                case 3: return 'region';
                case 4: return 'currency';
                case 5: return 'timezone';
                case 6: return 'independence';
                case 7: return 'borders';
                case 8: return 'language';
                default: break;
            }
        }

        // Fallback to title matching if id doesn't give us the type
        const title = chart.querySelector('.chart-title')?.textContent.toLowerCase() || '';
        
        if (title.includes('population') || title.includes('populous')) return 'population';
        if (title.includes('continent')) return 'continent';
        if (title.includes('region')) return 'region';
        if (title.includes('currency')) return 'currency';
        if (title.includes('timezone')) return 'timezone';
        if (title.includes('independence')) return 'independence';
        if (title.includes('border')) return 'borders';
        if (title.includes('language')) return 'language';
        
        return 'default';
    }

    /**
     * Announce chart state changes for screen readers
     */
    announceForScreenReader(chart, state) {
        const announcement = document.createElement('div');
        announcement.className = 'visually-hidden';
        announcement.setAttribute('aria-live', 'polite');
        announcement.textContent = `Chart ${state}. ${state === 'expanded' ? 'Press Escape to collapse.' : ''}`;
        
        document.body.appendChild(announcement);
        setTimeout(() => announcement.remove(), 1000);
    }
}