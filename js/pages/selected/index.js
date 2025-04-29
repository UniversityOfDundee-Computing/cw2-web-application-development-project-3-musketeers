/**
 * Selected Country Page Module
 * Handles displaying detailed information about a specific country
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

    // function generateDarkShades(baseHex, numberOfShades) {
    //     const hexToHsl = (H) => {
    //         let r = parseInt(H.slice(1, 3), 16) / 255;
    //         let g = parseInt(H.slice(3, 5), 16) / 255;
    //         let b = parseInt(H.slice(5, 7), 16) / 255;
    
    //         const max = Math.max(r, g, b), min = Math.min(r, g, b);
    //         let h, s, l = (max + min) / 2;
    
    //         if (max === min) {
    //             h = s = 0;
    //         } else {
    //             const d = max - min;
    //             s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    //             switch (max) {
    //                 case r: h = (g - b) / d + (g < b ? 6 : 0); break;
    //                 case g: h = (b - r) / d + 2; break;
    //                 case b: h = (r - g) / d + 4; break;
    //             }
    //             h /= 6;
    //         }
    
    //         return { h, s, l };
    //     };
    
    //     const hslToHex = ({ h, s, l }) => {
    //         const hue2rgb = (p, q, t) => {
    //             if (t < 0) t += 1;
    //             if (t > 1) t -= 1;
    //             if (t < 1 / 6) return p + (q - p) * 6 * t;
    //             if (t < 1 / 2) return q;
    //             if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    //             return p;
    //         };
    
    //         let r, g, b;
    //         if (s === 0) {
    //             r = g = b = l;
    //         } else {
    //             const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    //             const p = 2 * l - q;
    //             r = hue2rgb(p, q, h + 1 / 3);
    //             g = hue2rgb(p, q, h);
    //             b = hue2rgb(p, q, h - 1 / 3);
    //         }
    
    //         const toHex = x => {
    //             const hex = Math.round(x * 255).toString(16);
    //             return hex.length === 1 ? '0' + hex : hex;
    //         };
    
    //         return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    //     };
    
    //     const baseHSL = hexToHsl(baseHex);
    //     const shades = [];
    
    //     const step = 0.5 / numberOfShades; // go from base down to darker
    //     for (let i = 0; i < numberOfShades; i++) {
    //         const adjustedL = Math.max(0.1, baseHSL.l - (i * step));
    //         shades.push(hslToHex({ h: baseHSL.h, s: baseHSL.s, l: adjustedL }));
    //     }
    
    //     return shades;
    // }

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


class SelectedCountryPage {
    constructor() {
        this.navigation = null;
        this.currentCountry = null;
        this.allCountries = [];

        // Cache DOM elements
        this.countryOverview = document.getElementById('countryOverview');
        this.quickFacts = document.getElementById('quickFacts').querySelector('.facts-grid');
        this.populationChart = document.getElementById('populationChart');
        this.languageChart = document.getElementById('languageChart');
        // this.regionalChart = document.getElementById('regionalChart');
        this.areaChart = document.getElementById('areaChart');
        this.mapView = document.getElementById('mapView');
        this.neighbors = document.getElementById('neighbors').querySelector('.neighbors-grid');

        // Cache templates
        this.overviewTemplate = document.getElementById('country-overview-template');
        this.factTemplate = document.getElementById('fact-item-template');
        this.neighborTemplate = document.getElementById('neighbor-template');
        this.errorTemplate = document.getElementById('error-template');
        this.loadingTemplate = document.getElementById('loading-template');

        // Bind methods
        this.displayCountryInfo = this.displayCountryInfo.bind(this);
        this.createVisualizations = this.createVisualizations.bind(this);
        this.handleError = this.handleError.bind(this);
    }

    /**
     * Initialize the selected country page
     */
    async initialize() {
        try {
            // Initialize navigation
            this.navigation = new Navigation();

            // Get country from URL
            const countryName = this.getCountryFromURL();
            if (!countryName) {
                throw new Error('No country specified');
            }

            // Fetch all countries (needed for comparisons)
            this.allCountries = await countryService.getAllCountries();

            // Find selected country
            this.currentCountry = this.allCountries.find(
                c => c.name.common.toLowerCase() === countryName.toLowerCase()
            );

            if (!this.currentCountry) {
                throw new Error('Country not found');
            }

            // Display country information
            await Promise.all([
                this.displayCountryInfo(),
                this.createVisualizations(),
                this.displayNeighbors()
            ]);

        } catch (error) {
            console.error('Error initializing selected country page:', error);
            this.handleError(error);
        }
    }

    /**
     * Get country name from URL parameters
     * @returns {string|null} Country name
     */
    getCountryFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('country');
    }

    /**
     * Display country information
     */
    async displayCountryInfo() {
        // Create overview
        const overview = this.overviewTemplate.content.cloneNode(true);
        const country = this.currentCountry;

        // Update flag and basic info
        overview.querySelector('.country-flag').src = country.flags.svg;
        overview.querySelector('.country-flag').alt = `Flag of ${country.name.common}`;
        overview.querySelector('.country-name').textContent = country.name.common;
        overview.querySelector('.capital').textContent = `Capital: ${country.capital?.[0] || 'N/A'}`;
        overview.querySelector('.region').textContent = `${country.region} (${country.subregion || 'N/A'})`;

        // Display overview
        this.countryOverview.innerHTML = '';
        this.countryOverview.appendChild(overview);

        // Create quick facts
        const facts = [
            { label: 'Population', value: dataProcessing.formatNumber(country.population) },
            { label: 'Area', value: country.area ? `${dataProcessing.formatNumber(country.area)} km²` : 'N/A' },
            { label: 'Languages', value: country.languages ? Object.values(country.languages).join(', ') : 'N/A' },
            { label: 'Currencies', value: country.currencies ? 
                Object.values(country.currencies).map(c => `${c.name} (${c.symbol || 'N/A'})`).join(', ') : 'N/A' },
            { label: 'Time Zones', value: country.timezones?.join(', ') || 'N/A' },
            { label: 'Driving Side', value: country.car?.side?.charAt(0).toUpperCase() + country.car?.side?.slice(1) || 'N/A' },
            { label: 'Status', value: country.independent ? 'Independent' : 'Dependent' }
        ];

        // Display facts
        this.quickFacts.innerHTML = '';
        facts.forEach(fact => {
            const factElement = this.factTemplate.content.cloneNode(true);
            factElement.querySelector('.fact-label').textContent = fact.label;
            factElement.querySelector('.fact-value').textContent = fact.value;
            this.quickFacts.appendChild(factElement);
        });

        // Display map
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
     * Create visualizations using Method 2 API approach
     */
    async createVisualizations() {
        try {
            await Promise.all([
                this.createPopulationChart(),
                this.createLanguageChart(),
                // this.createRegionalChart(),
                this.createAreaChart()
            ]);
        } catch (error) {
            console.error('Error creating visualizations:', error);
            this.handleError(error);
        }
    }

    /**
     * Create population comparison chart
     */
    async createPopulationChart() {
        // // Get regional context
        // const regionalCountries = this.allCountries
        //     .filter(c => c.region === this.currentCountry.region)
        //     .sort((a, b) => b.population - a.population)
        //     .slice(0, 5);

        // Get regional countries and sort them
        const regionalCountries = this.allCountries
        .filter(c => c.region === this.currentCountry.region)
        .sort((a, b) => b.population - a.population);

        // Find the index of the current country
        const index = regionalCountries.findIndex(c => c.name.common === this.currentCountry.name.common);

        // Select two before and two after (with boundaries checked)
        const start = Math.max(index - 2, 0);
        const end = Math.min(index + 3, regionalCountries.length); // +3 because slice end is exclusive

        const selectedCountries = regionalCountries.slice(start, end);
        const selectedCountryName = this.currentCountry.name.common;
        
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


        // const backgroundColors = selectedCountries.map(c => {
        //     if (c.name.common === selectedCountryName) {
        //         return '#6F88EB'; // Highlight color
        //     } else {
        //         return '#A5CCB8'; // Default color
        //     }
        // });

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
                    // backgroundColor: regionalCountries.map(c => 
                    //     c.name.common === this.currentCountry.name.common ? '#ff6384' : '#36a2eb'
                    // )
                }]
            },
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: `Population Comparison - ${this.currentCountry.region}`,
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
                // legend: {
                //     labels: {
                //         font: {
                //             family: 'Roboto, sans-serif',  // Use the correct font family
                //             size: 14,                     // Set font size
                //             weight: 'normal'              // Optional: Set font weight if you want (e.g., 'bold', 'normal')
                //         },
                //         color: COLORS.primaryLight  // Set the color to the desired color (using primaryLight)
                //     }
                // },
                // legend: {
                //     display: true,
                //     labels: {
                //         fontSize: 18,
                //         fontFamily: 'Roboto, sans-serif'
                //     }
                // },
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
                            // minRotation: 0, // force no rotation
                            // maxRotation: 0, // force no rotation
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
    async createLanguageChart() {

        if (!this.currentCountry.languages) {
            this.languageChart.innerHTML = '<p>No official languages</p>';
            return;
        }

        const languages = Object.values(this.currentCountry.languages);
        const languageStats = {};

        this.allCountries.forEach(country => {
            if (country.languages) {
                Object.values(country.languages).forEach(lang => {
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
     * Create regional context chart
     */
    // async createRegionalChart() {
    //     const metrics = ['population', 'area'];
    //     const regionalData = this.allCountries
    //         .filter(c => c.region === this.currentCountry.region)
    //         .map(c => ({
    //             name: c.name.common,
    //             population: c.population || 0,
    //             area: c.area || 0
    //         }));

    //     const averages = metrics.reduce((acc, metric) => {
    //         acc[metric] = regionalData.reduce((sum, c) => sum + c[metric], 0) / regionalData.length;
    //         return acc;
    //     }, {});

    //     const chartConfig = {
    //         type: 'radar',
    //         data: {
    //             labels: metrics.map(m => m.charAt(0).toUpperCase() + m.slice(1)),
    //             datasets: [{
    //                 label: this.currentCountry.name.common,
    //                 data: metrics.map(m => this.currentCountry[m] || 0),
    //                 backgroundColor: 'rgba(255, 99, 132, 0.2)',
    //                 borderColor: '#ff6384'
    //             }, {
    //                 label: `${this.currentCountry.region} Average`,
    //                 data: metrics.map(m => averages[m]),
    //                 backgroundColor: 'rgba(54, 162, 235, 0.2)',
    //                 borderColor: '#36a2eb'
    //             }]
    //         },
    //         options: {
    //             plugins: {
    //                 title: {
    //                     display: true,
    //                     text: 'Regional Context',
    //                     font: { size: 16, weight: 'bold' }
    //                 }
    //             }
    //         }
    //     };

    //     const chartUrl = chartService.createChartUrl(chartConfig);
    //     chartUtils.displayChart('regionalChart', chartUrl, 'Regional context');
    // }
    
    // /**
    //  * Create currency usage chart
    //  */
    // async createCurrencyChart() {
    //     if (!this.currentCountry.currencies) return;

    //     const currencies = Object.keys(this.currentCountry.currencies);
    //     const currencyStats = {};

    //     this.allCountries.forEach(country => {
    //         if (country.currencies) {
    //             Object.keys(country.currencies).forEach(curr => {
    //                 if (currencies.includes(curr)) {
    //                     currencyStats[curr] = (currencyStats[curr] || 0) + 1;
    //                 }
    //             });
    //         }
    //     });

    //     const chartConfig = {
    //         type: 'doughnut',
    //         data: {
    //             labels: Object.keys(currencyStats),
    //             datasets: [{
    //                 data: Object.values(currencyStats),
    //                 backgroundColor: [
    //                     '#ff6384',
    //                     '#36a2eb',
    //                     '#ffcd56'
    //                 ]
    //             }]
    //         },
    //         options: {
    //             plugins: {
    //                 title: {
    //                     display: true,
    //                     text: 'Currency Usage',
    //                     font: { size: 16, weight: 'bold' }
    //                 }
    //             }
    //         }
    //     };

    //     const chartUrl = chartService.createChartUrl(chartConfig);
    //     chartUtils.displayChart('currencyChart', chartUrl, 'Currency usage');
    // }

    /**
     * Create area comparison chart
     */
    /**
     * Create area comparison chart
     */
    /**
     * Create area comparison chart
     */
    async createAreaChart() {
        if (!this.currentCountry) return;

        // Get regional countries and sort them by area
        const regionalCountries = this.allCountries
            .filter(c => c.region === this.currentCountry.region)
            .sort((a, b) => b.area - a.area); // Sorting by area in descending order

        // Find the index of the current country in the sorted array
        const index = regionalCountries.findIndex(c => c.name.common === this.currentCountry.name.common);

        // Select two countries before and two after the current country
        const start = Math.max(index - 2, 0);
        const end = Math.min(index + 3, regionalCountries.length); // +3 because slice end is exclusive

        // Select the countries to display
        const selectedCountries = regionalCountries.slice(start, end);
        const selectedCountryName = this.currentCountry.name.common;

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

        // Create the chart configuration for horizontal bars
        const chartConfig = {
            type: 'bar',
            data: {
                labels: selectedCountries.map(c => c.name.common), // Country names as labels
                datasets: [{
                    label: 'Country Area (in km²)', // Label for the dataset
                    data: selectedCountries.map(c => c.area), // Data for country area
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: borderWidths,
                    borderRadius: 8
                }]
            },
            options: {
                indexAxis: 'y', // key change to make it horizontal
                plugins: {
                    title: {
                        display: true,
                        text: `Area Comparison - ${this.currentCountry.region} (km²)`, // Dynamic chart title
                        font: {size: 24, family: 'Roboto, sans-serif', weight: 600},
                        color: COLORS.textPrimary,
                        padding: {bottom: 24}
                    },
                    legend: {
                        display: false,
                        labels: {
                            font: {size: 14, family: 'Roboto, sans-serif'},
                        }
                    },
                },
                scales: {
                    x: {
                        beginAtZero: true, // Ensure the x-axis starts at zero
                        ticks: {
                            // minRotation: 0, // force no rotation
                            // maxRotation: 0, // force no rotation
                            color: COLORS.textSecondary,
                            font: {size: 14, family: 'Roboto, sans-serif'}
                        }
                    },
                    y: {
                        ticks: {
                            callback: value => dataProcessing.formatNumber(value),
                            color: COLORS.textSecondary,
                            font: {size: 14, family: 'Roboto, sans-serif'}
                        }
                    }
                }
            }
        };

        // Generate the chart URL and display it
        const chartUrl = chartService.createChartUrl(chartConfig);
        chartUtils.displayChart('areaChart', chartUrl, 'Area comparison');
    }


    /**
     * Display neighboring countries
     */
    async displayNeighbors() {
        if (!this.currentCountry.borders?.length) {
            this.neighbors.innerHTML = '<p>No neighboring countries</p>';
            return;
        }

        const neighboringCountries = this.allCountries.filter(
            country => this.currentCountry.borders.includes(country.cca3)
        );

        this.neighbors.innerHTML = '';
        neighboringCountries.forEach(country => {
            const neighborElement = this.neighborTemplate.content.cloneNode(true);
            const link = neighborElement.querySelector('a');
            
            link.href = `?country=${encodeURIComponent(country.name.common)}`;
            link.querySelector('img').src = country.flags.svg;
            link.querySelector('img').alt = `Flag of ${country.name.common}`;
            link.querySelector('.neighbor-name').textContent = country.name.common;

            this.neighbors.appendChild(neighborElement);
        });
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
            this.countryOverview.innerHTML = '';
            this.countryOverview.appendChild(errorElement);
        }
    }
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const selectedPage = new SelectedCountryPage();
    selectedPage.initialize();
});