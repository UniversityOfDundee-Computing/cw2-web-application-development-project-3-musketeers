/**
 * Navigation Component
 * Handles site-wide navigation functionality
 */

import { countryService } from "../services/countryService.js";

export class Navigation {
    constructor() {
        // Get navigation elements
        this.countryDropdown = document.getElementById('countrySelectNav');
        this.homeBtn = document.getElementById('homeBtn');
        this.globeBtn = document.getElementById('globeBtn');
        this.selectedCountryName = document.getElementById('selectedCountryName');
        
        // Initialize navigation
        this.initialize();
    }

    /**
     * Initialize navigation functionality
     */
    async initialize() {
        try {
            // Display currently selected country if we're on selected.html
            this.displaySelectedCountry();
            
            // Populate country dropdown if it exists
            if (this.countryDropdown) {
                await this.populateCountryDropdown();
            }
        } catch (error) {
            console.error('Error initializing navigation:', error);
        }
    }

    /**
     * Display the currently selected country name in the dropdown button
     */
    displaySelectedCountry() {
        try {
            if (this.selectedCountryName && window.location.pathname.includes('selected.html')) {
                const params = new URLSearchParams(window.location.search);
                const country = params.get('country');
                if (country) {
                    // Set the selected country name in the button with minimal spacing
                    this.selectedCountryName.textContent = `:${decodeURIComponent(country)}`; // Removed space after colon
                }
            }
        } catch (error) {
            console.error('Error displaying selected country:', error);
        }
    }

    /**
     * Populate the country dropdown with all available countries
     */
    async populateCountryDropdown() {
        try {
            // Get all countries
            const countries = await countryService.getAllCountries();
            
            // Sort countries alphabetically
            countries.sort((a, b) => a.name.common.localeCompare(b.name.common));
            
            // Clear any existing options
            this.countryDropdown.innerHTML = '';
            
            // Add countries to dropdown
            countries.forEach(country => {
                const option = document.createElement('li');
                const link = document.createElement('a');
                link.classList.add('dropdown-item');
                link.href = `selected.html?country=${encodeURIComponent(country.name.common)}`;
                link.textContent = country.name.common;
                // Highlight the currently selected country in the dropdown
                if (this.selectedCountryName && this.selectedCountryName.textContent.includes(country.name.common)) {
                    link.classList.add('active');
                }
                option.appendChild(link);
                this.countryDropdown.appendChild(option);
            });
        } catch (error) {
            console.error('Error populating country dropdown:', error);
            // Add error message to dropdown
            const errorOption = document.createElement('li');
            errorOption.classList.add('dropdown-item', 'text-danger');
            errorOption.textContent = 'Failed to load countries';
            this.countryDropdown.appendChild(errorOption);
        }
    }
}
