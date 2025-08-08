// Podcastinator App - Section Toggle Manager
import NotificationsManager from './notifications.js';

class SectionToggleManager {
    constructor(storageManager, sectionManager) {
        this.storageManager = storageManager;
        this.sectionManager = sectionManager;
        this.notifications = new NotificationsManager();
        this.toggleStates = {};
        
        // Define default toggle state (all collapsed)
        this.defaultState = {
            'credentials-section': false,
            'upload-section': false,
            'host-section': false,
            'guest-section': false,
            'outline-section': false,
            'script-section': false,
            'audio-section': false
        };
        
        // Load saved toggle states
        this.loadToggleStates();
    }
    
    /**
     * Initialize toggle functionality
     */
    init() {
        this.addToggleButtons();
        this.attachEventListeners();
        this.updateUI();
        
        // Auto-expand active section
        const activeSection = this.sectionManager.getActiveSection();
        if (activeSection) {
            const elementId = this.sectionManager.getSectionElementId(activeSection);
            if (elementId) {
                this.expandSection(elementId);
            }
        }
    }
    
    /**
     * Add toggle buttons to all sections
     */
    addToggleButtons() {
        const sections = document.querySelectorAll('.workflow-section');
        
        sections.forEach(function(section) {
            const h2 = section.querySelector('h2');
            if (h2) {
                // Create toggle button
                const toggleButton = document.createElement('button');
                toggleButton.className = 'section-toggle';
                toggleButton.setAttribute('aria-label', 'Toggle section');
                toggleButton.setAttribute('data-section', section.id);
                
                // Add icon element
                const icon = document.createElement('span');
                icon.className = 'toggle-icon';
                toggleButton.appendChild(icon);
                
                // Add to h2 element
                h2.classList.add('section-header');
                h2.appendChild(toggleButton);
            }
        });
    }
    
    /**
     * Attach event listeners to toggle buttons
     */
    attachEventListeners() {
        const toggleButtons = document.querySelectorAll('.section-toggle');
        
        toggleButtons.forEach(function(button) {
            button.addEventListener('click', this.handleToggleClick.bind(this));
        }.bind(this));
        
        // Also listen for section activation events
        document.addEventListener('sectionActivated', this.handleSectionActivated.bind(this));
    }
    
    /**
     * Handle toggle button click
     * @param {Event} event - Click event
     */
    handleToggleClick(event) {
        event.stopPropagation();
        
        const button = event.currentTarget;
        const sectionId = button.getAttribute('data-section');
        
        this.toggleSection(sectionId);
    }
    
    /**
     * Handle section activated event
     * @param {CustomEvent} event - Section activated event
     */
    handleSectionActivated(event) {
        if (event.detail && event.detail.sectionId) {
            const elementId = this.sectionManager.getSectionElementId(event.detail.sectionId);
            if (elementId) {
                this.expandSection(elementId);
            }
        }
    }
    
    /**
     * Toggle section expanded/collapsed state
     * @param {string} sectionId - Section ID to toggle
     */
    toggleSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (!section) return;
        
        const isCollapsed = section.classList.contains('collapsed');
        
        if (isCollapsed) {
            this.expandSection(sectionId);
        } else {
            this.collapseSection(sectionId);
        }
        
        this.saveToggleStates();
    }
    
    /**
     * Expand a section
     * @param {string} sectionId - Section ID to expand
     */
    expandSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (!section) return;
        
        section.classList.remove('collapsed');
        this.toggleStates[sectionId] = true;
        this.saveToggleStates();
    }
    
    /**
     * Collapse a section
     * @param {string} sectionId - Section ID to collapse
     */
    collapseSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (!section) return;
        
        section.classList.add('collapsed');
        this.toggleStates[sectionId] = false;
        this.saveToggleStates();
    }
    
    /**
     * Load toggle states from storage
     */
    loadToggleStates() {
        const savedStates = this.storageManager.load('sectionToggleStates');
        this.toggleStates = savedStates ? JSON.parse(savedStates) : { ...this.defaultState };
    }
    
    /**
     * Save toggle states to storage
     */
    saveToggleStates() {
        this.storageManager.save('sectionToggleStates', JSON.stringify(this.toggleStates));
    }
    
    /**
     * Update UI based on saved toggle states
     */
    updateUI() {
        // Apply collapsed class based on saved states
        Object.keys(this.toggleStates).forEach(function(sectionId) {
            const section = document.getElementById(sectionId);
            if (section) {
                if (!this.toggleStates[sectionId]) {
                    section.classList.add('collapsed');
                } else {
                    section.classList.remove('collapsed');
                }
            }
        }.bind(this));
    }
}

export default SectionToggleManager;
