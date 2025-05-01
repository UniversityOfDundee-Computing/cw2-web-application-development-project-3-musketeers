/**
 * Country Service
 * Handles all interactions with the REST Countries API
 * Acts as the first API in our Method 2 implementation
 */

class CountryService {
    constructor() {
        this.baseUrl = "https://restcountries.com/v3.1";
    }

    /**
     * Fetch all countries data
     * @returns {Promise<Array>} Array of country objects
     */
    async getAllCountries() {
        try {
            const response = await fetch(`${this.baseUrl}/all`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error("Error fetching countries:", error);
            throw error;
        }
    }

    /**
     * Fetch a specific country by name
     * @param {string} name - The name of the country
     * @returns {Promise<Object>} Country data
     */
    async getCountryByName(name) {
        try {
            const response = await fetch(`${this.baseUrl}/name/${encodeURIComponent(name)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data[0]; // Returns the first match
        } catch (error) {
            console.error(`Error fetching country ${name}:`, error);
            throw error;
        }
    }

    /**
     * Process country data for population statistics
     * @param {Array} countries - Array of country objects
     * @returns {Object} Processed population data
     */
    processPopulationData(countries) {
        return countries
            .filter(c => c.population)
            .sort((a, b) => b.population - a.population)
            .slice(0, 5)
            .map(c => ({
                name: c.name.common,
                population: c.population
            }));
    }

    /**
     * Process country data for continent statistics
     * @param {Array} countries - Array of country objects
     * @returns {Object} Processed continent data
     */
    processContinentData(countries) {
        const continentMap = {};
        countries.forEach(c => {
            const continent = c.continents?.[0];
            const population = c.population || 0;
            if (continent) {
                continentMap[continent] = (continentMap[continent] || 0) + population;
            }
        });
        return continentMap;
    }

    /**
     * Process country data for language statistics
     * @param {Array} countries - Array of country objects
     * @returns {Object} Processed language data
     */
    processLanguageData(countries) {
        const languageCount = {};
        countries.forEach(country => {
            if (country.languages) {
                Object.values(country.languages).forEach(language => {
                    languageCount[language] = (languageCount[language] || 0) + 1;
                });
            }
        });
        return Object.entries(languageCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .reduce((acc, [lang, count]) => {
                acc[lang] = count;
                return acc;
            }, {});
    }
}

// Export a singleton instance
window.countryService = new CountryService();