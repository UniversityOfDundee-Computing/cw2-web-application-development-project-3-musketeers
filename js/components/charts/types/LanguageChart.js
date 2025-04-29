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
        
        // Map to count languages
        const languageCounts = {};
        const languageCountries = {};
        
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
                    }
                    
                    // Increment count and add country
                    languageCounts[langName]++;
                    languageCountries[langName].push(country.name.common);
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
            
            const groupedCounts = {};
            const groupedCountries = {};
            
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
                        }
                        groupedCounts[family] += languageCounts[lang];
                        groupedCountries[family] = [
                            ...groupedCountries[family],
                            ...languageCountries[lang]
                        ];
                        familyFound = true;
                        break;
                    }
                }
                
                // If no family found, put in "Other"
                if (!familyFound) {
                    if (!groupedCounts['Other']) {
                        groupedCounts['Other'] = 0;
                        groupedCountries['Other'] = [];
                    }
                    groupedCounts['Other'] += languageCounts[lang];
                    groupedCountries['Other'] = [
                        ...groupedCountries['Other'],
                        ...languageCountries[lang]
                    ];
                }
            }
            
            // Use grouped data
            languageCounts = groupedCounts;
            languageCountries = groupedCountries;
        }
        
        // Convert to arrays and sort
        let languageData = Object.entries(languageCounts).map(([language, count]) => ({
            language,
            count,
            countries: languageCountries[language]
        }));
        
        // Sort based on sort order
        switch (this.options.sort) {
            case 'asc':
                languageData.sort((a, b) => a.count - b.count);
                break;
            case 'desc':
            default:
                languageData.sort((a, b) => b.count - a.count);
                break;
        }
        
        // Apply limit
        const limit = this.options.limit || 10;
        languageData = languageData.slice(0, limit);
        
        // Format for chart
        return {
            labels: languageData.map(item => item.language),
            values: languageData.map(item => item.count),
            formatted: languageData.map(item => ({
                language: item.language,
                count: item.count,
                countries: item.countries,
                uniqueCountries: [...new Set(item.countries)],
                percentage: ((item.count / data.length) * 100).toFixed(2)
            }))
        };
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
            
            // Update title based on continent filter
            let typeText = this.options.languageType === 'official' ? 'Official Languages' : 
                          (this.options.languageType === 'native' ? 'Native Languages' : 'Languages');
            
            if (continent !== 'all') {
                this.options.title = `Most Common ${typeText} in ${continent}`;
            } else {
                this.options.title = `Most Common ${typeText}`;
            }
            
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
                this.options.title || 'Chart'
            );
            
            // Update descriptions
            const descriptions = this.generateDescriptions(this.processedData);
            
            // Add language family context to description
            if (groupByFamily && descriptions.short) {
                descriptions.short += ' Languages are grouped by major language families.';
            }
            
            this.updateChartDescriptions(descriptions);
        } catch (error) {
            console.error(`[${this.containerId}] Error toggling language families:`, error);
            this.showError(`Failed to toggle language family grouping: ${error.message}`);
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
                                
                                return [
                                    `Language: ${item.language}`,
                                    `Countries: ${uniqueCountryCount}`,
                                    `Usage instances: ${item.count}`,
                                    `Percentage: ${item.percentage}%`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Countries',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            color: "#444",
                            font: { size: 12, weight: "bold" }
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
}