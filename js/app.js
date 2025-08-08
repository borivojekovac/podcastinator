// Podcastinator App - Main Application
import StorageManager from './utils/storage.js';
import SectionManager from './ui/sectionManager.js';
import SectionToggleManager from './ui/sectionToggleManager.js';
import NotificationsManager from './ui/notifications.js';
import FileUploader from './document/fileUploader.js';
import OpenAIManager from './api/openaiManager.js';
import CharacterManager from './characters/characterManager.js';
import ContentStateManager from './content/contentStateManager.js';
import OutlineGenerator from './content/outlineGenerator.js';
import ScriptGenerator from './content/scriptGenerator.js';
import AudioGenerator from './content/audioGenerator.js';
import UsageCounter from './usage/usageCounter.js';
import FullscreenTextControl from './ui/fullscreenTextControl.js';

class PodcastinatorApp {
    constructor() {
        // Initialize managers
        this.storageManager = new StorageManager();
        this.sectionManager = new SectionManager(this.storageManager);
        this.sectionToggleManager = new SectionToggleManager(this.storageManager, this.sectionManager);
        this.notifications = new NotificationsManager();
        
        // Initialize content state manager - central point for section management
        this.contentStateManager = new ContentStateManager(this.storageManager, this.sectionManager);
        
        // Initialize API and component managers
        this.apiManager = new OpenAIManager(this.storageManager, this.contentStateManager);
        this.fileUploader = new FileUploader(this.storageManager, this.contentStateManager);
        this.characterManager = new CharacterManager(this.storageManager, this.contentStateManager, this.apiManager);
        this.outlineGenerator = new OutlineGenerator(this.storageManager, this.contentStateManager, this.apiManager);
        this.scriptGenerator = new ScriptGenerator(this.storageManager, this.contentStateManager, this.apiManager);
        this.audioGenerator = new AudioGenerator(this.storageManager, this.contentStateManager, this.apiManager);
        
        // Initialize usage counter
        this.usageCounter = new UsageCounter(this.storageManager, this.apiManager);
        
        // Initialize UI enhancements
        this.fullscreenTextControl = null;
        
        // Initialize app
        this.init();
    }

    /**
     * Initialize application
     */
    init() {
    
        // Initialize section manager
        this.sectionManager.init();
        
        // Initialize section toggle manager
        this.sectionToggleManager.init();
        
        // Check for debug mode
        this.sectionManager.checkDebugMode();
        
        // Initialize content state manager first
        this.contentStateManager.init();
        
        // Connect the usage counter to the API manager
        this.apiManager.setUsageCounter(this.usageCounter);
        
        // Initialize all components
        this.apiManager.init();
        this.fileUploader.init();
        this.characterManager.init();
        this.outlineGenerator.init();
        this.scriptGenerator.init();
        this.audioGenerator.init();
        this.usageCounter.init();
        
        // Initialize UI enhancements after all components are ready
        this.initUIEnhancements();
        
        console.log('🎙️ Podcastinator App initialized');
    }

    /**
     * Get application data
     * @returns {Object} - Application data
     */
    getAppData() {
    
        return {
            apiData: this.apiManager.getApiData(),
            documentData: this.fileUploader.getDocumentData(),
            characterData: this.characterManager.getCharacterData(),
            contentState: this.contentStateManager.getState(),
            activeSection: this.sectionManager.getActiveSection()
        };
    }
    
    /**
     * Initialize UI enhancement features
     */
    initUIEnhancements() {
    
        // Initialize fullscreen text controls for textareas
        this.fullscreenTextControl = FullscreenTextControl.initializeAll();
    }
}

export default PodcastinatorApp;
