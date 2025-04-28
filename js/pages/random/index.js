/**
 * Random Country Page Module
 * Handles displaying random country information and visualizations
 */

import { Navigation } from '../../components/navigation.js';
import { countryService } from '../../services/countryService.js';
import { chartService } from '../../services/chartService.js';
import * as dataProcessing from '../../utils/dataProcessing.js';
import * as chartUtils from '../../utils/chartUtils.js';

class RandomCountryPage {
    constructor() {
        this.navigation = null;
        this.currentCountry = null;
        
        // Cache DOM elements
        this.randomizeBtn = document.getElementById('randomizeBtn');
        this.countryDisplay = document.getElementById('countryDisplay');
        this.populationChart = document.getElementById('populationChart');
        this.languageChart = document.getElementById('languageChart');
        this.currencyChart = document.getElementById('currencyChart');

        // Templates
        this.countryTemplate = document.getElementById('country-template');
        this.errorTemplate = document.getElementById('error-template');

        // Bind methods
        this.handleRandomize = this.handleRandomize.bind(this);
        this.displayCountryInfo = this.displayCountryInfo.bind(this);
        this.createCharts = this.createCharts.bind(this);
        this.handleError = this.handleError.bind(this);
    }

    /**
     * Initialize the random country page
     */
    async initialize() {
        try {
            // Initialize navigation
            this.navigation = new Navigation();

            // Add event listeners
            this.randomizeBtn.addEventListener('click', this.handleRandomize);

            // Get initial random country
            await this.handleRandomize();

        } catch (error) {
            console.error('Error initializing random country page:', error);
            this.handleError(error);
        }
    }

    /**
     * Handle random country button click
     */
    async handleRandomize() {
        try {
            // Show loading state
            this.countryDisplay.innerHTML = '<div class="loading-message"><p>Loading random country...</p></div>';
            this.randomizeBtn.disabled = true;

            // Get all countries and select one randomly
            const countries = await countryService.getAllCountries();
            const randomCountry = countries[Math.floor(Math.random() * countries.length)];
            this.currentCountry = randomCountry;

            // Display country info and create charts
            await Promise.all([
                this.displayCountryInfo(randomCountry),
                this.createCharts(randomCountry, countries)
            ]);

        } catch (error) {
            console.error('Error getting random country:', error);
            this.handleError(error);
        } finally {
            this.randomizeBtn.disabled = false;
        }
    }

    /**
     * Display country information
     * @param {Object} country - Country data
     */
    async displayCountryInfo(country) {
        const countryInfo = this.countryTemplate.content.cloneNode(true);

        // Update template content
        countryInfo.querySelector('.country-flag').src = country.flags.svg;
        countryInfo.querySelector('.country-flag').alt = `Flag of ${country.name.common}`;
        countryInfo.querySelector('.country-name').textContent = country.name.common;
        countryInfo.querySelector('.capital').textContent = country.capital?.[0] || 'N/A';
        countryInfo.querySelector('.region').textContent = `${country.region} (${country.subregion || 'N/A'})`;
        countryInfo.querySelector('.population').textContent = dataProcessing.formatNumber(country.population);
        countryInfo.querySelector('.area').textContent = country.area ? `${dataProcessing.formatNumber(country.area)} km²` : 'N/A';
        
        // Languages
        const languages = country.languages ? Object.values(country.languages).join(', ') : 'N/A';
        countryInfo.querySelector('.languages').textContent = languages;

        // Currencies
        const currencies = country.currencies 
            ? Object.values(country.currencies).map(c => `${c.name} (${c.symbol || 'N/A'})`).join(', ')
            : 'N/A';
        countryInfo.querySelector('.currencies').textContent = currencies;

        // Timezones
        countryInfo.querySelector('.timezones').textContent = country.timezones?.join(', ') || 'N/A';

        // Maps link
        const mapsLink = countryInfo.querySelector('.maps-link');
        if (country.maps?.googleMaps) {
            mapsLink.href = country.maps.googleMaps;
        } else {
            mapsLink.style.display = 'none';
        }

        // Clear and add new content
        this.countryDisplay.innerHTML = '';
        this.countryDisplay.appendChild(countryInfo);
    }

    /**
     * Create visualization charts for the country
     * Implements Method 2 API approach:
     * 1. Get data from REST Countries API
     * 2. Process data
     * 3. Create chart using QuickChart API
     * 
     * @param {Object} country - Current country data
     * @param {Array} allCountries - All countries data for comparison
     */
    async createCharts(country, allCountries) {
        try {
            // Population comparison chart
            const popConfig = this.createPopulationChartConfig(country, allCountries);
            const popChartUrl = chartService.createChartUrl(popConfig);
            chartUtils.displayChart('populationChart', popChartUrl, 'Population Comparison');

            // Language usage chart
            const langConfig = this.createLanguageChartConfig(country, allCountries);
            const langChartUrl = chartService.createChartUrl(langConfig);
            chartUtils.displayChart('languageChart', langChartUrl, 'Language Usage');

            // Currency usage chart
            const currConfig = this.createCurrencyChartConfig(country, allCountries);
            const currChartUrl = chartService.createChartUrl(currConfig);
            chartUtils.displayChart('currencyChart', currChartUrl, 'Currency Usage');

        } catch (error) {
            console.error('Error creating charts:', error);
            this.handleError(error);
        }
    }

    /**
     * Create population comparison chart configuration
     */
    createPopulationChartConfig(country, allCountries) {
        const regionCountries = allCountries
            .filter(c => c.region === country.region)
            .sort((a, b) => b.population - a.population)
            .slice(0, 5);

        return {
            type: 'bar',
            data: {
                labels: regionCountries.map(c => c.name.common),
                datasets: [{
                    label: 'Population',
                    data: regionCountries.map(c => c.population),
                    backgroundColor: regionCountries.map(c => 
                        c.name.common === country.name.common ? '#ff6384' : '#36a2eb'
                    ),
                    borderColor: '#333',
                    borderWidth: 1
                }]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: `Population Comparison - ${country.region}`,
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
    }

    /**
     * Create language usage chart configuration
     */
    createLanguageChartConfig(country, allCountries) {
        const countryLanguages = country.languages ? Object.values(country.languages) : [];
        const languageStats = {};

        // Count language usage
        allCountries.forEach(c => {
            if (c.languages) {
                Object.values(c.languages).forEach(lang => {
                    if (countryLanguages.includes(lang)) {
                        languageStats[lang] = (languageStats[lang] || 0) + 1;
                    }
                });
            }
        });

        return {
            type: 'pie',
            data: {
                labels: Object.keys(languageStats),
                datasets: [{
                    data: Object.values(languageStats),
                    backgroundColor: [
                        '#ff6384',
                        '#36a2eb',
                        '#ffcd56',
                        '#4bc0c0',
                        '#9966ff'
                    ]
                }]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: 'Language Usage Distribution',
                        font: { size: 16, weight: 'bold' }
                    }
                }
            }
        };
    }

    /**
     * Create currency usage chart configuration
     */
    createCurrencyChartConfig(country, allCountries) {
        const countryCurrencies = country.currencies ? Object.keys(country.currencies) : [];
        const currencyStats = {};

        // Count currency usage
        allCountries.forEach(c => {
            if (c.currencies) {
                Object.keys(c.currencies).forEach(curr => {
                    if (countryCurrencies.includes(curr)) {
                        currencyStats[curr] = (currencyStats[curr] || 0) + 1;
                    }
                });
            }
        });

        return {
            type: 'doughnut',
            data: {
                labels: Object.keys(currencyStats),
                datasets: [{
                    data: Object.values(currencyStats),
                    backgroundColor: [
                        '#ff6384',
                        '#36a2eb',
                        '#ffcd56'
                    ]
                }]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: 'Currency Usage Distribution',
                        font: { size: 16, weight: 'bold' }
                    }
                }
            }
        };
    }

    /**
     * Handle errors
     * @param {Error} error - The error that occurred
     */
    handleError(error) {
        const errorElement = this.errorTemplate.content.cloneNode(true);
        errorElement.querySelector('p').textContent = error.message || 'An error occurred. Please try again.';
        this.countryDisplay.innerHTML = '';
        this.countryDisplay.appendChild(errorElement);
    }
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const randomCountryPage = new RandomCountryPage();
    randomCountryPage.initialize();
});