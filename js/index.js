// Podcastinator App - Entry Point
import PodcastinatorApp from './app.js';

/**
 * Initialize the application when the DOM is fully loaded
 */
function initApp() {

    window.app = new PodcastinatorApp();
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
