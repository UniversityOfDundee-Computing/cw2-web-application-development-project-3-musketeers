/**
 * Currency Usage Chart Component
 * Extends BaseChart to create currency-specific visualizations using radar chart
 */

import { BaseChart } from '../BaseChart.js';
import * as dataProcessing from '../../../utils/dataProcessing.js';
import { chartService } from '../../../services/chartService.js';
import * as chartUtils from '../../../utils/chartUtils.js';

export class CurrencyChart extends BaseChart {
    /**
     * Create a new CurrencyChart instance
     * @param {string} containerId - The ID of the container element
     * @param {Object} options - Chart configuration options
     */
    constructor(containerId, options = {}) {
        super(containerId, {
            title: 'Top 5 Most Used Currencies',
            type: 'radar',
            colorScheme: 'blue',
            limit: 5,
            chartType: 'currency', // Add chart type identifier for dynamic descriptions
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
            console.error('Invalid country data received for currency chart');
            return { labels: [], values: [], formatted: [] };
        }
        
        // Maps to track currency usage
        const currencyCounts = {};
        const currencySymbolMap = {};
        const currencyCountries = {};
        
        // Process data to count currency usage
        data.forEach(country => {
            if (!country.currencies) return;
            
            // Skip if not matching region filter
            if (this.options.regionFilter && 
                this.options.regionFilter !== 'all' && 
                country.region !== this.options.regionFilter) {
                return;
            }
            
            // Process currencies
            for (const currCode in country.currencies) {
                if (country.currencies.hasOwnProperty(currCode)) {
                    const currency = country.currencies[currCode];
                    const currName = currency.name || currCode;
                    
                    // Skip currencies without names
                    if (!currName) continue;
                    
                    // Initialize if not exists
                    if (!currencyCounts[currName]) {
                        currencyCounts[currName] = 0;
                        currencyCountries[currName] = [];
                        
                        // Store symbol for this currency if available
                        if (currency.symbol) {
                            currencySymbolMap[currName] = currency.symbol;
                        }
                    }
                    
                    // Increment count and add country
                    currencyCounts[currName]++;
                    currencyCountries[currName].push(country.name.common);
                }
            }
        });
        
        // Apply currency view filter
        let currencyData = [];
        
        if (this.options.currView === 'shared') {
            // Only show currencies used by multiple countries
            currencyData = Object.entries(currencyCounts)
                .filter(([_, count]) => count > 1)
                .map(([currency, count]) => ({
                    currency,
                    count,
                    countries: currencyCountries[currency],
                    symbol: currencySymbolMap[currency] || this.getCurrencySymbol(currency)
                }));
        } else if (this.options.currView === 'exclusive') {
            // Only show currencies used by a single country
            currencyData = Object.entries(currencyCounts)
                .filter(([_, count]) => count === 1)
                .map(([currency, count]) => ({
                    currency,
                    count,
                    countries: currencyCountries[currency],
                    symbol: currencySymbolMap[currency] || this.getCurrencySymbol(currency)
                }));
        } else {
            // Show all currencies
            currencyData = Object.entries(currencyCounts)
                .map(([currency, count]) => ({
                    currency,
                    count,
                    countries: currencyCountries[currency],
                    symbol: currencySymbolMap[currency] || this.getCurrencySymbol(currency)
                }));
        }
        
        // Sort based on sort order
        switch (this.options.sort) {
            case 'asc':
                currencyData.sort((a, b) => a.count - b.count);
                break;
            case 'desc':
            default:
                currencyData.sort((a, b) => b.count - a.count);
                break;
        }
        
        // Apply limit
        const limit = this.options.limit || 10;
        currencyData = currencyData.slice(0, limit);
        
        // Format for chart
        return {
            labels: currencyData.map(item => {
                if (this.options.showSymbols && item.symbol) {
                    return `${item.currency} (${item.symbol})`;
                }
                return item.currency;
            }),
            values: currencyData.map(item => item.count),
            formatted: currencyData.map(item => ({
                currency: item.currency,
                count: item.count,
                countries: item.countries,
                symbol: item.symbol,
                percentage: ((item.count / data.length) * 100).toFixed(2)
            }))
        };
    }

    /**
     * Create chart configuration for currency data
     * @param {Object} data - Processed currency data
     * @returns {Object} Chart configuration for QuickChart API
     */
    createChartConfig(data) {
        // Get color scheme appropriate for currencies
        const colors = [
            '#85bb65', // Dollar green
            '#0072b2', // Euro blue
            '#ffd700', // Gold
            '#d55e00', // Copper/bronze
            '#cc79a7', // Pink
            '#009e73', // Green
            '#f0e442', // Yellow
            '#0072b2', // Blue
            '#d55e00', // Orange
            '#cc79a7'  // Pink
        ];
        
        const chartConfig = {
            type: this.options.type || 'doughnut',
            data: {
                labels: data.labels,
                datasets: [{
                    label: "Countries",
                    data: data.values,
                    backgroundColor: colors,
                    borderColor: "#333",
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: this.options.title || 'Currency Distribution',
                        font: {
                            size: 22,
                            weight: 'bold',
                            family: 'Arial'
                        },
                        color: '#222'
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: "#444",
                            font: { size: 12, weight: "bold" },
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const item = data.formatted[context.dataIndex];
                                if (!item) return 'No data';
                                
                                let symbolText = '';
                                if (item.symbol) {
                                    symbolText = ` (${item.symbol})`;
                                }
                                
                                return [
                                    `Currency: ${item.currency}${symbolText}`,
                                    `Countries: ${item.count}`,
                                    `Percentage: ${item.percentage}%`,
                                    `Examples: ${item.countries.slice(0, 3).join(', ')}${item.countries.length > 3 ? '...' : ''}`
                                ];
                            }
                        }
                    }
                }
            }
        };
        
        // For bar charts, format differently
        if (this.options.type === 'bar') {
            chartConfig.options.indexAxis = 'y'; // Make bars horizontal for better readability
            chartConfig.options.scales = {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Countries',
                        font: { size: 12, weight: 'bold' }
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
                        font: { size: 12, weight: "bold" }
                    },
                    grid: { display: false }
                }
            };
            
            // Don't need legend for bar chart
            chartConfig.options.plugins.legend.display = false;
        }
        
        return chartConfig;
    }

    /**
     * Create currency-specific chart controls
     */
    createChartControls() {
        // Create base controls first
        super.createChartControls();
        
        if (!this.chartControls) return;
        
        // Add a currency type selector
        const typeGroup = document.createElement('div');
        typeGroup.className = 'form-group me-2 mb-2';
        
        const typeLabel = document.createElement('label');
        typeLabel.className = 'me-2 fw-bold';
        typeLabel.textContent = 'View:';
        typeGroup.appendChild(typeLabel);
        
        const typeSelect = document.createElement('select');
        typeSelect.className = 'form-select form-select-sm currency-type-select';
        typeSelect.setAttribute('aria-label', 'Select currency view');
        
        const typeOptions = [
            { value: 'count', text: 'Usage Count' },
            { value: 'shared', text: 'Shared Currencies' },
            { value: 'exclusive', text: 'Exclusive Currencies' }
        ];
        
        typeOptions.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.text;
            if (option.value === (this.options.currView || 'count')) {
                optionEl.selected = true;
            }
            typeSelect.appendChild(optionEl);
        });
        
        typeSelect.addEventListener('change', (e) => {
            this.changeCurrencyView(e.target.value);
        });
        
        typeGroup.appendChild(typeSelect);
        this.chartControls.appendChild(typeGroup);
        
        // Add a region filter
        const regionGroup = document.createElement('div');
        regionGroup.className = 'form-group me-2 mb-2';
        
        const regionLabel = document.createElement('label');
        regionLabel.className = 'me-2 fw-bold';
        regionLabel.textContent = 'Region:';
        regionGroup.appendChild(regionLabel);
        
        const regionSelect = document.createElement('select');
        regionSelect.className = 'form-select form-select-sm region-filter-select';
        regionSelect.setAttribute('aria-label', 'Filter by region');
        
        // Add options dynamically from available regions
        const regionOptions = [
            { value: 'all', text: 'All Regions' },
            { value: 'Europe', text: 'Europe' },
            { value: 'Asia', text: 'Asia' },
            { value: 'Africa', text: 'Africa' },
            { value: 'Americas', text: 'Americas' },
            { value: 'Oceania', text: 'Oceania' }
        ];
        
        regionOptions.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.text;
            if (option.value === (this.options.regionFilter || 'all')) {
                optionEl.selected = true;
            }
            regionSelect.appendChild(optionEl);
        });
        
        regionSelect.addEventListener('change', (e) => {
            this.filterByRegion(e.target.value);
        });
        
        regionGroup.appendChild(regionSelect);
        this.chartControls.appendChild(regionGroup);
        
        // Change the default "Show:" label to be more specific
        const limitLabel = this.chartControls.querySelector('.form-group:nth-child(2) label');
        if (limitLabel) {
            limitLabel.textContent = 'Top Currencies:';
        }
    }

    /**
     * Change currency data view
     * @param {string} view - Type of currency view to display
     */
    async changeCurrencyView(view) {
        console.log(`[${this.containerId}] Changing currency view to: ${view}`);
        
        // Show loading overlay
        this.showLoading();
        
        try {
            // Store currency view option
            this.options.currView = view;
            
            // Re-process data with new view
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
            
            // Update title based on view
            let viewText = 'Most Used Currencies';
            if (view === 'shared') {
                viewText = 'Most Shared Currencies';
            } else if (view === 'exclusive') {
                viewText = 'Currencies Used by Single Countries';
            }
            
            this.options.title = viewText;
            
            // Update the chart title in the DOM
            const titleElement = this.container.querySelector('.chart-title');
            if (titleElement) {
                titleElement.textContent = this.options.title;
            }
        } catch (error) {
            console.error(`[${this.containerId}] Error changing currency view:`, error);
            this.showError(`Failed to change currency view: ${error.message}`);
        }
    }

    /**
     * Filter currencies by region
     * @param {string} region - Region to filter by
     */
    async filterByRegion(region) {
        console.log(`[${this.containerId}] Filtering by region: ${region}`);
        
        // Show loading overlay
        this.showLoading();
        
        try {
            // Store region filter option
            this.options.regionFilter = region;
            
            // Re-process data with region filter
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
            
            // Update title based on region filter
            let viewText = 'Most Used Currencies';
            if (this.options.currView === 'shared') {
                viewText = 'Most Shared Currencies';
            } else if (this.options.currView === 'exclusive') {
                viewText = 'Currencies Used by Single Countries';
            }
            
            if (region !== 'all') {
                this.options.title = `${viewText} in ${region}`;
            } else {
                this.options.title = viewText;
            }
            
            // Update the chart title in the DOM
            const titleElement = this.container.querySelector('.chart-title');
            if (titleElement) {
                titleElement.textContent = this.options.title;
            }
        } catch (error) {
            console.error(`[${this.containerId}] Error filtering by region:`, error);
            this.showError(`Failed to filter by region: ${error.message}`);
        }
    }

    /**
     * Toggle currency symbols in chart
     * @param {boolean} show - Whether to show symbols
     */
    async toggleSymbols(show) {
        console.log(`[${this.containerId}] Toggling currency symbols: ${show}`);
        
        // Show loading overlay
        this.showLoading();
        
        try {
            // Store symbol display option
            this.options.showSymbols = show;
            
            // Create new chart configuration with symbols
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
            console.error(`[${this.containerId}] Error toggling symbols:`, error);
            this.showError(`Failed to toggle currency symbols: ${error.message}`);
        }
    }

    // Common currency symbols for major currencies
    getCurrencySymbols() {
        return {
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'JPY': '¥',
            'CNY': '¥',
            'AUD': 'A$',
            'CAD': 'C$',
            'CHF': 'Fr',
            'INR': '₹',
            'RUB': '₽',
            'BRL': 'R$',
            'ZAR': 'R',
            'NGN': '₦',
            'KRW': '₩',
            'MXN': 'Mex$',
            'SEK': 'kr',
            'NOK': 'kr',
            'DKK': 'kr',
            'NZD': 'NZ$'
        };
    }

    // Helper method to get currency symbol from code
    getCurrencySymbol(currencyName) {
        // Try to extract currency code from the name (e.g. "US Dollar" -> "USD")
        const commonCurrencies = this.getCurrencySymbols();
        
        // Check if the full name contains a currency code we know
        for (const code in commonCurrencies) {
            if (currencyName.includes(code)) {
                return commonCurrencies[code];
            }
        }
        
        // Map some common currency names to symbols
        const currencyNameMap = {
            'Dollar': '$',
            'Euro': '€',
            'Pound': '£',
            'Yen': '¥',
            'Yuan': '¥',
            'Franc': 'Fr',
            'Rupee': '₹',
            'Ruble': '₽',
            'Real': 'R$',
            'Rand': 'R',
            'Won': '₩',
            'Krone': 'kr',
            'Dinar': 'د.ك',
            'Peso': '₱',
            'Lira': '₺',
            'Shekel': '₪',
            'Dirham': 'د.إ',
            'Baht': '฿'
        };
        
        for (const name in currencyNameMap) {
            if (currencyName.includes(name)) {
                return currencyNameMap[name];
            }
        }
        
        // Default if no matching symbol found
        return '';
    }
}