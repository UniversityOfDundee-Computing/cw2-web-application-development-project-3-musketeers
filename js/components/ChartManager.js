/**
 * ChartManager
 * Handles chart interactions including hover and click states
 */

export class ChartManager {
    constructor() {
        this.activeChart = null;
        this.chartDescriptions = {
            population: 'Population distribution showing the world\'s most populous nations, urban vs rural splits, and demographic trends from 2000-present.',
            continent: 'Analysis of continental population patterns showing population density, growth rates, and urbanization trends across continents.',
            region: 'Breakdown of UN-defined geographical regions showing economic indicators and cross-region migration patterns.',
            currency: 'Analysis of global currency usage including stability metrics, trade volumes, and digital currency adoption rates.',
            timezone: 'Global timezone distribution highlighting business hour overlaps and impact on international operations.',
            independence: 'Sovereignty status analysis including timeline of independence declarations and types of governance structures.',
            borders: 'Border statistics showing countries with most neighbors, border lengths, and cross-border cooperation.',
            language: 'Language distribution analysis covering native vs non-native speakers and endangered language status.'
        };
        
        this.setupEventListeners();
    }

    /**
     * Set up event listeners for chart interactions
     */
    setupEventListeners() {
        document.querySelectorAll('.chart-container').forEach(chart => {
            // Mouse events
            chart.addEventListener('mouseenter', () => this.handleHover(chart));
            chart.addEventListener('mouseleave', () => this.handleHoverEnd(chart));
            chart.addEventListener('click', () => this.handleClick(chart));

            // Keyboard events for accessibility
            chart.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleClick(chart);
                }
                if (e.key === 'Escape' && this.activeChart === chart) {
                    this.clearExpandedState();
                }
            });
        });

        // Handle clicks outside charts
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.chart-container')) {
                this.clearExpandedState();
            }
        });
    }

    /**
     * Handle chart hover state
     */
    handleHover(chart) {
        if (this.activeChart !== chart) {
            chart.classList.add('hover');
            // Show description overlay if not already expanded
            if (!chart.classList.contains('expanded')) {
                this.showDescription(chart);
            }
        }
    }

    /**
     * Handle end of hover state
     */
    handleHoverEnd(chart) {
        chart.classList.remove('hover');
        // Hide description if not expanded
        if (!chart.classList.contains('expanded')) {
            this.hideDescription(chart);
        }
    }

    /**
     * Handle chart click state
     */
    handleClick(chart) {
        if (this.activeChart === chart) {
            this.clearExpandedState();
        } else {
            this.setExpandedState(chart);
        }
    }

    /**
     * Set expanded state for a chart
     */
    setExpandedState(chart) {
        // Clear previous expanded state if any
        this.clearExpandedState();
        
        // Set new expanded state
        chart.classList.add('expanded');
        chart.setAttribute('aria-expanded', 'true');
        this.activeChart = chart;
        
        // Show description
        this.showDescription(chart);
        
        // Announce for screen readers
        this.announceForScreenReader(chart, 'expanded');
    }

    /**
     * Clear expanded state
     */
    clearExpandedState() {
        if (this.activeChart) {
            this.activeChart.classList.remove('expanded');
            this.activeChart.setAttribute('aria-expanded', 'false');
            this.hideDescription(this.activeChart);
            this.announceForScreenReader(this.activeChart, 'collapsed');
            this.activeChart = null;
        }
    }

    /**
     * Show chart description
     */
    showDescription(chart) {
        const type = this.getChartType(chart);
        const description = this.chartDescriptions[type] || 'Detailed analysis of the data visualization.';
        
        let overlay = chart.querySelector('.chart-detail-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'chart-detail-overlay position-absolute bottom-0 start-0 end-0 bg-white bg-opacity-95 p-3 rounded-bottom border-top opacity-0';
            overlay.innerHTML = `
                <h4 class="h6 mb-2">Detailed Analysis</h4>
                <p class="small mb-0">${description}</p>
            `;
            chart.appendChild(overlay);
            
            // Force reflow to trigger transition
            overlay.offsetHeight;
        }
    }

    /**
     * Hide chart description
     */
    hideDescription(chart) {
        const overlay = chart.querySelector('.chart-detail-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    /**
     * Get chart type from container ID
     */
    getChartType(chart) {
        const id = chart.id.toLowerCase();
        if (id.includes('population')) return 'population';
        if (id.includes('continent')) return 'continent';
        if (id.includes('region')) return 'region';
        if (id.includes('currency')) return 'currency';
        if (id.includes('timezone')) return 'timezone';
        if (id.includes('independence')) return 'independence';
        if (id.includes('borders')) return 'borders';
        if (id.includes('language')) return 'language';
        return 'default';
    }

    /**
     * Announce chart state changes for screen readers
     */
    announceForScreenReader(chart, state) {
        const announcement = document.createElement('div');
        announcement.className = 'visually-hidden';
        announcement.setAttribute('aria-live', 'polite');
        announcement.textContent = `Chart ${state}. ${state === 'expanded' ? 'Press Escape to collapse.' : ''}`;
        
        document.body.appendChild(announcement);
        setTimeout(() => announcement.remove(), 1000);
    }
}