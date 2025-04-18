/**
 * Main application entry point
 * 
 * This file initializes the application and coordinates the modules
 * @author GiriPrasad313
 * @date 2025-04-18
 */

// Import modules
import { initUI } from './ui/ui.js';
import { initApiServices } from './api/api-service.js';

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI components
    initUI();
    
    // Initialize API services
    initApiServices();
});
