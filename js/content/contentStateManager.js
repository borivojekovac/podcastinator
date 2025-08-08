// Podcastinator App - Content State Manager
import NotificationsManager from '../ui/notifications.js';

/**
 * Manages the content generation state and section enabling/disabling
 */
class ContentStateManager {
    constructor(storageManager, sectionManager) {
        this.storageManager = storageManager;
        this.sectionManager = sectionManager;
        this.notifications = new NotificationsManager();
        
        // Define workflow sections by their IDs
        this.sections = {
            credentials: 1,
            document: 2,
            hostCharacter: 3,
            guestCharacter: 4,
            outlineGeneration: 5,
            scriptGeneration: 6,
            audioGeneration: 7
        };
        
        // Load existing state from storage
        const savedState = this.storageManager.load('contentState', {});
        
        // Define app state with default values
        this.state = {
            hasApiKey: savedState.hasApiKey || false,
            hasDocument: savedState.hasDocument || false,
            hasHostCharacter: savedState.hasHostCharacter || false,
            hasGuestCharacter: savedState.hasGuestCharacter || false,
            hasOutline: savedState.hasOutline || false,
            hasScript: savedState.hasScript || false,
            hasAudio: savedState.hasAudio || false,
            ...savedState
        };
    }

    /**
     * Initialize the content state manager
     */
    init() {
    
        // Update sections based on current state
        this.updateSections();
    }
    
    /**
     * Update state value and save to storage
     * @param {string} key - State key to update
     * @param {any} value - New state value
     */
    updateState(key, value) {
    
        if (this.state.hasOwnProperty(key)) {
            const oldValue = this.state[key];
            this.state[key] = value;
            this.saveState();
            this.updateSections();
            
            // Dispatch event for state change so other components can react
            if (oldValue !== value) {
                const event = new CustomEvent('contentStateChanged', {
                    detail: { key, oldValue, newValue: value }
                });
                document.dispatchEvent(event);
                console.log(`Content state changed: ${key} = ${value}`);
            }
        }
    }
    
    /**
     * Save current state to storage
     */
    saveState() {
    
        this.storageManager.save('contentState', this.state);
    }
    
    /**
     * Get current state
     * @returns {Object} - Current application state
     */
    getState() {
    
        return { ...this.state };
    }
    
    /**
     * Update section visibility based on current state
     */
    updateSections() {
    
        // Always enable credentials section
        this.sectionManager.enableSection(this.sections.credentials);
        
        // Enable document section if API key is valid
        if (this.state.hasApiKey) {
            this.sectionManager.enableSection(this.sections.document);
        } else {
            this.sectionManager.disableSectionsAfter(this.sections.credentials);
            return;
        }
        
        // Enable host character section if document is uploaded
        if (this.state.hasDocument) {
            this.sectionManager.enableSection(this.sections.hostCharacter);
        } else {
            this.sectionManager.disableSectionsAfter(this.sections.document);
            return;
        }
        
        // Enable guest character section if host character is complete
        if (this.state.hasHostCharacter) {
            this.sectionManager.enableSection(this.sections.guestCharacter);
        } else {
            this.sectionManager.disableSectionsAfter(this.sections.hostCharacter);
            return;
        }
        
        // Enable outline generation section if guest character is complete
        if (this.state.hasGuestCharacter) {
            this.sectionManager.enableSection(this.sections.outlineGeneration);
        } else {
            this.sectionManager.disableSectionsAfter(this.sections.guestCharacter);
            return;
        }
        
        // Enable script generation section if outline is generated
        if (this.state.hasOutline) {
            this.sectionManager.enableSection(this.sections.scriptGeneration);
        } else {
            this.sectionManager.disableSectionsAfter(this.sections.outlineGeneration);
            return;
        }
        
        // Enable audio generation section if script is generated
        if (this.state.hasScript) {
            this.sectionManager.enableSection(this.sections.audioGeneration);
        } else {
            this.sectionManager.disableSectionsAfter(this.sections.scriptGeneration);
        }
    }
}

export default ContentStateManager;
