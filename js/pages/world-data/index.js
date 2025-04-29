/**
 * World Data Page Module
 * Coordinates the initialization and display of all world data visualizations
 */

import { Navigation } from '../../components/navigation.js';
import { ChartManager } from '../../components/ChartManager.js';
import { PopulationChart } from '../../components/charts/types/PopulationChart.js';
import { ContinentChart } from '../../components/charts/types/ContinentChart.js';
import { RegionChart } from '../../components/charts/types/RegionChart.js';
import { CurrencyChart } from '../../components/charts/types/CurrencyChart.js';
import { TimezoneChart } from '../../components/charts/types/TimezoneChart.js';
import { BordersChart } from '../../components/charts/types/BordersChart.js';
import { IndependenceChart } from '../../components/charts/types/IndependenceChart.js';
import { LanguageChart } from '../../components/charts/types/LanguageChart.js';

class WorldDataPage {
    constructor() {
        this.charts = new Map();
        this.navigation = null;
        this.chartManager = null;
        this.isInitialized = false;

        // Bind methods
        this.handleError = this.handleError.bind(this);
    }

    /**
     * Initialize the world data page
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Initialize navigation
            this.navigation = new Navigation();

            // Initialize all charts
            await this.initializeCharts();
            
            // Initialize chart manager after charts are loaded
            this.chartManager = new ChartManager();

            this.isInitialized = true;
        } catch (error) {
            console.error('Error initializing world data page:', error);
            this.handleError(error);
        }
    }

    /**
     * Initialize all chart components
     */
    async initializeCharts() {
        const chartConfigs = [
            {
                id: 'chartContainer',
                type: PopulationChart,
                options: { title: 'Top 5 Most Populous Countries' }
            },
            {
                id: 'chartContainer2',
                type: ContinentChart,
                options: { title: 'World Population by Continent' }
            },
            {
                id: 'chartContainer3',
                type: RegionChart,
                options: { title: 'Number of Countries per Region' }
            },
            {
                id: 'chartContainer4',
                type: CurrencyChart,
                options: { title: 'Top 5 Most Used Currencies' }
            },
            {
                id: 'chartContainer5',
                type: TimezoneChart,
                options: { title: 'Countries per Timezone (Top 5)' }
            },
            {
                id: 'chartContainer6',
                type: IndependenceChart,
                options: { title: 'Independent vs Non-Independent States' }
            },
            {
                id: 'chartContainer7',
                type: BordersChart,
                options: { title: 'Top 5 Countries with Most Borders' }
            },
            {
                id: 'chartContainer8',
                type: LanguageChart,
                options: { title: 'Most Common Official Languages' }
            }
            // Removed chartContainer9 so we don't overwrite the World Stats at a Glance section
            // This allows the inline script in the HTML to handle the stats display instead
        ];

        // Initialize each chart
        for (const config of chartConfigs) {
            try {
                const chart = new config.type(config.id, config.options);
                this.charts.set(config.id, chart);
                await chart.initialize();
            } catch (error) {
                console.error(`Error initializing chart ${config.id}:`, error);
                this.handleError(error, config.id);
            }
        }
    }

    /**
     * Handle errors in chart creation
     * @param {Error} error - The error that occurred
     * @param {string} [chartId] - ID of the chart that failed (if applicable)
     */
    handleError(error, chartId = null) {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.innerHTML = `
            <h3>Error Loading ${chartId ? 'Chart' : 'Charts'}</h3>
            <p>${error.message || 'There was a problem loading the visualizations.'}</p>
            <button onclick="location.reload()">Retry</button>
        `;

        if (chartId) {
            const container = document.getElementById(chartId);
            if (container) {
                container.innerHTML = '';
                container.appendChild(errorMessage);
            }
        } else {
            const container = document.querySelector('.container');
            if (container) {
                container.insertBefore(errorMessage, container.firstChild);
            }
        }
    }
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const worldDataPage = new WorldDataPage();
    worldDataPage.initialize();
});