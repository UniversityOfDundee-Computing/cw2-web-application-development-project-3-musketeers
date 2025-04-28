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
        this.allCountries = [];

        // Cache DOM elements (updated for new structure)
        this.countryOverview = document.getElementById('countryOverview');
        this.quickFacts = document.getElementById('quickFacts').querySelector('.facts-grid');
        this.populationChart = document.getElementById('populationChart');
        this.languageChart = document.getElementById('languageChart');
        this.regionalChart = document.getElementById('regionalChart');
        this.currencyChart = document.getElementById('currencyChart');
        this.mapView = document.getElementById('mapView');
        this.neighbors = document.getElementById('neighbors').querySelector('.neighbors-grid');

        // Templates
        this.overviewTemplate = document.getElementById('country-overview-template');
        this.factTemplate = document.getElementById('fact-item-template');
        this.neighborTemplate = document.getElementById('neighbor-template');
        this.errorTemplate = document.getElementById('error-template');
        this.loadingTemplate = document.getElementById('loading-template');

        // Bind methods
        this.handleRandomize = this.handleRandomize.bind(this);
        this.displayCountryInfo = this.displayCountryInfo.bind(this);
        this.createCharts = this.createCharts.bind(this);
        this.displayNeighbors = this.displayNeighbors.bind(this);
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
            this.randomizeBtn = document.getElementById('randomizeBtn');
            this.randomizeBtn.addEventListener('click', this.handleRandomize);

            // Fetch all countries once for reuse
            this.allCountries = await countryService.getAllCountries();

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
            this.countryOverview.innerHTML = '<div class="loading-message"><p>Loading random country...</p></div>';
            this.quickFacts.innerHTML = '';
            this.mapView.innerHTML = '';
            this.neighbors.innerHTML = '';
            this.randomizeBtn.disabled = true;

            // Pick a random country
            const countries = this.allCountries;
            const randomCountry = countries[Math.floor(Math.random() * countries.length)];
            this.currentCountry = randomCountry;

            // Display all sections
            await Promise.all([
                this.displayCountryInfo(randomCountry),
                this.createCharts(randomCountry, countries),
                this.displayNeighbors(randomCountry, countries)
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
        // Overview
        const overview = this.overviewTemplate.content.cloneNode(true);
        overview.querySelector('.country-flag').src = country.flags.svg;
        overview.querySelector('.country-flag').alt = `Flag of ${country.name.common}`;
        overview.querySelector('.country-name').textContent = country.name.common;
        overview.querySelector('.capital').textContent = `Capital: ${country.capital?.[0] || 'N/A'}`;
        overview.querySelector('.region').textContent = `${country.region} (${country.subregion || 'N/A'})`;
        // Maps link
        const mapsLink = overview.querySelector('.maps-link');
        if (mapsLink) {
            if (country.maps?.googleMaps) {
                mapsLink.href = country.maps.googleMaps;
            } else {
                mapsLink.style.display = 'none';
            }
        }
        this.countryOverview.innerHTML = '';
        this.countryOverview.appendChild(overview);

        // Quick facts
        const facts = [
            { label: 'Population', value: dataProcessing.formatNumber(country.population) },
            { label: 'Area', value: country.area ? `${dataProcessing.formatNumber(country.area)} km²` : 'N/A' },
            { label: 'Languages', value: country.languages ? Object.values(country.languages).join(', ') : 'N/A' },
            { label: 'Currencies', value: country.currencies ? Object.values(country.currencies).map(c => `${c.name} (${c.symbol || 'N/A'})`).join(', ') : 'N/A' },
            { label: 'Time Zones', value: country.timezones?.join(', ') || 'N/A' },
            { label: 'Driving Side', value: country.car?.side?.charAt(0).toUpperCase() + country.car?.side?.slice(1) || 'N/A' },
            { label: 'Status', value: country.independent ? 'Independent' : 'Dependent' }
        ];
        this.quickFacts.innerHTML = '';
        facts.forEach(fact => {
            const factElement = this.factTemplate.content.cloneNode(true);
            factElement.querySelector('.fact-label').textContent = fact.label;
            factElement.querySelector('.fact-value').textContent = fact.value;
            this.quickFacts.appendChild(factElement);
        });

        // Map
        if (country.maps?.googleMaps) {
            this.mapView.innerHTML = `
                <iframe
                    src="https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${encodeURIComponent(country.name.common)}"
                    width="100%"
                    height="400"
                    style="border:0;border-radius:var(--border-radius);"
                    allowfullscreen=""
                    loading="lazy">
                </iframe>
            `;
        } else {
            this.mapView.innerHTML = '<p>Map not available.</p>';
        }
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
     * Display neighboring countries
     * @param {Object} country - Current country data
     * @param {Array} allCountries - All countries data for comparison
     */
    async displayNeighbors(country, allCountries) {
        if (!country.borders?.length) {
            this.neighbors.innerHTML = '<p>No neighboring countries</p>';
            return;
        }
        const neighboringCountries = allCountries.filter(
            c => country.borders.includes(c.cca3)
        );
        this.neighbors.innerHTML = '';
        neighboringCountries.forEach(c => {
            const neighborElement = this.neighborTemplate.content.cloneNode(true);
            const link = neighborElement.querySelector('a');
            link.href = `?country=${encodeURIComponent(c.name.common)}`;
            link.querySelector('img').src = c.flags.svg;
            link.querySelector('img').alt = `Flag of ${c.name.common}`;
            link.querySelector('.neighbor-name').textContent = c.name.common;
            this.neighbors.appendChild(neighborElement);
        });
    }

    /**
     * Handle errors
     * @param {Error} error - The error that occurred
     */
    handleError(error) {
        const errorElement = this.errorTemplate.content.cloneNode(true);
        errorElement.querySelector('p').textContent = error.message || 'An error occurred. Please try again.';
        this.countryOverview.innerHTML = '';
        this.countryOverview.appendChild(errorElement);
    }
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const randomCountryPage = new RandomCountryPage();
    randomCountryPage.initialize();
});