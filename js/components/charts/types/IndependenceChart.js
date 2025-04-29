/**
 * Independence Status Chart Component
 * Extends BaseChart to visualize independent vs non-independent countries
 */

import { BaseChart } from '../BaseChart.js';
import * as dataProcessing from '../../../utils/dataProcessing.js';
import { chartService } from '../../../services/chartService.js';
import * as chartUtils from '../../../utils/chartUtils.js';

export class IndependenceChart extends BaseChart {
    /**
     * Create a new IndependenceChart instance
     * @param {string} containerId - The ID of the container element
     * @param {Object} options - Chart configuration options
     */
    constructor(containerId, options = {}) {
        super(containerId, {
            title: 'Independent vs Non-Independent States',
            type: 'pie',
            chartType: 'independence', // Add chart type identifier for dynamic descriptions
            ...options
        });
    }

    /**
     * Process the raw country data into chart-ready format
     * Implements Method 2's data transformation step
     * @param {Array} data - Raw country data from REST Countries API
     * @returns {Object} Processed data ready for chart creation
     */
    async processData(data) {
        let independentCount = 0;
        let nonIndependentCount = 0;

        // Count independent and non-independent countries
        data.forEach(country => {
            if (country.independent === true) {
                independentCount++;
            } else {
                nonIndependentCount++;
            }
        });

        const labels = ["Independent", "Non-Independent"];
        const values = [independentCount, nonIndependentCount];
        const total = independentCount + nonIndependentCount;

        return {
            labels,
            values,
            formatted: [
                {
                    status: "Independent",
                    count: independentCount,
                    percentage: dataProcessing.calculatePercentage(independentCount, total)
                },
                {
                    status: "Non-Independent",
                    count: nonIndependentCount,
                    percentage: dataProcessing.calculatePercentage(nonIndependentCount, total)
                }
            ]
        };
    }

    /**
     * Create chart configuration for independence data
     * @param {Object} data - Processed independence data
     * @returns {Object} Chart configuration for QuickChart API
     */
    createChartConfig(data) {
        return {
            type: this.options.type,
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.values,
                    backgroundColor: ["#36A2EB", "#FF6384"],
                    borderColor: "#fff",
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: this.options.title,
                        font: {
                            size: 22,
                            weight: 'bold',
                            family: 'Arial'
                        },
                        color: '#222'
                    },
                    legend: {
                        position: "top",
                        labels: {
                            color: "#444",
                            font: {
                                size: 14,
                                weight: "bold"
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const item = data.formatted[context.dataIndex];
                                return [
                                    `${item.status}: ${item.count} countries`,
                                    `Percentage: ${item.percentage}%`
                                ];
                            }
                        }
                    }
                },
                layout: {
                    padding: {
                        top: 20,
                        bottom: 20
                    }
                }
            }
        };
    }

    /**
     * Create independence-specific chart controls
     */
    createChartControls() {
        // Create base controls first
        super.createChartControls();
        
        if (!this.chartControls) return;
        
        // 1. Add time period selector
        const periodGroup = document.createElement('div');
        periodGroup.className = 'form-group me-2 mb-2';
        
        const periodLabel = document.createElement('label');
        periodLabel.className = 'me-2 fw-bold';
        periodLabel.textContent = 'Period:';
        periodGroup.appendChild(periodLabel);
        
        const periodSelect = document.createElement('select');
        periodSelect.className = 'form-select form-select-sm time-period-select';
        periodSelect.setAttribute('aria-label', 'Select time period');
        
        const periodOptions = [
            { value: 'all', text: 'All Time' },
            { value: 'pre1900', text: 'Before 1900' },
            { value: '1900-1945', text: '1900-1945' },
            { value: '1946-1989', text: 'Cold War (1946-1989)' },
            { value: 'post1990', text: 'Modern Era (1990+)' }
        ];
        
        periodOptions.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.text;
            if (option.value === (this.options.period || 'all')) {
                optionEl.selected = true;
            }
            periodSelect.appendChild(optionEl);
        });
        
        periodSelect.addEventListener('change', (e) => {
            this.changeTimePeriod(e.target.value);
        });
        
        periodGroup.appendChild(periodSelect);
        this.chartControls.appendChild(periodGroup);
        
        // 2. Add grouping selector
        const groupGroup = document.createElement('div');
        groupGroup.className = 'form-group me-2 mb-2';
        
        const groupLabel = document.createElement('label');
        groupLabel.className = 'me-2 fw-bold';
        groupLabel.textContent = 'Group By:';
        groupGroup.appendChild(groupLabel);
        
        const groupSelect = document.createElement('select');
        groupSelect.className = 'form-select form-select-sm group-select';
        groupSelect.setAttribute('aria-label', 'Select grouping');
        
        const groupOptions = [
            { value: 'status', text: 'Independence Status' },
            { value: 'decade', text: 'Independence Decade' },
            { value: 'region', text: 'Region' }
        ];
        
        groupOptions.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.text;
            if (option.value === (this.options.groupBy || 'status')) {
                optionEl.selected = true;
            }
            groupSelect.appendChild(optionEl);
        });
        
        groupSelect.addEventListener('change', (e) => {
            this.changeGrouping(e.target.value);
        });
        
        groupGroup.appendChild(groupSelect);
        this.chartControls.appendChild(groupGroup);
    }

    // Keep existing methods for changeTimePeriod and changeGrouping
}