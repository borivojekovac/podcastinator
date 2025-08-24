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
import ConfigManager from './utils/configManager.js';

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
        this.configManager = new ConfigManager(
            this.storageManager,
            this.contentStateManager,
            this.apiManager,
            this.fileUploader,
            this.characterManager,
            this.outlineGenerator,
            this.scriptGenerator,
            this.audioGenerator
        );
        
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

        // Setup Save/Load configuration buttons
        this.setupConfigButtons();
        
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

    /**
     * Setup Save/Load configuration buttons
     */
    setupConfigButtons() {
    
        const saveBtn = document.getElementById('save-config');
        const loadBtn = document.getElementById('load-config');
        const fileInput = document.getElementById('config-file-input');
        const self = this;

        if (saveBtn) {
            saveBtn.addEventListener('click', function onSaveClick() {
                self.handleSaveConfig();
            });
        }

        if (loadBtn && fileInput) {
            loadBtn.addEventListener('click', function onLoadClick() {
                fileInput.value = '';
                fileInput.click();
            });

            fileInput.addEventListener('change', function onFileChange(e) {
                if (e.target.files && e.target.files[0]) {
                    self.handleLoadConfig(e.target.files[0]);
                }
            });
        }
    }

    /**
     * Handle Save configuration
     */
    async handleSaveConfig() {
    
        try {
            const filter = this.getConfigSectionsFilter();
            await this.configManager.exportConfig(filter);
        } catch (e) {
            console.error('Failed to export configuration:', e);
            this.notifications.showError('Failed to save configuration.');
        }
    }

    /**
     * Handle Load configuration
     * @param {File} file - JSON configuration file
     */
    async handleLoadConfig(file) {
    
        try {
            const filter = this.getConfigSectionsFilter();
            await this.configManager.importConfigFile(file, filter);
            this.notifications.showSuccess('Configuration loaded.');
        } catch (e) {
            console.error('Failed to load configuration:', e);
            this.notifications.showError('Failed to load configuration.');
        }
    }

    /**
     * Collect configuration section filter from checkboxes
     * @returns {Object} flags per section
     */
    getConfigSectionsFilter() {
    
        function isChecked(id) {
            const el = document.getElementById(id);
            return !!(el && el.checked);
        }
        return {
            ai: isChecked('cfg-ai'),
            contents: isChecked('cfg-contents'),
            host: isChecked('cfg-host'),
            guest: isChecked('cfg-guest'),
            outline: isChecked('cfg-outline'),
            script: isChecked('cfg-script'),
            audio: isChecked('cfg-audio')
        };
    }
}

export default PodcastinatorApp;
