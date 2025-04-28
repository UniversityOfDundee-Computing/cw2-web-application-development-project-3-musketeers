/**
 * Compare Countries Page Module
 * Handles country selection and comparison visualizations
 */

import { Navigation } from '../../components/navigation.js';
import { countryService } from '../../services/countryService.js';
import { chartService } from '../../services/chartService.js';
import * as dataProcessing from '../../utils/dataProcessing.js';
import * as chartUtils from '../../utils/chartUtils.js';

class CompareCountriesPage {
    constructor() {
        this.navigation = null;
        this.countries = [];
        this.selectedCountries = {
            country1: null,
            country2: null
        };

        // Cache DOM elements
        this.country1Select = document.getElementById('country1');
        this.country2Select = document.getElementById('country2');
        this.country1Details = document.getElementById('country1Details');
        this.country2Details = document.getElementById('country2Details');
        this.generalComparison = document.getElementById('generalComparison');

        // Cache templates
        this.previewTemplate = document.getElementById('country-preview-template');
        this.statsTemplate = document.getElementById('comparison-stats-template');
        this.errorTemplate = document.getElementById('error-template');
        this.loadingTemplate = document.getElementById('loading-template');

        // Bind methods
        this.handleCountrySelection = this.handleCountrySelection.bind(this);
        this.updateComparison = this.updateComparison.bind(this);
    }

    /**
     * Initialize the compare page
     */
    async initialize() {
        try {
            // Initialize navigation
            this.navigation = new Navigation();

            // Fetch all countries
            this.countries = await countryService.getAllCountries();

            // Populate dropdowns
            this.populateCountryDropdowns();

            // Add event listeners
            this.country1Select.addEventListener('change', () => this.handleCountrySelection('country1'));
            this.country2Select.addEventListener('change', () => this.handleCountrySelection('country2'));

            // Check URL parameters for initial countries
            this.loadCountriesFromURL();

        } catch (error) {
            console.error('Error initializing compare page:', error);
            this.handleError(error);
        }
    }

    /**
     * Load countries from URL parameters
     */
    loadCountriesFromURL() {
        const params = new URLSearchParams(window.location.search);
        const country1 = params.get('country1');
        const country2 = params.get('country2');

        if (country1) {
            this.country1Select.value = decodeURIComponent(country1);
            this.handleCountrySelection('country1');
        }

        if (country2) {
            this.country2Select.value = decodeURIComponent(country2);
            this.handleCountrySelection('country2');
        }
    }

    /**
     * Update URL with selected countries
     */
    updateURL() {
        const params = new URLSearchParams();
        if (this.selectedCountries.country1) {
            params.set('country1', encodeURIComponent(this.selectedCountries.country1.name.common));
        }
        if (this.selectedCountries.country2) {
            params.set('country2', encodeURIComponent(this.selectedCountries.country2.name.common));
        }
        window.history.replaceState({}, '', `?${params.toString()}`);
    }

    /**
     * Populate country dropdowns
     */
    populateCountryDropdowns() {
        const sortedCountries = [...this.countries].sort((a, b) => 
            a.name.common.localeCompare(b.name.common)
        );

        const optionsHTML = sortedCountries.map(country => 
            `<option value="${country.name.common}">${country.name.common}</option>`
        ).join('');

        this.country1Select.innerHTML = '<option value="">Select a country</option>' + optionsHTML;
        this.country2Select.innerHTML = '<option value="">Select a country</option>' + optionsHTML;
    }

    /**
     * Handle country selection
     * @param {string} selectId - Which dropdown was changed
     */
    async handleCountrySelection(selectId) {
        const select = selectId === 'country1' ? this.country1Select : this.country2Select;
        const detailsContainer = selectId === 'country1' ? this.country1Details : this.country2Details;
        const countryName = select.value;

        if (!countryName) {
            detailsContainer.innerHTML = '';
            this.selectedCountries[selectId] = null;
            this.updateComparison();
            return;
        }

        try {
            detailsContainer.innerHTML = this.loadingTemplate.innerHTML;
            const country = this.countries.find(c => c.name.common === countryName);
            if (!country) throw new Error('Country not found');

            this.selectedCountries[selectId] = country;
            this.updateCountryPreview(detailsContainer, country);
            this.updateURL();
            this.updateComparison();

        } catch (error) {
            console.error(`Error selecting country for ${selectId}:`, error);
            this.handleError(error, detailsContainer);
        }
    }

    /**
     * Update country preview
     * @param {HTMLElement} container - Preview container
     * @param {Object} country - Country data
     */
    updateCountryPreview(container, country) {
        const preview = this.previewTemplate.content.cloneNode(true);

        preview.querySelector('.preview-flag').src = country.flags.svg;
        preview.querySelector('.preview-flag').alt = `Flag of ${country.name.common}`;
        preview.querySelector('.preview-name').textContent = country.name.common;
        preview.querySelector('.preview-region').textContent = `${country.region} (${country.subregion || 'N/A'})`;
        preview.querySelector('.preview-population').textContent = 
            `Population: ${dataProcessing.formatNumber(country.population)}`;

        container.innerHTML = '';
        container.appendChild(preview);
    }

    /**
     * Update comparison visualizations
     * Implements Method 2 API approach:
     * 1. Process country data from first API
     * 2. Create visualization using second API
     */
    async updateComparison() {
        if (!this.selectedCountries.country1 || !this.selectedCountries.country2) {
            this.generalComparison.innerHTML = '<p class="select-prompt">Select two countries to compare</p>';
            return;
        }

        try {
            // Show loading state
            this.generalComparison.innerHTML = this.loadingTemplate.innerHTML;

            // Create general comparison table
            this.createComparisonTable();

            // Create comparison charts using Method 2 approach
            await Promise.all([
                this.createPopulationChart(),
                this.createAreaChart(),
                this.createLanguagesChart(),
                this.createCurrenciesChart()
            ]);

        } catch (error) {
            console.error('Error updating comparison:', error);
            this.handleError(error);
        }
    }

    /**
     * Create general comparison table
     */
    createComparisonTable() {
        const stats = this.statsTemplate.content.cloneNode(true);
        const table = stats.querySelector('tbody');
        const c1 = this.selectedCountries.country1;
        const c2 = this.selectedCountries.country2;

        // Update headers
        stats.querySelector('.country1-name').textContent = c1.name.common;
        stats.querySelector('.country2-name').textContent = c2.name.common;

        // Add comparison rows
        const comparisons = [
            {
                metric: 'Capital',
                value1: c1.capital?.[0] || 'N/A',
                value2: c2.capital?.[0] || 'N/A'
            },
            {
                metric: 'Population',
                value1: dataProcessing.formatNumber(c1.population),
                value2: dataProcessing.formatNumber(c2.population)
            },
            {
                metric: 'Area',
                value1: c1.area ? `${dataProcessing.formatNumber(c1.area)} km²` : 'N/A',
                value2: c2.area ? `${dataProcessing.formatNumber(c2.area)} km²` : 'N/A'
            },
            {
                metric: 'Languages',
                value1: c1.languages ? Object.values(c1.languages).join(', ') : 'N/A',
                value2: c2.languages ? Object.values(c2.languages).join(', ') : 'N/A'
            },
            {
                metric: 'Currencies',
                value1: c1.currencies ? Object.values(c1.currencies).map(c => c.name).join(', ') : 'N/A',
                value2: c2.currencies ? Object.values(c2.currencies).map(c => c.name).join(', ') : 'N/A'
            },
            {
                metric: 'Region',
                value1: `${c1.region} (${c1.subregion || 'N/A'})`,
                value2: `${c2.region} (${c2.subregion || 'N/A'})`
            }
        ];

        comparisons.forEach(({ metric, value1, value2 }) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${metric}</td>
                <td>${value1}</td>
                <td>${value2}</td>
            `;
            table.appendChild(row);
        });

        this.generalComparison.innerHTML = '';
        this.generalComparison.appendChild(stats);
    }

    /**
     * Create population comparison chart
     */
    async createPopulationChart() {
        const c1 = this.selectedCountries.country1;
        const c2 = this.selectedCountries.country2;

        const chartConfig = {
            type: 'bar',
            data: {
                labels: [c1.name.common, c2.name.common],
                datasets: [{
                    label: 'Population',
                    data: [c1.population, c2.population],
                    backgroundColor: ['#36a2eb', '#ff6384']
                }]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: 'Population Comparison',
                        font: { size: 16, weight: 'bold' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => dataProcessing.formatNumber(value)
                        }
                    }
                }
            }
        };

        const chartUrl = chartService.createChartUrl(chartConfig);
        chartUtils.displayChart('populationChart', chartUrl, 'Population comparison');
    }

    /**
     * Create area comparison chart
     */
    async createAreaChart() {
        const c1 = this.selectedCountries.country1;
        const c2 = this.selectedCountries.country2;

        const chartConfig = {
            type: 'bar',
            data: {
                labels: [c1.name.common, c2.name.common],
                datasets: [{
                    label: 'Area (km²)',
                    data: [c1.area, c2.area],
                    backgroundColor: ['#36a2eb', '#ff6384']
                }]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: 'Area Comparison',
                        font: { size: 16, weight: 'bold' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => dataProcessing.formatNumber(value)
                        }
                    }
                }
            }
        };

        const chartUrl = chartService.createChartUrl(chartConfig);
        chartUtils.displayChart('areaChart', chartUrl, 'Area comparison');
    }

    /**
     * Create languages comparison chart
     */
    async createLanguagesChart() {
        const c1 = this.selectedCountries.country1;
        const c2 = this.selectedCountries.country2;

        const languages1 = c1.languages ? Object.values(c1.languages) : [];
        const languages2 = c2.languages ? Object.values(c2.languages) : [];
        const allLanguages = [...new Set([...languages1, ...languages2])];

        const chartConfig = {
            type: 'radar',
            data: {
                labels: allLanguages,
                datasets: [
                    {
                        label: c1.name.common,
                        data: allLanguages.map(lang => languages1.includes(lang) ? 1 : 0),
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderColor: '#36a2eb'
                    },
                    {
                        label: c2.name.common,
                        data: allLanguages.map(lang => languages2.includes(lang) ? 1 : 0),
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderColor: '#ff6384'
                    }
                ]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: 'Languages Comparison',
                        font: { size: 16, weight: 'bold' }
                    }
                }
            }
        };

        const chartUrl = chartService.createChartUrl(chartConfig);
        chartUtils.displayChart('languagesChart', chartUrl, 'Languages comparison');
    }

    /**
     * Create currencies comparison chart
     */
    async createCurrenciesChart() {
        const c1 = this.selectedCountries.country1;
        const c2 = this.selectedCountries.country2;

        const currencies1 = c1.currencies ? Object.keys(c1.currencies) : [];
        const currencies2 = c2.currencies ? Object.keys(c2.currencies) : [];
        const allCurrencies = [...new Set([...currencies1, ...currencies2])];

        const chartConfig = {
            type: 'radar',
            data: {
                labels: allCurrencies,
                datasets: [
                    {
                        label: c1.name.common,
                        data: allCurrencies.map(curr => currencies1.includes(curr) ? 1 : 0),
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderColor: '#36a2eb'
                    },
                    {
                        label: c2.name.common,
                        data: allCurrencies.map(curr => currencies2.includes(curr) ? 1 : 0),
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderColor: '#ff6384'
                    }
                ]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: 'Currencies Comparison',
                        font: { size: 16, weight: 'bold' }
                    }
                }
            }
        };

        const chartUrl = chartService.createChartUrl(chartConfig);
        chartUtils.displayChart('currenciesChart', chartUrl, 'Currencies comparison');
    }

    /**
     * Handle errors
     * @param {Error} error - The error that occurred
     * @param {HTMLElement} container - Optional container for error message
     */
    handleError(error, container = null) {
        const errorElement = this.errorTemplate.content.cloneNode(true);
        errorElement.querySelector('p').textContent = error.message || 'An error occurred. Please try again.';
        
        if (container) {
            container.innerHTML = '';
            container.appendChild(errorElement);
        } else {
            this.generalComparison.innerHTML = '';
            this.generalComparison.appendChild(errorElement);
        }
    }
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const comparePage = new CompareCountriesPage();
    comparePage.initialize();
});
