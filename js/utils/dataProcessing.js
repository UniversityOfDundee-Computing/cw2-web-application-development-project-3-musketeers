/**
 * Data Processing Utilities
 * Common functions for transforming and processing country data
 */

/**
 * Sort items by numeric value in descending order
 * @param {Array} items Array of items to sort
 * @param {string} key Key to sort by
 * @returns {Array} Sorted array
 */
export function sortByNumber(items, key) {
    return [...items].sort((a, b) => b[key] - a[key]);
}

/**
 * Take the top N items from an array
 * @param {Array} items Array of items
 * @param {number} n Number of items to take
 * @returns {Array} Top N items
 */
export function takeTop(items, n = 5) {
    return items.slice(0, n);
}

/**
 * Group items by a key and count occurrences
 * @param {Array} items Array of items
 * @param {Function} keySelector Function to select the key
 * @returns {Object} Map of key to count
 */
export function groupAndCount(items, keySelector) {
    return items.reduce((acc, item) => {
        const key = keySelector(item);
        if (key) {
            acc[key] = (acc[key] || 0) + 1;
        }
        return acc;
    }, {});
}

/**
 * Group items by a key and sum a value
 * @param {Array} items Array of items
 * @param {Function} keySelector Function to select the key
 * @param {Function} valueSelector Function to select the value to sum
 * @returns {Object} Map of key to sum
 */
export function groupAndSum(items, keySelector, valueSelector) {
    return items.reduce((acc, item) => {
        const key = keySelector(item);
        const value = valueSelector(item);
        if (key && !isNaN(value)) {
            acc[key] = (acc[key] || 0) + value;
        }
        return acc;
    }, {});
}

/**
 * Convert an object to arrays of labels and values
 * @param {Object} obj Object to convert
 * @returns {Object} Object with labels and values arrays
 */
export function objectToArrays(obj) {
    const labels = Object.keys(obj);
    const values = Object.values(obj);
    return { labels, values };
}

/**
 * Safely access nested object properties
 * @param {Object} obj Object to access
 * @param {string} path Dot-separated path to property
 * @param {*} defaultValue Default value if path doesn't exist
 * @returns {*} Property value or default
 */
export function getNestedValue(obj, path, defaultValue = undefined) {
    return path.split('.').reduce((curr, key) => 
        curr && curr[key] !== undefined ? curr[key] : defaultValue, obj);
}

/**
 * Format large numbers for display
 * @param {number} num Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(num) {
    return num.toLocaleString('en-US');
}

/**
 * Calculate percentage
 * @param {number} part Part value
 * @param {number} total Total value
 * @returns {number} Percentage with 2 decimal places
 */
export function calculatePercentage(part, total) {
    return ((part / total) * 100).toFixed(2);
}

/**
 * Shuffle an array randomly
 * @param {Array} array Array to shuffle
 * @returns {Array} Shuffled array
 */
export function shuffleArray(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * Generate a chart description based on the chart type and data
 * @param {string} chartType Type of chart
 * @param {Object} data Processed data for the chart
 * @param {Object} options Additional options
 * @returns {Object} Object containing description, analysis, and insights
 */
export function generateChartDescription(chartType, data, options = {}) {
    const descriptionGenerators = {
        'population': generatePopulationDescription,
        'continent': generateContinentDescription,
        'region': generateRegionDescription,
        'currency': generateCurrencyDescription,
        'timezone': generateTimezoneDescription,
        'independence': generateIndependenceDescription,
        'borders': generateBordersDescription,
        'language': generateLanguageDescription
    };
    
    const generator = descriptionGenerators[chartType] || generateDefaultDescription;
    return generator(data, options);
}

/**
 * Generate default chart description
 * @param {Object} data Processed data
 * @param {Object} options Additional options
 * @returns {Object} Description object
 */
function generateDefaultDescription(data, options) {
    return {
        short: 'Data visualization of country statistics',
        full: 'Detailed breakdown of global country statistics',
        insights: [
            'Data shows interesting patterns across countries',
            'Further analysis may reveal additional insights'
        ],
        relatedMetrics: 'Various geographical and demographic factors',
        source: 'REST Countries API'
    };
}

/**
 * Generate population chart description
 * @param {Object} data Processed data
 * @param {Object} options Additional options
 * @returns {Object} Description object
 */
function generatePopulationDescription(data, options) {
    // Calculate total population
    const totalPopulation = data.values.reduce((sum, val) => sum + val, 0);
    const topCountry = data.labels[0];
    const topPopulation = formatNumber(data.values[0]);
    const percentageOfTotal = calculatePercentage(data.values[0], totalPopulation);
    
    return {
        short: `Population breakdown across ${data.labels.length} most populous countries`,
        full: `Population distribution showing the world's most populous nations with a total of ${formatNumber(totalPopulation)} people represented in this chart.`,
        insights: [
            `${topCountry} has the largest population with ${topPopulation} people, representing about ${percentageOfTotal}% of the total shown.`,
            `The top ${Math.min(3, data.labels.length)} countries account for over ${calculatePercentage(data.values.slice(0, 3).reduce((a, b) => a + b, 0), totalPopulation)}% of the population shown.`,
            'Population density varies significantly across different regions of the world.',
            'Urban migration continues to increase globally, affecting population distribution.'
        ],
        relatedMetrics: 'Population density, birth rates, mortality rates, and migration patterns all contribute to these distributions.',
        source: 'United Nations Population Division, REST Countries API'
    };
}

/**
 * Generate continent chart description
 * @param {Object} data Processed data
 * @param {Object} options Additional options
 * @returns {Object} Description object
 */
function generateContinentDescription(data, options) {
    const largestContinent = data.labels[data.values.indexOf(Math.max(...data.values))];
    const smallestContinent = data.labels[data.values.indexOf(Math.min(...data.values))];
    
    return {
        short: `Population distribution by continent`,
        full: `Analysis of continental population patterns showing population density and distribution across all continents.`,
        insights: [
            `${largestContinent} has the largest population among all continents.`,
            `${smallestContinent} has the smallest population among all continents.`,
            `Population growth rates vary significantly across continents.`,
            `Urbanization trends differ between continents, affecting population distribution.`
        ],
        relatedMetrics: 'Urbanization rates, age distribution, and migration patterns vary significantly between continents.',
        source: 'UN Population Division, REST Countries API'
    };
}

/**
 * Generate region chart description
 * @param {Object} data Processed data
 * @param {Object} options Additional options
 * @returns {Object} Description object
 */
function generateRegionDescription(data, options) {
    const regionCount = data.labels.length;
    const mostCountriesRegion = data.labels[data.values.indexOf(Math.max(...data.values))];
    const fewestCountriesRegion = data.labels[data.values.indexOf(Math.min(...data.values))];
    
    return {
        short: `Countries by geographical region`,
        full: `Breakdown of UN-defined geographical regions showing distribution of ${data.values.reduce((a, b) => a + b, 0)} countries across ${regionCount} regions.`,
        insights: [
            `${mostCountriesRegion} has the most countries with ${Math.max(...data.values)} sovereign states.`,
            `${fewestCountriesRegion} has the fewest countries with ${Math.min(...data.values)} sovereign states.`,
            `Regional organizations and trade blocs often follow these geographical divisions.`,
            `Cultural and historical factors have influenced the current regional distribution.`
        ],
        relatedMetrics: 'Regional cooperation agreements, trade blocs, and cultural similarities affect migration and economic patterns.',
        source: 'United Nations, REST Countries API'
    };
}

/**
 * Generate currency chart description
 * @param {Object} data Processed data
 * @param {Object} options Additional options
 * @returns {Object} Description object
 */
function generateCurrencyDescription(data, options) {
    const topCurrency = data.labels[0];
    const countriesUsingTop = data.values[0];
    
    return {
        short: `Most common currencies worldwide`,
        full: `Analysis of global currency usage including adoption rates and distribution across countries.`,
        insights: [
            `The ${topCurrency} is used by ${countriesUsingTop} countries, making it the most widely adopted currency.`,
            `Regional currency unions are becoming more common in certain areas.`,
            `Several countries use multiple currencies or peg their currency to major world currencies.`,
            `Digital currencies are gaining adoption in various countries.`
        ],
        relatedMetrics: 'Exchange rates, inflation rates, and monetary policies impact currency usage and stability.',
        source: 'IMF, World Bank, REST Countries API'
    };
}

/**
 * Generate timezone chart description
 * @param {Object} data Processed data
 * @param {Object} options Additional options
 * @returns {Object} Description object
 */
function generateTimezoneDescription(data, options) {
    const mostCommonTimezone = data.labels[0];
    const countriesInMostCommon = data.values[0];
    
    return {
        short: `Countries by timezone zone`,
        full: `Global timezone distribution highlighting business hour overlaps and impact on international operations.`,
        insights: [
            `${mostCommonTimezone} is the most common timezone with ${countriesInMostCommon} countries.`,
            `Some countries span multiple timezones, particularly larger nations.`,
            `Timezone differences impact international business and communication.`,
            `Daylight Saving Time adoption varies globally, affecting effective timezone offsets.`
        ],
        relatedMetrics: 'Time zone offsets, DST observance, and global business hour overlaps are key factors in international operations.',
        source: 'IANA Time Zone Database, REST Countries API'
    };
}

/**
 * Generate independence chart description
 * @param {Object} data Processed data
 * @param {Object} options Additional options
 * @returns {Object} Description object
 */
function generateIndependenceDescription(data, options) {
    const independent = data.values[data.labels.indexOf('Independent')];
    const dependent = data.values[data.labels.indexOf('Dependent')];
    const total = independent + dependent;
    const independentPercentage = calculatePercentage(independent, total);
    
    return {
        short: `Independent vs. Dependent territories`,
        full: `Sovereignty status analysis including independent states and dependent territories worldwide.`,
        insights: [
            `${independent} independent sovereign states represent ${independentPercentage}% of all territories.`,
            `${dependent} territories remain dependent on other countries for governance.`,
            `Independence movements continue in various regions seeking self-determination.`,
            `Governance structures vary widely among independent countries.`
        ],
        relatedMetrics: 'Independence declarations, governance structures, and international recognition are key factors in sovereignty status.',
        source: 'United Nations, CIA World Factbook, REST Countries API'
    };
}

/**
 * Generate borders chart description
 * @param {Object} data Processed data
 * @param {Object} options Additional options
 * @returns {Object} Description object
 */
function generateBordersDescription(data, options) {
    const topCountry = data.labels[0];
    const mostBorders = data.values[0];
    
    return {
        short: `Analysis of country borders`,
        full: `Border statistics showing countries with most neighbors, border lengths, and cross-border cooperation.`,
        insights: [
            `${topCountry} borders ${mostBorders} countries, the highest number in the world.`,
            `Island nations have no land borders with other countries.`,
            `Several countries have disputed borders, leading to ongoing conflicts.`,
            `Cross-border cooperation agreements exist to facilitate trade and security.`
        ],
        relatedMetrics: 'Border lengths, neighboring countries, and cross-border cooperation agreements impact international relations.',
        source: 'CIA World Factbook, United Nations, REST Countries API'
    };
}

/**
 * Generate language chart description
 * @param {Object} data Processed data
 * @param {Object} options Additional options
 * @returns {Object} Description object
 */
function generateLanguageDescription(data, options) {
    const topLanguage = data.labels[0];
    const countriesUsingTop = data.values[0];
    
    return {
        short: `Most spoken languages globally`,
        full: `Language distribution analysis covering official languages and their global adoption.`,
        insights: [
            `${topLanguage} is an official language in ${countriesUsingTop} countries, making it most widely adopted.`,
            `Many countries have multiple official languages, reflecting cultural diversity.`,
            `Colonial history has influenced language distribution globally.`,
            `Several minority languages are at risk of extinction despite preservation efforts.`
        ],
        relatedMetrics: 'Language diversity, number of speakers, and language preservation efforts are key factors in language distribution.',
        source: 'Ethnologue, UNESCO, REST Countries API'
    };
}