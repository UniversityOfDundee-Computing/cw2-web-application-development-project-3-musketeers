/**
 * Random Country Page Module
 * Handles displaying random country information and visualizations
 */

import { Navigation } from '../../components/navigation.js';
import { countryService } from '../../services/countryService.js';
import { chartService } from '../../services/chartService.js';
import * as dataProcessing from '../../utils/dataProcessing.js';
import * as chartUtils from '../../utils/chartUtils.js';

// Get the root styles
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

class RandomCountryPage {
    constructor() {
        this.navigation = null;
        this.currentCountry = null;
        this.allCountries = [];

        // Cache DOM elements
        this.countryOverview = document.getElementById('countryOverview');
        this.quickFacts = document.getElementById('quickFacts').querySelector('.facts-grid');
        this.populationChart = document.getElementById('populationChart');
        this.languageChart = document.getElementById('languageChart');
        this.areaChart = document.getElementById('areaChart');
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
        // Map
        if (country.maps?.googleMaps) {
            this.mapView.innerHTML = `
                <iframe
                    src="https://www.google.com/maps?q=${encodeURIComponent(country.name.common)}&output=embed"
                    allowfullscreen=""
                    loading="lazy"
                ></iframe>
            `;
        }
    }

    /**
     * Create visualization charts for the country
     * @param {Object} country - Current country data
     * @param {Array} allCountries - All countries data for comparison
     */
    async createCharts(country, allCountries) {
        try {
            await Promise.all([
                this.createPopulationChart(country, allCountries),
                this.createLanguageChart(country, allCountries),
                this.createAreaChart(country, allCountries)
            ]);
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Create population comparison chart
     */
    async createPopulationChart(country, allCountries) {
        // Get regional countries and sort them
        const regionalCountries = allCountries
            .filter(c => c.region === country.region)
            .sort((a, b) => b.population - a.population);

        // Find the index of the current country in the sorted array
        const index = regionalCountries.findIndex(c => c.name.common === country.name.common);

        // Select two countries before and two after the current country
        const start = Math.max(index - 2, 0);
        const end = Math.min(index + 3, regionalCountries.length);
        const selectedCountries = regionalCountries.slice(start, end);
        const selectedCountryName = country.name.common;

        // Background colors based on selection
        const backgroundColors = selectedCountries.map(c =>
            c.name.common === selectedCountryName ? hexToRgba(COLORS.primaryLight, 0.75) : COLORS.primary
        );

        // Define border colors: darker shade for the borders
        const borderColors = selectedCountries.map(c =>
            c.name.common === selectedCountryName ? hexToRgba(COLORS.primaryLight, 1) : hexToRgba(COLORS.primary, 1)
        );

        // Round the borders and apply border width
        const borderWidths = selectedCountries.map(c =>
            c.name.common === selectedCountryName ? 3 : 1
        );

        const chartConfig = {
            type: 'bar',
            data: {
                labels: selectedCountries.map(c => c.name.common),
                datasets: [{
                    label: 'Population',
                    data: selectedCountries.map(c => c.population),
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: borderWidths,
                    borderRadius: 12
                }]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: `Population Comparison - ${country.region}`,
                        font: {size: 24, family: 'Roboto, sans-serif', weight: 600},
                        color: COLORS.textPrimary,
                        padding: {bottom: 24}
                    },
                    legend: {
                        display: false,
                        labels: {
                            font: {size: 14, family: 'Roboto, sans-serif'},
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => dataProcessing.formatNumber(value),
                            color: COLORS.textSecondary,
                            font: {size: 14, family: 'Roboto, sans-serif'}
                        }
                    },
                    x: {
                        ticks: {
                            color: COLORS.textSecondary,
                            font: {size: 14, family: 'Roboto, sans-serif'}
                        }
                    }
                }
            }
        };

        const chartUrl = chartService.createChartUrl(chartConfig);
        chartUtils.displayChart('populationChart', chartUrl, 'Population comparison');
    }

    /**
     * Create language distribution chart
     */
    async createLanguageChart(country, allCountries) {
        if (!country.languages) {
            this.languageChart.innerHTML = '<p>No official languages</p>';
            return;
        }

        const languages = Object.values(country.languages);
        const languageStats = {};

        allCountries.forEach(c => {
            if (c.languages) {
                Object.values(c.languages).forEach(lang => {
                    if (languages.includes(lang)) {
                        languageStats[lang] = (languageStats[lang] || 0) + 1;
                    }
                });
            }
        });

        const chartConfig = {
            type: 'doughnut',
            data: {
                labels: Object.keys(languageStats),
                datasets: [{
                    data: Object.values(languageStats),
                    backgroundColor: generateHueVariants(COLORS.primary, Object.keys(languageStats).length)
                }]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: 'Language Distribution',
                        font: {size: 24, family: 'Roboto, sans-serif', weight: 600},
                        color: COLORS.textPrimary,
                        padding: {bottom: 24}
                    },
                    legend: {
                        display: true,
                        labels: {
                            font: {size: 14, family: 'Roboto, sans-serif'},
                        }
                    }
                }
            }
        };

        const chartUrl = chartService.createChartUrl(chartConfig);
        chartUtils.displayChart('languageChart', chartUrl, 'Language distribution');
    }

    /**
     * Create area comparison chart
     */
    async createAreaChart(country, allCountries) {
        if (!country) return;

        // Get regional countries and sort them by area
        const regionalCountries = allCountries
            .filter(c => c.region === country.region)
            .sort((a, b) => b.area - a.area);

        // Find the index of the current country in the sorted array
        const index = regionalCountries.findIndex(c => c.name.common === country.name.common);

        // Select two countries before and two after the current country
        const start = Math.max(index - 2, 0);
        const end = Math.min(index + 3, regionalCountries.length);

        // Select the countries to display
        const selectedCountries = regionalCountries.slice(start, end);
        const selectedCountryName = country.name.common;

        // Background colors based on selection
        const backgroundColors = selectedCountries.map(c =>
            c.name.common === selectedCountryName ? hexToRgba(COLORS.primaryLight, 0.75) : COLORS.primary
        );

        // Define border colors: darker shade for the borders
        const borderColors = selectedCountries.map(c =>
            c.name.common === selectedCountryName ? hexToRgba(COLORS.primaryLight, 1) : hexToRgba(COLORS.primary, 1)
        );

        // Round the borders and apply border width
        const borderWidths = selectedCountries.map(c =>
            c.name.common === selectedCountryName ? 3 : 1
        );

        // Create chart configuration
        const chartConfig = {
            type: 'bar',
            data: {
                labels: selectedCountries.map(c => c.name.common),
                datasets: [{
                    label: 'Country Area (in km²)',
                    data: selectedCountries.map(c => c.area),
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: borderWidths,
                    borderRadius: 8
                }]
            },
            options: {
                indexAxis: 'y',
                plugins: {
                    title: {
                        display: true,
                        text: `Area Comparison - ${country.region} (km²)`,
                        font: {size: 24, family: 'Roboto, sans-serif', weight: 600},
                        color: COLORS.textPrimary,
                        padding: {bottom: 24}
                    },
                    legend: {
                        display: false,
                        labels: {
                            font: {size: 14, family: 'Roboto, sans-serif'},
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => dataProcessing.formatNumber(value),
                            color: COLORS.textSecondary,
                            font: {size: 14, family: 'Roboto, sans-serif'}
                        }
                    },
                    y: {
                        ticks: {
                            color: COLORS.textSecondary,
                            font: {size: 14, family: 'Roboto, sans-serif'}
                        }
                    }
                }
            }
        };

        const chartUrl = chartService.createChartUrl(chartConfig);
        chartUtils.displayChart('areaChart', chartUrl, 'Area comparison');
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