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