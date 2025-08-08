// Podcastinator App - Progress Manager
class ProgressManager {
    constructor() {
        this.progressIntervals = {};
        this.progressBars = {};
    }
    
    /**
     * Initialize a progress bar
     * @param {string} containerId - ID of container element
     * @param {HTMLElement} progressBarElement - Progress bar fill element
     */
    initProgressBar(containerId, progressBarElement) {
    
        // Store reference to the progress bar
        this.progressBars[containerId] = progressBarElement;
        
        // Ensure container is hidden initially
        const container = document.getElementById(containerId);
        if (container) {
            container.style.display = 'none';
        }
        
        // Reset progress
        if (progressBarElement) {
            progressBarElement.style.width = '0%';
        }
    }
    
    /**
     * Update progress percentage
     * @param {string} containerId - ID of container element
     * @param {number} percentage - Progress percentage (0-100)
     */
    updateProgress(containerId, percentage) {
    
        // Ensure container is visible
        const container = document.getElementById(containerId);
        if (container) {
            container.style.display = 'flex';
        }
        
        // Update progress bar
        const progressBar = this.progressBars[containerId] || document.querySelector(`#${containerId} .progress-bar .progress-fill`);
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
    }
    
    /**
     * Reset progress to 0%
     * @param {string} containerId - ID of container element 
     */
    resetProgress(containerId) {
    
        const progressBar = this.progressBars[containerId] || document.querySelector(`#${containerId} .progress-bar .progress-fill`);
        if (progressBar) {
            progressBar.style.width = '0%';
        }
    }

    /**
     * Show progress indicator for a specific container
     * @param {string} containerId - ID of container element
     */
    showProgress(containerId) {
    
        document.getElementById(containerId).style.display = 'flex';
        // Animate progress bar
        const progressFill = document.querySelector(`#${containerId} .progress-fill`);
        let width = 0;
        
        // Clear any existing interval for this container
        if (this.progressIntervals[containerId]) {
            clearInterval(this.progressIntervals[containerId]);
        }
        
        const self = this;
        this.progressIntervals[containerId] = setInterval(function() {
            width += Math.random() * 15;
            if (width >= 90) {
                width = 90;
                clearInterval(self.progressIntervals[containerId]);
            }
            progressFill.style.width = width + '%';
        }, 200);
    }

    /**
     * Hide progress indicator for a specific container
     * @param {string} containerId - ID of container element
     */
    hideProgress(containerId) {
    
        document.getElementById(containerId).style.display = 'none';
        const progressFill = document.querySelector(`#${containerId} .progress-fill`);
        progressFill.style.width = '100%';
        
        const self = this;
        setTimeout(function() {
            progressFill.style.width = '0%';
        }, 500);
        
        // Clear interval if it exists
        if (this.progressIntervals[containerId]) {
            clearInterval(this.progressIntervals[containerId]);
            delete this.progressIntervals[containerId];
        }
    }
}

export default ProgressManager;
