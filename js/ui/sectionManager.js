// Podcastinator App - Section Manager
import NotificationsManager from './notifications.js';

class SectionManager {
    constructor(storageManager) {
        this.activeSection = 1;
        this.storageManager = storageManager;
        this.notifications = new NotificationsManager();
        
        // Define all sections and their IDs
        this.sections = [
            { id: 0, element: 'app-header' },
            { id: 1, element: 'credentials-section' },
            { id: 2, element: 'upload-section' },
            { id: 3, element: 'host-section' },
            { id: 4, element: 'guest-section' },
            { id: 5, element: 'outline-section' },
            { id: 6, element: 'script-section' },
            { id: 7, element: 'audio-section' }
        ];
        
        // Load active section from storage
        const savedSection = this.storageManager.load('activeSection', 1);
        if (savedSection) {
            this.activeSection = parseInt(savedSection);
        }
    }

    /**
     * Initialize the section manager
     */
    init() {
    
        this.checkDebugMode();
        this.updateUI();
    }

    /**
     * Get section element ID based on section number
     * @param {number} sectionId - Section number
     * @returns {string} - Section element ID
     */
    getSectionElementId(sectionId) {
    
        const section = this.sections.find(function(s) {
        
            return s.id === sectionId;
        });
        
        return section ? section.element : null;
    }

    /**
     * Enable a specific section by its ID
     * @param {number} sectionId - Section ID to enable
     */
    enableSection(sectionId) {
    
        const elementId = this.getSectionElementId(sectionId);
        if (!elementId) {
            console.error(`Section with ID ${sectionId} not found`);
            return;
        }
        
        const section = document.getElementById(elementId);
        if (section) {
            section.classList.remove('disabled');
            
            // Set as active if it's the highest enabled section
            if (sectionId > this.activeSection) {
                this.setActiveSection(sectionId);
            }
        }
    }
    
    /**
     * Disable a specific section by its ID
     * @param {number} sectionId - Section ID to disable
     */
    disableSection(sectionId) {
    
        const elementId = this.getSectionElementId(sectionId);
        if (!elementId) {
            return;
        }
        
        const section = document.getElementById(elementId);
        if (section) {
            section.classList.add('disabled');
            section.classList.remove('active');
            
            // If this was the active section, find the highest enabled section
            if (sectionId === this.activeSection) {
                const highestEnabled = this.findHighestEnabledSection();
                this.setActiveSection(highestEnabled);
            }
        }
    }
    
    /**
     * Disable all sections after a specific section ID
     * @param {number} sectionId - All sections after this will be disabled
     */
    disableSectionsAfter(sectionId) {
    
        // Find all sections with ID greater than sectionId
        this.sections.forEach(function(section) {
        
            if (section.id > sectionId) {
                this.disableSection(section.id);
            }
        }.bind(this));
        
        // Update active section if needed
        if (this.activeSection > sectionId) {
            this.setActiveSection(sectionId);
        }
    }
    
    /**
     * Set the active section
     * @param {number} sectionId - Section ID to set as active
     */
    setActiveSection(sectionId) {
    
        // Remove active class from current active section
        if (this.activeSection) {
            const currentElementId = this.getSectionElementId(this.activeSection);
            const currentSection = document.getElementById(currentElementId);
            if (currentSection) {
                currentSection.classList.remove('active');
            }
        }
        
        // Set new active section
        const newElementId = this.getSectionElementId(sectionId);
        const newSection = document.getElementById(newElementId);
        if (newSection) {
            newSection.classList.add('active');
            newSection.classList.remove('disabled');
            
            // Dispatch custom event for section activation
            const activationEvent = new CustomEvent('sectionActivated', {
                detail: { sectionId: sectionId, elementId: newElementId },
                bubbles: true
            });
            document.dispatchEvent(activationEvent);
        }
        
        this.activeSection = sectionId;
        this.storageManager.save('activeSection', this.activeSection);
    }
    
    /**
     * Find the highest enabled section
     * @returns {number} - Highest enabled section ID
     */
    findHighestEnabledSection() {
    
        let highestEnabled = 1; // Default to first section
        
        for (let i = this.sections.length - 1; i >= 0; i--) {
            const section = this.sections[i];
            const element = document.getElementById(section.element);
            
            if (element && !element.classList.contains('disabled')) {
                highestEnabled = section.id;
                break;
            }
        }
        
        return highestEnabled;
    }

    /**
     * Update UI based on current active section
     */
    updateUI() {
    
        // Update all sections
        this.sections.forEach(function(section) {
        
            const element = document.getElementById(section.element);
            if (element) {
                // Clear existing state
                element.classList.remove('active');
                
                // Set active state for active section
                if (section.id === this.activeSection) {
                    element.classList.add('active');
                }
            }
        }.bind(this));
    }

    /**
     * Check for debug mode in URL parameters
     */
    checkDebugMode() {
    
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('debug')) {
            console.log('🐛 Debug mode enabled - all sections unlocked');
            
            // Enable all sections
            this.sections.forEach(function(section) {
            
                const element = document.getElementById(section.element);
                if (element) {
                    element.classList.remove('disabled');
                }
            });
            
            this.notifications.showSuccess('Debug mode enabled - all sections unlocked!');
        }
    }

    /**
     * Get active section ID
     * @returns {number} - Active section ID
     */
    getActiveSection() {
    
        return this.activeSection;
    }
    
    /**
     * Check if a section is enabled
     * @param {number} sectionId - Section ID to check
     * @returns {boolean} - True if section is enabled
     */
    isSectionEnabled(sectionId) {
    
        const elementId = this.getSectionElementId(sectionId);
        if (!elementId) {
            return false;
        }
        
        const section = document.getElementById(elementId);
        return section && !section.classList.contains('disabled');
    }
}

export default SectionManager;
