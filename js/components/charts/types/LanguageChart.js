/**
 * Language Distribution Chart Component
 * Extends BaseChart to create language-specific visualizations
 */

import { BaseChart } from '../BaseChart.js';
import * as dataProcessing from '../../../utils/dataProcessing.js';
import { chartService } from '../../../services/chartService.js';
import * as chartUtils from '../../../utils/chartUtils.js';

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
        
        // Map to count languages - using let instead of const to allow reassignment
        let languageCounts = {};
        let languageCountries = {};
        let languagePopulation = {}; // New map for population data
        
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
            
            // We'll need to understand the structure better to implement native vs official
            // For now, we'll just use all languages
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
                    
                    // For population, we'll estimate by dividing the country's population
                    // by the number of official languages it has
                    // This is a simplification but gives us an estimation based on API data only
                    const languageCount = Object.keys(languages).length || 1;
                    languagePopulation[langName] += Math.round(population / languageCount);
                }
            }
        });
        
        // Group by language family if requested
        if (this.options.groupByFamily) {
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
            let groupedPopulation = {}; // Add population grouping
            
            // Group languages by family
            for (const lang in languageCounts) {
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
                        groupedCounts[family] += languageCounts[lang];
                        groupedCountries[family] = [
                            ...groupedCountries[family],
                            ...languageCountries[lang]
                        ];
                        groupedPopulation[family] += languagePopulation[lang];
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
                    groupedCounts['Other'] += languageCounts[lang];
                    groupedCountries['Other'] = [
                        ...groupedCountries['Other'],
                        ...languageCountries[lang]
                    ];
                    groupedPopulation['Other'] += languagePopulation[lang];
                }
            }
            
            // Use grouped data
            languageCounts = groupedCounts;
            languageCountries = groupedCountries;
            languagePopulation = groupedPopulation;
        }
        
        // Convert to arrays and sort
        let languageData = Object.entries(languageCounts).map(([language, count]) => ({
            language,
            count,
            population: languagePopulation[language] || 0,
            countries: languageCountries[language]
        }));
        
        // Sort based on sort option
        if (this.options.sortByPopulation) {
            // Sort by estimated population
            switch (this.options.sort) {
                case 'asc':
                    languageData.sort((a, b) => a.population - b.population);
                    break;
                case 'desc':
                default:
                    languageData.sort((a, b) => b.population - a.population);
                    break;
            }
        } else {
            // Sort by country count (default behavior)
            switch (this.options.sort) {
                case 'asc':
                    languageData.sort((a, b) => a.count - b.count);
                    break;
                case 'desc':
                default:
                    languageData.sort((a, b) => b.count - a.count);
                    break;
            }
        }
        
        // Apply limit
        const limit = this.options.limit || 10;
        languageData = languageData.slice(0, limit);
        
        // Format for chart
        return {
            labels: languageData.map(item => item.language),
            values: this.options.sortByPopulation ? 
                languageData.map(item => item.population) : 
                languageData.map(item => item.count),
            formatted: languageData.map(item => ({
                language: item.language,
                count: item.count,
                population: item.population,
                countries: item.countries,
                uniqueCountries: [...new Set(item.countries)],
                percentage: ((item.count / data.length) * 100).toFixed(2),
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
        
        // 1. Add continent filter (to show languages by continent)
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
        
        // 2. Add language family grouping toggle
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
        
        // 3. Add population-based sorting toggle
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
            // Store continent filter option
            this.options.continentFilter = continent;
            
            // Re-process data with continent filter
            this.processedData = await this.processData(this.rawData);
            
            // Update title based on continent filter
            let typeText = this.options.languageType === 'official' ? 'Official Languages' : 
                          (this.options.languageType === 'native' ? 'Native Languages' : 'Languages');
            
            if (continent !== 'all') {
                this.options.title = this.options.groupByFamily ? 
                    `Language Families in ${continent}` : 
                    `Most Common ${typeText} in ${continent}`;
            } else {
                this.options.title = this.options.groupByFamily ? 
                    `World's Major Language Families` : 
                    `Most Common ${typeText}`;
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
            const descriptions = this.generateLanguageDescriptions(this.processedData);
            this.updateChartDescriptions(descriptions);
            
            // Update the chart title in the DOM
            const titleElement = this.container.querySelector('.chart-title');
            if (titleElement) {
                titleElement.textContent = this.options.title;
            }
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
            // Store language family grouping option
            this.options.groupByFamily = groupByFamily;
            
            // Update title based on grouping option and current continent filter
            const continent = this.options.continentFilter || 'all';
            if (continent !== 'all') {
                this.options.title = groupByFamily ? 
                    `Language Families in ${continent}` : 
                    `Most Common Languages in ${continent}`;
            } else {
                this.options.title = groupByFamily ? 
                    `World's Major Language Families` : 
                    `Most Common Official Languages`;
            }
            
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
            const titleElement = this.container.querySelector('.chart-title');
            if (titleElement) {
                titleElement.textContent = this.options.title;
            }
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
            // Store population sorting option
            this.options.sortByPopulation = sortByPopulation;
            
            // Update title based on grouping option and current continent filter
            const continent = this.options.continentFilter || 'all';
            const groupByFamily = this.options.groupByFamily || false;
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
            const titleElement = this.container.querySelector('.chart-title');
            if (titleElement) {
                titleElement.textContent = this.options.title;
            }
        } catch (error) {
            console.error(`[${this.containerId}] Error toggling population sorting:`, error);
            this.showError(`Failed to toggle population sorting: ${error.message}`);
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
                    borderColor: "#333",
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
                            size: 22,
                            weight: 'bold',
                            family: 'Arial'
                        },
                        color: '#222'
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
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            color: "#444",
                            font: { size: 12, weight: "bold" },
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
                            color: "#444",
                            font: { size: 13, weight: "bold" }
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
        // Predefined colors for common language families
        const languageColorMap = {
            // Romance languages
            'Spanish': '#e74c3c',
            'French': '#3498db',
            'Portuguese': '#2ecc71',
            'Italian': '#f1c40f',
            'Romanian': '#9b59b6',
            
            // Germanic languages
            'English': '#3498db',
            'German': '#e67e22',
            'Dutch': '#f39c12',
            'Swedish': '#2980b9',
            'Norwegian': '#27ae60',
            
            // Asian languages
            'Chinese': '#c0392b',
            'Japanese': '#d35400',
            'Korean': '#8e44ad',
            'Hindi': '#16a085',
            'Arabic': '#7f8c8d',
            
            // Language families
            'Germanic': '#3498db',
            'Romance': '#e74c3c',
            'Slavic': '#f39c12',
            'Sinitic': '#c0392b',
            'Indo-Aryan': '#16a085',
            'Semitic': '#7f8c8d',
            'Turkic': '#d35400',
            'Other': '#95a5a6'
        };
        
        return languages.map(lang => {
            // Check for direct matches in our color map
            if (languageColorMap[lang]) {
                return languageColorMap[lang];
            }
            
            // Check for partial matches
            for (const mappedLang in languageColorMap) {
                if (lang.includes(mappedLang) || mappedLang.includes(lang)) {
                    return languageColorMap[mappedLang];
                }
            }
            
            // Generate a color based on the first character of the language name
            const hue = (lang.charCodeAt(0) * 7) % 360;
            return `hsl(${hue}, 70%, 60%)`;
        });
    }

    /**
     * Generate language-specific chart descriptions that accurately reflect current chart state
     * @param {Object} data - Processed chart data
     * @returns {Object} Language-specific descriptions
     */
    generateLanguageDescriptions(data) {
        const continentFilter = this.options.continentFilter || 'all';
        const groupByFamily = this.options.groupByFamily || false;
        const sortByPopulation = this.options.sortByPopulation || false;
        const totalItems = data.labels ? data.labels.length : 0;
        const sortOrder = this.options.sort || 'desc';
        
        // Most common language
        const topLanguage = data.formatted && data.formatted.length > 0 ? data.formatted[0].language : '';
        const topCount = data.formatted && data.formatted.length > 0 ? data.formatted[0].count : 0;
        const topPopulation = data.formatted && data.formatted.length > 0 ? data.formatted[0].population : 0;
        const topPopulationFormatted = data.formatted && data.formatted.length > 0 ? data.formatted[0].formattedPopulation : '';
        
        // Generate appropriate title
        let title;
        if (continentFilter !== 'all') {
            if (groupByFamily) {
                title = sortByPopulation ? 
                    `Most Spoken Language Families in ${continentFilter}` : 
                    `Language Families in ${continentFilter}`;
            } else {
                title = sortByPopulation ? 
                    `Most Spoken Languages in ${continentFilter}` : 
                    `Most Common Languages in ${continentFilter}`;
            }
        } else {
            if (groupByFamily) {
                title = sortByPopulation ? 
                    `Most Spoken Language Families Globally` : 
                    `World's Major Language Families`;
            } else {
                title = sortByPopulation ? 
                    `Most Spoken Languages Globally` : 
                    `Most Common Official Languages`;
            }
        }
        
        // Context description for filtering
        const contextDesc = continentFilter !== 'all' ? `in ${continentFilter}` : 'globally';
        
        // Generate description based on grouping
        const groupingDesc = groupByFamily ? 'language families' : 'individual languages';
        const entityType = groupByFamily ? 'family' : 'language';
        
        // Chart type description
        const chartTypeDesc = this.getChartTypeDescription();

        // Create detailed insights based on current state
        let insights = [];
        
        // Top language insight based on sort type
        if (topLanguage) {
            if (sortByPopulation) {
                insights.push(`${topLanguage} is ${groupByFamily ? 'the most spoken language family' : 'the most spoken language'} ${contextDesc}, with an estimated ${topPopulationFormatted} speakers across ${topCount} ${topCount === 1 ? 'country' : 'countries'}.`);
            } else {
                insights.push(`${topLanguage} is ${groupByFamily ? 'the most common language family' : 'the most widely used language'} ${contextDesc}, used in ${topCount} ${topCount === 1 ? 'country' : 'countries'}.`);
            }
        }
        
        // Second language insight if available
        if (data.formatted && data.formatted.length > 1) {
            const secondLang = data.formatted[1];
            if (sortByPopulation) {
                insights.push(`${secondLang.language} is the second most spoken ${entityType} with approximately ${secondLang.formattedPopulation} speakers across ${secondLang.count} countries.`);
            } else {
                insights.push(`${secondLang.language} is the second most common ${entityType}, used in ${secondLang.count} countries.`);
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
        
        // Create detailed description
        let detailedDesc = `This chart displays the ${sortByPopulation ? 'most spoken' : 'most common'} ${groupingDesc} ${contextDesc}.`;
        
        if (topLanguage) {
            if (sortByPopulation) {
                detailedDesc += ` ${topLanguage} has the largest number of speakers with an estimated ${topPopulationFormatted}.`;
            } else {
                detailedDesc += ` ${topLanguage} is used in ${topCount} ${topCount === 1 ? 'country' : 'countries'}.`;
            }
        }
        
        // Add grouping and sorting context
        if (groupByFamily) {
            detailedDesc += ` Languages are grouped by major linguistic families rather than individual languages.`;
        }
        
        if (sortByPopulation) {
            detailedDesc += ` The chart sorts languages by estimated number of speakers rather than country count.`;
        }
        
        // Analysis text based on sorting and grouping options
        let analysisText;
        if (sortByPopulation) {
            analysisText = `Language distribution analysis shows that ${topLanguage} is ${groupByFamily ? 'the most spoken language family' : 'the most spoken language'} ${contextDesc} with approximately ${topPopulationFormatted} speakers.`;
        } else {
            analysisText = `Language distribution analysis shows that ${topLanguage} is ${groupByFamily ? 'the most common language family' : 'the most widely used language'} ${contextDesc}, found in ${topCount} ${topCount === 1 ? 'country' : 'countries'}.`;
        }
        
        return {
            title: title,
            short: `This ${chartTypeDesc} shows the ${sortByPopulation ? 'most spoken' : 'distribution of'} ${groupingDesc} ${contextDesc}.`,
            detailed: detailedDesc,
            analysis: analysisText,
            insights: insights.filter(insight => insight)
        };
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