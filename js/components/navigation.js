/**
 * Navigation Component
 * Handles shared navigation functionality across all pages
 */

export class Navigation {
    constructor() {
        this.menuToggle = document.getElementById('menu-toggle');
        this.navLinks = document.getElementById('nav-links');
        this.countrySelect = document.getElementById('countrySelectNav');
        
        this.initializeEventListeners();
        this.populateCountryDropdown();
    }

    /**
     * Initialize event listeners for navigation
     */
    initializeEventListeners() {
        // Mobile menu toggle
        if (this.menuToggle && this.navLinks) {
            this.menuToggle.addEventListener('click', () => {
                this.navLinks.classList.toggle('show');
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('nav') && this.navLinks.classList.contains('show')) {
                    this.navLinks.classList.remove('show');
                }
            });
        }

        // Country selection change
        if (this.countrySelect) {
            this.countrySelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.handleCountrySelection(e.target.value);
                }
            });
        }

        // Handle back/forward browser navigation
        window.addEventListener('popstate', () => {
            this.updateActiveNavLink();
        });

        // Update active nav link on page load
        this.updateActiveNavLink();
    }

    /**
     * Populate country dropdown with data from REST Countries API
     */
    async populateCountryDropdown() {
        if (!this.countrySelect) return;

        try {
            const response = await fetch('https://restcountries.com/v3.1/all');
            const countries = await response.json();

            // Sort countries alphabetically
            countries.sort((a, b) => a.name.common.localeCompare(b.name.common));

            // Clear existing options except the first one
            while (this.countrySelect.options.length > 1) {
                this.countrySelect.remove(1);
            }

            // Add country options
            countries.forEach(country => {
                const option = document.createElement('option');
                option.value = country.name.common;
                option.textContent = country.name.common;
                this.countrySelect.appendChild(option);
            });

            // Set selected country from URL if present
            const urlParams = new URLSearchParams(window.location.search);
            const countryParam = urlParams.get('country');
            if (countryParam) {
                this.countrySelect.value = decodeURIComponent(countryParam);
            }

        } catch (error) {
            console.error('Error populating country dropdown:', error);
            this.countrySelect.innerHTML = '<option value="">Error loading countries</option>';
        }
    }

    /**
     * Handle country selection from dropdown
     * @param {string} countryName Selected country name
     */
    handleCountrySelection(countryName) {
        window.location.href = `../pages/selected.html?country=${encodeURIComponent(countryName)}`;
    }

    /**
     * Update active state of navigation links based on current page
     */
    updateActiveNavLink() {
        const currentPage = window.location.pathname;
        const navLinks = document.querySelectorAll('nav a');

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').includes(currentPage)) {
                link.classList.add('active');
            }
        });
    }

    /**
     * Show loading state in country dropdown
     */
    showDropdownLoading() {
        if (this.countrySelect) {
            this.countrySelect.disabled = true;
            this.countrySelect.innerHTML = '<option value="">Loading countries...</option>';
        }
    }

    /**
     * Show error state in country dropdown
     * @param {string} error Error message
     */
    showDropdownError(error) {
        if (this.countrySelect) {
            this.countrySelect.disabled = true;
            this.countrySelect.innerHTML = `<option value="">Error: ${error}</option>`;
        }
    }
}
