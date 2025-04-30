/**
 * Language Distribution Chart Component
 * Extends BaseChart to create language-specific visualizations
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
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        const r = hue2rgb(p, q, h + 1 / 3);
        const g = hue2rgb(p, q, h);
        const b = hue2rgb(p, q, h - 1 / 3);

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

export class LanguageChart extends BaseChart {
    /**
     * Create a new LanguageChart instance
     * @param {string} containerId - The ID of the container element
     * @param {Object} options - Chart configuration options
     */
    constructor(containerId, options = {}) {
        super(containerId, {
            title: 'Most Common Official Languages',
            type: 'bar',
            colorScheme: 'default',
            limit: 5,
            chartType: 'language', // Add chart type identifier for dynamic descriptions
            sortBySpeakers: false, // New option to sort by speakers count instead of country count
            sortByPopulation: false, // New option to sort by population
            ...options
        });
        
        // Languages are always shown in descending order (most common first)
        this.options.sort = 'desc';
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
            console.error('Invalid country data received for language chart');
            return { labels: [], values: [], formatted: [] };
        }
        
        // First extract language data from countries
        const extractedData = this.extractLanguageData(data);
        
        // Apply grouping if requested
        const groupedData = this.options.groupByFamily ? 
            this.groupByLanguageFamilies(extractedData) : 
            extractedData;
        
        // Sort and format the data
        return this.sortAndFormatLanguageData(groupedData, data.length);
    }
    
    /**
     * Extract language data from country data
     * @param {Array} data - Raw country data from REST Countries API
     * @returns {Object} Extracted language data
     */
    extractLanguageData(data) {
        // Map to count languages
        let languageCounts = {};
        let languageCountries = {};
        let languagePopulation = {}; // For population data
        
        // Count based on language type and continent filter
        data.forEach(country => {
            if (!country.languages) return;
            
            // Skip if not matching continent filter
            if (this.options.continentFilter && 
                this.options.continentFilter !== 'all' && 
                country.continents && 
                !country.continents.includes(this.options.continentFilter)) {
                return;
            }
            
            // Get relevant language data based on type
            const languages = country.languages;
            const population = country.population || 0;
            
            // Process each language in the country
            for (const langCode in languages) {
                if (languages.hasOwnProperty(langCode)) {
                    const langName = languages[langCode];
                    
                    // Skip languages without names
                    if (!langName) continue;
                    
                    // Initialize if not exists
                    if (!languageCounts[langName]) {
                        languageCounts[langName] = 0;
                        languageCountries[langName] = [];
                        languagePopulation[langName] = 0;
                    }
                    
                    // Increment count and add country
                    languageCounts[langName]++;
                    languageCountries[langName].push(country.name.common);
                    
                    // For population, estimate by dividing the country's population
                    // by the number of official languages it has
                    const languageCount = Object.keys(languages).length || 1;
                    languagePopulation[langName] += Math.round(population / languageCount);
                }
            }
        });
        
        return {
            counts: languageCounts,
            countries: languageCountries,
            population: languagePopulation
        };
    }
    
    /**
     * Group languages by language family
     * @param {Object} languageData - Extracted language data
     * @returns {Object} Grouped language data
     */
    groupByLanguageFamilies(languageData) {
        // This is a simplified language family grouping
        // In a real application, we'd use a more comprehensive mapping
        const languageFamilies = {
            'Germanic': ['English', 'German', 'Dutch', 'Swedish', 'Danish', 'Norwegian', 'Icelandic'],
            'Romance': ['Spanish', 'French', 'Portuguese', 'Italian', 'Romanian', 'Catalan'],
            'Slavic': ['Russian', 'Polish', 'Ukrainian', 'Czech', 'Bulgarian', 'Serbian', 'Croatian'],
            'Sinitic': ['Chinese', 'Mandarin', 'Cantonese', 'Wu', 'Hakka'],
            'Indo-Aryan': ['Hindi', 'Bengali', 'Punjabi', 'Marathi', 'Gujarati', 'Urdu'],
            'Semitic': ['Arabic', 'Hebrew', 'Amharic', 'Tigrinya'],
            'Turkic': ['Turkish', 'Azerbaijani', 'Uzbek', 'Kazakh', 'Kyrgyz']
        };
        
        let groupedCounts = {};
        let groupedCountries = {};
        let groupedPopulation = {}; // For population grouping
        
        // Group languages by family
        for (const lang in languageData.counts) {
            let familyFound = false;
            for (const family in languageFamilies) {
                if (languageFamilies[family].some(l => 
                    lang.toLowerCase().includes(l.toLowerCase()) || 
                    l.toLowerCase().includes(lang.toLowerCase())
                )) {
                    if (!groupedCounts[family]) {
                        groupedCounts[family] = 0;
                        groupedCountries[family] = [];
                        groupedPopulation[family] = 0;
                    }
                    groupedCounts[family] += languageData.counts[lang];
                    groupedCountries[family] = [
                        ...groupedCountries[family],
                        ...languageData.countries[lang]
                    ];
                    groupedPopulation[family] += languageData.population[lang];
                    familyFound = true;
                    break;
                }
            }
            
            // If no family found, put in "Other"
            if (!familyFound) {
                if (!groupedCounts['Other']) {
                    groupedCounts['Other'] = 0;
                    groupedCountries['Other'] = [];
                    groupedPopulation['Other'] = 0;
                }
                groupedCounts['Other'] += languageData.counts[lang];
                groupedCountries['Other'] = [
                    ...groupedCountries['Other'],
                    ...languageData.countries[lang]
                ];
                groupedPopulation['Other'] += languageData.population[lang];
            }
        }
        
        return {
            counts: groupedCounts,
            countries: groupedCountries,
            population: groupedPopulation
        };
    }
    
    /**
     * Sort and format language data based on current options
     * @param {Object} languageData - Extracted/grouped language data
     * @param {number} totalCountries - Total number of countries
     * @returns {Object} Processed data ready for chart creation
     */
    sortAndFormatLanguageData(languageData, totalCountries) {
        // Convert to arrays and sort
        let languageArray = Object.entries(languageData.counts).map(([language, count]) => ({
            language,
            count,
            population: languageData.population[language] || 0,
            countries: languageData.countries[language]
        }));
        
        // Sort based on sort option
        if (this.options.sortByPopulation) {
            // Sort by estimated population
            switch (this.options.sort) {
                case 'asc':
                    languageArray.sort((a, b) => a.population - b.population);
                    break;
                case 'desc':
                default:
                    languageArray.sort((a, b) => b.population - a.population);
                    break;
            }
        } else {
            // Sort by country count (default behavior)
            switch (this.options.sort) {
                case 'asc':
                    languageArray.sort((a, b) => a.count - b.count);
                    break;
                case 'desc':
                default:
                    languageArray.sort((a, b) => b.count - a.count);
                    break;
            }
        }
        
        // Apply limit
        const limit = this.options.limit || 10;
        languageArray = languageArray.slice(0, limit);
        
        // Format for chart
        return {
            labels: languageArray.map(item => item.language),
            values: this.options.sortByPopulation ? 
                languageArray.map(item => item.population) : 
                languageArray.map(item => item.count),
            formatted: languageArray.map(item => ({
                language: item.language,
                count: item.count,
                population: item.population,
                countries: item.countries,
                uniqueCountries: [...new Set(item.countries)],
                percentage: ((item.count / totalCountries) * 100).toFixed(2),
                formattedPopulation: this.formatPopulation(item.population)
            }))
        };
    }

    /**
     * Format population number for display
     * @param {number} population - Raw population number
     * @returns {string} Formatted population string
     */
    formatPopulation(population) {
        if (population >= 1000000000) {
            return `${(population / 1000000000).toFixed(2)} billion`;
        }
        if (population >= 1000000) {
            return `${(population / 1000000).toFixed(2)} million`;
        }
        if (population >= 1000) {
            return `${(population / 1000).toFixed(2)}k`;
        }
        return population.toString();
    }

    /**
     * Create language-specific chart controls
     */
    createChartControls() {
        // Create base controls first
        super.createChartControls();
        
        if (!this.chartControls) return;
        
        // Add continent filter
        this.addContinentFilterControl();
        
        // Add language family grouping toggle
        this.addLanguageFamilyToggle();
        
        // Add population-based sorting toggle
        this.addPopulationSortingToggle();
    }
    
    /**
     * Add continent filter control
     */
    addContinentFilterControl() {
        const continentGroup = document.createElement('div');
        continentGroup.className = 'form-group me-2 mb-2';
        
        const continentLabel = document.createElement('label');
        continentLabel.className = 'me-2 fw-bold';
        continentLabel.textContent = 'Continent:';
        continentGroup.appendChild(continentLabel);
        
        const continentSelect = document.createElement('select');
        continentSelect.className = 'form-select form-select-sm continent-filter-select';
        continentSelect.setAttribute('aria-label', 'Filter by continent');
        
        // Add options for continents
        const continentOptions = [
            { value: 'all', text: 'All Continents' },
            { value: 'Africa', text: 'Africa' },
            { value: 'Americas', text: 'Americas' },
            { value: 'Asia', text: 'Asia' },
            { value: 'Europe', text: 'Europe' },
            { value: 'Oceania', text: 'Oceania' }
        ];
        
        continentOptions.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.text;
            if (option.value === (this.options.continentFilter || 'all')) {
                optionEl.selected = true;
            }
            continentSelect.appendChild(optionEl);
        });
        
        continentSelect.addEventListener('change', (e) => {
            this.filterByContinent(e.target.value);
        });
        
        continentGroup.appendChild(continentSelect);
        this.chartControls.appendChild(continentGroup);
    }
    
    /**
     * Add language family grouping toggle
     */
    addLanguageFamilyToggle() {
        const familyGroup = document.createElement('div');
        familyGroup.className = 'form-group me-2 mb-2';
        
        const familyCheck = document.createElement('div');
        familyCheck.className = 'form-check form-switch';
        
        const familyInput = document.createElement('input');
        familyInput.className = 'form-check-input';
        familyInput.type = 'checkbox';
        familyInput.id = `${this.containerId}-family-toggle`;
        familyInput.setAttribute('role', 'switch');
        familyInput.checked = this.options.groupByFamily || false;
        
        const familyLabel = document.createElement('label');
        familyLabel.className = 'form-check-label ms-2';
        familyLabel.htmlFor = `${this.containerId}-family-toggle`;
        familyLabel.textContent = 'Group by Language Family';
        
        familyInput.addEventListener('change', (e) => {
            this.toggleLanguageFamilies(e.target.checked);
        });
        
        familyCheck.appendChild(familyInput);
        familyCheck.appendChild(familyLabel);
        familyGroup.appendChild(familyCheck);
        this.chartControls.appendChild(familyGroup);
    }
    
    /**
     * Add population-based sorting toggle
     */
    addPopulationSortingToggle() {
        const populationGroup = document.createElement('div');
        populationGroup.className = 'form-group me-2 mb-2';
        
        const populationCheck = document.createElement('div');
        populationCheck.className = 'form-check form-switch';
        
        const populationInput = document.createElement('input');
        populationInput.className = 'form-check-input';
        populationInput.type = 'checkbox';
        populationInput.id = `${this.containerId}-population-toggle`;
        populationInput.setAttribute('role', 'switch');
        populationInput.checked = this.options.sortByPopulation || false;
        
        const populationLabel = document.createElement('label');
        populationLabel.className = 'form-check-label ms-2';
        populationLabel.htmlFor = `${this.containerId}-population-toggle`;
        populationLabel.textContent = 'Sort by Speakers';
        
        populationInput.addEventListener('change', (e) => {
            this.togglePopulationSorting(e.target.checked);
        });
        
        populationCheck.appendChild(populationInput);
        populationCheck.appendChild(populationLabel);
        populationGroup.appendChild(populationCheck);
        this.chartControls.appendChild(populationGroup);
    }

    /**
     * Filter languages by continent
     * @param {string} continent - Continent to filter by
     */
    async filterByContinent(continent) {
        console.log(`[${this.containerId}] Filtering by continent: ${continent}`);
        
        // Show loading overlay
        this.showLoading();
        
        try {
            // Clean up any existing chart elements
            this.cleanupExistingChart();
            
            // Store continent filter option
            this.options.continentFilter = continent;
            
            // Re-process data with continent filter
            this.processedData = await this.processData(this.rawData);
            
            // Update title based on continent filter
            this.updateChartTitleForSettings();
            
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
            const descriptions = this.generateLanguageDescriptions(this.processedData);
            this.updateChartDescriptions(descriptions);
            
            // Update the chart title in the DOM
            this.updateDOMTitle();
        } catch (error) {
            console.error(`[${this.containerId}] Error filtering by continent:`, error);
            this.showError(`Failed to filter by continent: ${error.message}`);
        }
    }

    /**
     * Toggle grouping languages by language family
     * @param {boolean} groupByFamily - Whether to group languages by family
     */
    async toggleLanguageFamilies(groupByFamily) {
        console.log(`[${this.containerId}] Toggling language family grouping: ${groupByFamily}`);
        
        // Show loading overlay
        this.showLoading();
        
        try {
            // Clean up any existing chart elements
            this.cleanupExistingChart();
            
            // Store language family grouping option
            this.options.groupByFamily = groupByFamily;
            
            // Update title based on grouping option and current continent filter
            this.updateChartTitleForSettings();
            
            // Re-process data with language family grouping
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
            const descriptions = this.generateLanguageDescriptions(this.processedData);
            this.updateChartDescriptions(descriptions);
            
            // Update the chart title in the DOM
            this.updateDOMTitle();
        } catch (error) {
            console.error(`[${this.containerId}] Error toggling language families:`, error);
            this.showError(`Failed to toggle language family grouping: ${error.message}`);
        }
    }

    /**
     * Toggle sorting by estimated speaker population
     * @param {boolean} sortByPopulation - Whether to sort by population
     */
    async togglePopulationSorting(sortByPopulation) {
        console.log(`[${this.containerId}] Toggling population sorting: ${sortByPopulation}`);
        
        // Show loading overlay
        this.showLoading();
        
        try {
            // Clean up any existing chart elements
            this.cleanupExistingChart();
            
            // Store population sorting option
            this.options.sortByPopulation = sortByPopulation;
            
            // Update title based on current settings
            this.updateChartTitleForSettings();
            
            // Re-process data with population sorting option
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
            const descriptions = this.generateLanguageDescriptions(this.processedData);
            this.updateChartDescriptions(descriptions);
            
            // Update the chart title in the DOM
            this.updateDOMTitle();
        } catch (error) {
            console.error(`[${this.containerId}] Error toggling population sorting:`, error);
            this.showError(`Failed to toggle population sorting: ${error.message}`);
        }
    }
    
    /**
     * Update chart title based on current settings
     */
    updateChartTitleForSettings() {
        const continent = this.options.continentFilter || 'all';
        const groupByFamily = this.options.groupByFamily || false;
        const sortByPopulation = this.options.sortByPopulation || false;
        const typeText = sortByPopulation ? 'Languages by Speakers' : 'Official Languages';
        
        if (continent !== 'all') {
            this.options.title = groupByFamily ? 
                `${sortByPopulation ? 'Most Spoken' : ''} Language Families in ${continent}` : 
                `${sortByPopulation ? 'Most Spoken' : 'Most Common'} ${typeText} in ${continent}`;
        } else {
            this.options.title = groupByFamily ? 
                `${sortByPopulation ? 'Most Spoken' : ''} World's Major Language Families` : 
                `${sortByPopulation ? 'Most Spoken' : 'Most Common'} ${typeText}`;
        }
    }
    
    /**
     * Update the chart title in the DOM
     */
    updateDOMTitle() {
        const titleElement = this.container.querySelector('.chart-title');
        if (titleElement) {
            titleElement.textContent = this.options.title;
        }
    }

    /**
     * Create chart configuration for language data
     * @param {Object} data - Processed language data
     * @returns {Object} Chart configuration for QuickChart API
     */
    createChartConfig(data) {
        // Generate vibrant colors for languages
        const colors = this.generateLanguageColors(data.labels);
        
        const chartConfig = {
            type: this.options.type || 'horizontalBar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: this.options.title || "Languages",
                    data: data.values,
                    backgroundColor: colors,
                    borderColor: hexToRgba(COLORS.primary, 1),
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y', // Make bars horizontal for better readability of language names
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: this.options.title || 'Most Common Languages',
                        font: {
                            size: 24,
                            family: 'Roboto, sans-serif',
                            weight: 600
                        },
                        color: COLORS.textPrimary,
                        padding: {bottom: 24}
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const item = data.formatted[context.dataIndex];
                                if (!item) return 'No data';
                                
                                const uniqueCountryCount = item.uniqueCountries.length;
                                
                                if (this.options.sortByPopulation) {
                                    return [
                                        `Language: ${item.language}`,
                                        `Estimated Speakers: ${item.formattedPopulation}`,
                                        `Countries: ${uniqueCountryCount}`,
                                        `Usage instances: ${item.count}`
                                    ];
                                } else {
                                    return [
                                        `Language: ${item.language}`,
                                        `Countries: ${uniqueCountryCount}`,
                                        `Usage instances: ${item.count}`,
                                        `Percentage: ${item.percentage}%`
                                    ];
                                }
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: this.options.sortByPopulation ? 'Estimated Number of Speakers' : 'Number of Countries',
                            font: {
                                size: 14,
                                family: 'Roboto, sans-serif',
                                weight: 'bold'
                            },
                            color: COLORS.textSecondary
                        },
                        ticks: {
                            color: COLORS.textSecondary,
                            font: {
                                size: 14,
                                family: 'Roboto, sans-serif',
                                weight: 'bold'
                            },
                            callback: (value) => {
                                if (this.options.sortByPopulation && value >= 1000000) {
                                    return `${(value / 1000000).toFixed(1)}M`;
                                }
                                return value;
                            }
                        },
                        grid: { color: "#eee" }
                    },
                    y: {
                        ticks: {
                            color: COLORS.textSecondary,
                            font: { size: 14, family: 'Roboto, sans-serif', weight: 'bold' }
                        },
                        grid: { display: false }
                    }
                }
            }
        };
        
        // If we're showing language families, add a pattern fill for easier differentiation
        if (this.options.groupByFamily) {
            chartConfig.options.plugins.tooltip.callbacks.afterLabel = (context) => {
                const item = data.formatted[context.dataIndex];
                if (!item) return null;
                
                // Return some example languages in this family
                if (item.language !== 'Other') {
                    return `Examples: ${item.uniqueCountries.slice(0, 3).join(', ')}`;
                }
                return null;
            };
        }
        
        return chartConfig;
    }

    /**
     * Generate colors that make sense for different languages
     * @param {Array} languages - List of language names
     * @returns {Array} Array of color values
     */
    generateLanguageColors(languages) {
        // Generate colors using the utility function
        return languages.map((_, index) => {
            const variant = generateHueVariants(COLORS.primary, languages.length)[index];
            return hexToRgba(variant, 0.75);
        });
    }

    /**
     * Generate language-specific chart descriptions that accurately reflect current chart state
     * @param {Object} data - Processed chart data
     * @returns {Object} Language-specific descriptions
     */
    generateLanguageDescriptions(data) {
        // Get current chart settings for context
        const settings = this.getChartSettings();
        
        // Get core insights about the data
        const insights = this.generateLanguageInsights(data, settings);
        
        // Generate appropriate title based on current settings
        const title = this.generateLanguageTitle(settings);
        
        // Create short description for hover state
        const shortDesc = this.createShortDescription(settings);
        
        // Create detailed description for expanded view
        const detailedDesc = this.createDetailedDescription(data, settings, insights);
        
        // Generate analysis text based on current state and data
        const analysisText = this.createAnalysisText(data, settings);
        
        return {
            title: title,
            short: shortDesc,
            detailed: detailedDesc,
            full: detailedDesc, // For compatibility with BaseChart
            analysis: analysisText,
            insights: insights.filter(insight => insight)
        };
    }

    /**
     * Get current chart settings for description generation
     * @returns {Object} Settings object with current chart state
     */
    getChartSettings() {
        return {
            continentFilter: this.options.continentFilter || 'all',
            groupByFamily: this.options.groupByFamily || false,
            sortByPopulation: this.options.sortByPopulation || false,
            sortOrder: this.options.sort || 'desc',
            chartType: this.options.type || 'horizontalBar'
        };
    }

    /**
     * Generate insights about language data based on current settings
     * @param {Object} data - Processed chart data
     * @param {Object} settings - Current chart settings
     * @returns {Array} Array of insight strings
     */
    generateLanguageInsights(data, settings) {
        const { continentFilter, groupByFamily, sortByPopulation } = settings;
        const insights = [];
        const entityType = groupByFamily ? 'family' : 'language';
        const contextDesc = continentFilter !== 'all' ? `in ${continentFilter}` : 'globally';
        
        // Get top language info if available
        if (data.formatted && data.formatted.length > 0) {
            const topLang = data.formatted[0];
            
            // Top language insight based on sort type
            if (sortByPopulation) {
                insights.push(`${topLang.language} is ${groupByFamily ? 'the most spoken language family' : 'the most spoken language'} ${contextDesc}, with an estimated ${topLang.formattedPopulation} speakers across ${topLang.count} ${topLang.count === 1 ? 'country' : 'countries'}.`);
            } else {
                insights.push(`${topLang.language} is ${groupByFamily ? 'the most common language family' : 'the most widely used language'} ${contextDesc}, used in ${topLang.count} ${topLang.count === 1 ? 'country' : 'countries'}.`);
            }
            
            // Second language insight if available
            if (data.formatted.length > 1) {
                const secondLang = data.formatted[1];
                if (sortByPopulation) {
                    insights.push(`${secondLang.language} is the second most spoken ${entityType} with approximately ${secondLang.formattedPopulation} speakers across ${secondLang.count} countries.`);
                } else {
                    insights.push(`${secondLang.language} is the second most common ${entityType}, used in ${secondLang.count} countries.`);
                }
            }
        }
        
        // Add appropriate insights based on grouping and sorting
        if (groupByFamily) {
            insights.push(`Grouping by language family reveals broader linguistic patterns and relationships that cross national boundaries.`);
        }
        
        if (sortByPopulation) {
            insights.push(`Sorting by estimated speakers provides a different perspective than sorting by number of countries, highlighting languages with large populations in fewer nations.`);
        } else {
            insights.push(`Individual language distribution reflects historical colonization, migration patterns, and cultural influence.`);
        }
        
        // Continent-specific insight
        if (continentFilter !== 'all') {
            insights.push(`${continentFilter} shows distinct linguistic patterns compared to other continents.`);
        } else if (!sortByPopulation) {
            insights.push(`Language distribution globally reflects historical colonization, migration, and cultural exchange.`);
        }
        
        return insights;
    }

    /**
     * Generate appropriate title based on current settings
     * @param {Object} settings - Current chart settings
     * @returns {string} Chart title
     */
    generateLanguageTitle(settings) {
        const { continentFilter, groupByFamily, sortByPopulation } = settings;
        
        if (continentFilter !== 'all') {
            if (groupByFamily) {
                return sortByPopulation ? 
                    `Most Spoken Language Families in ${continentFilter}` : 
                    `Language Families in ${continentFilter}`;
            } else {
                return sortByPopulation ? 
                    `Most Spoken Languages in ${continentFilter}` : 
                    `Most Common Languages in ${continentFilter}`;
            }
        } else {
            if (groupByFamily) {
                return sortByPopulation ? 
                    `Most Spoken Language Families Globally` : 
                    `World's Major Language Families`;
            } else {
                return sortByPopulation ? 
                    `Most Spoken Languages Globally` : 
                    `Most Common Official Languages`;
            }
        }
    }

    /**
     * Create short description for hover state
     * @param {Object} settings - Current chart settings
     * @returns {string} Short description
     */
    createShortDescription(settings) {
        const { continentFilter, groupByFamily, sortByPopulation, chartType } = settings;
        const chartTypeDesc = this.getChartTypeDescription();
        const groupingDesc = groupByFamily ? 'language families' : 'individual languages';
        const contextDesc = continentFilter !== 'all' ? `in ${continentFilter}` : 'globally';
        
        return `This ${chartTypeDesc} shows the ${sortByPopulation ? 'most spoken' : 'distribution of'} ${groupingDesc} ${contextDesc}.`;
    }

    /**
     * Create detailed description for expanded view
     * @param {Object} data - Processed chart data
     * @param {Object} settings - Current chart settings
     * @param {Array} insights - Generated insights
     * @returns {string} Detailed description
     */
    createDetailedDescription(data, settings, insights) {
        const { continentFilter, groupByFamily, sortByPopulation } = settings;
        const groupingDesc = groupByFamily ? 'language families' : 'individual languages';
        const contextDesc = continentFilter !== 'all' ? `in ${continentFilter}` : 'globally';
        
        let description = `This chart displays the ${sortByPopulation ? 'most spoken' : 'most common'} ${groupingDesc} ${contextDesc}.`;
        
        // Add top language info if available
        if (data.formatted && data.formatted.length > 0) {
            const topLang = data.formatted[0];
            if (sortByPopulation) {
                description += ` ${topLang.language} has the largest number of speakers with an estimated ${topLang.formattedPopulation}.`;
            } else {
                description += ` ${topLang.language} is used in ${topLang.count} ${topLang.count === 1 ? 'country' : 'countries'}.`;
            }
        }
        
        // Add grouping and sorting context
        if (groupByFamily) {
            description += ` Languages are grouped by major linguistic families rather than individual languages.`;
        }
        
        if (sortByPopulation) {
            description += ` The chart sorts languages by estimated number of speakers rather than country count.`;
        }
        
        return description;
    }

    /**
     * Create analysis text for chart descriptions
     * @param {Object} data - Processed chart data
     * @param {Object} settings - Current chart settings
     * @returns {string} Analysis text
     */
    createAnalysisText(data, settings) {
        const { continentFilter, groupByFamily, sortByPopulation } = settings;
        const contextDesc = continentFilter !== 'all' ? `in ${continentFilter}` : 'globally';
        
        if (data.formatted && data.formatted.length > 0) {
            const topLang = data.formatted[0];
            
            if (sortByPopulation) {
                return `Language distribution analysis shows that ${topLang.language} is ${groupByFamily ? 'the most spoken language family' : 'the most spoken language'} ${contextDesc} with approximately ${topLang.formattedPopulation} speakers.`;
            } else {
                return `Language distribution analysis shows that ${topLang.language} is ${groupByFamily ? 'the most common language family' : 'the most widely used language'} ${contextDesc}, found in ${topLang.count} ${topLang.count === 1 ? 'country' : 'countries'}.`;
            }
        }
        
        return `Language distribution analysis shows the ${sortByPopulation ? 'most spoken' : 'most common'} ${groupByFamily ? 'language families' : 'languages'} ${contextDesc}.`;
    }

    /**
     * Override the base class generateDescriptions to ensure we use our specific implementation
     * @param {Object} data - Processed chart data
     * @returns {Object} Chart descriptions
     */
    generateDescriptions(data) {
        return this.generateLanguageDescriptions(data);
    }

    /**
     * Get a descriptive string for the current chart type
     * @returns {string} Description of the chart type
     */
    getChartTypeDescription() {
        switch (this.options.type) {
            case 'bar':
                return 'bar chart';
            case 'horizontalBar':
                return 'horizontal bar chart';
            case 'pie':
                return 'pie chart';
            case 'doughnut':
                return 'doughnut chart';
            case 'line':
                return 'line chart';
            default:
                return 'chart';
        }
    }
}