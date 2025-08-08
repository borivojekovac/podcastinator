// Podcastinator App - File Uploader
import NotificationsManager from '../ui/notifications.js';

class FileUploader {
    constructor(storageManager, contentStateManager) {
        this.storageManager = storageManager;
        this.contentStateManager = contentStateManager;
        this.notifications = new NotificationsManager();
        this.data = {
            document: this.storageManager.load('data', {})?.document || null
        };
    }

    /**
     * Initialize file uploader
     */
    init() {
    
        this.attachUploadAreaEventListeners();
        this.initPodcastFocusListener();
        if (this.data.document) {
            this.updateDocumentPreview();
        }
    }
    
    /**
     * Initialize podcast focus listener
     */
    initPodcastFocusListener() {
    
        const podcastFocusInput = document.getElementById('podcast-focus');
        
        // Load saved podcast focus from storage if available
        const outlineData = this.storageManager.load('outlineData', {});
        if (podcastFocusInput && outlineData && outlineData.podcastFocus) {
            podcastFocusInput.value = outlineData.podcastFocus;
        }
        
        // Add listener for podcast focus changes
        if (podcastFocusInput) {
            // Use input event for real-time updates
            podcastFocusInput.addEventListener('input', this.handlePodcastFocusChange.bind(this));
            
            // Also listen for blur event to ensure we capture all changes
            podcastFocusInput.addEventListener('blur', this.handlePodcastFocusChange.bind(this));
        }
    }
    
    /**
     * Handle podcast focus input changes
     */
    handlePodcastFocusChange() {
    
        const podcastFocusInput = document.getElementById('podcast-focus');
        if (!podcastFocusInput) return;
        
        // Get current focus value
        const podcastFocus = podcastFocusInput.value.trim();
        
        // Save to outlineData storage
        const outlineData = this.storageManager.load('outlineData', {});
        outlineData.podcastFocus = podcastFocus;
        this.storageManager.save('outlineData', outlineData);
    }

    /**
     * Handle file upload
     * @param {File} file - File object to upload
     */
    handleFileUpload(file) {
    
        if (!file) {
            return;
        }

        // Check file extension
        const fileExtension = file.name.split('.').pop().toLowerCase();
        const validExtensions = ['txt', 'md', 'markdown'];
        const validTypes = ['text/plain', 'text/markdown'];
        
        if (!validExtensions.includes(fileExtension) && !validTypes.includes(file.type)) {
            this.notifications.showError('Please upload a plain text (.txt) or Markdown (.md) file');
            return;
        }
        
        // Warn about large files
        const maxSizeMB = 25; // OpenAI's effective limit for document processing
        const fileSizeMB = file.size / (1024 * 1024);
        
        if (fileSizeMB > maxSizeMB) {
            this.notifications.showError(`Warning: File is ${Math.round(fileSizeMB)}MB which exceeds OpenAI's recommended ${maxSizeMB}MB limit. Processing may be incomplete.`);
            // Continue anyway - we'll let the user decide if they want to try
        }

        // Show loading state by toggling CSS classes
        this.showUploadLoadingState(file.name);

        // Process the file
        this.readFile(file);
    }
    
    /**
     * Show loading state for file upload
     * @param {string} fileName - Name of file being uploaded
     */
    showUploadLoadingState(fileName) {
    
        // Hide upload placeholder
        document.getElementById('upload-placeholder').classList.add('hidden');
        document.getElementById('document-preview').classList.add('hidden');
        
        // Show loading state
        const loadingElement = document.getElementById('upload-loading');
        const loadingText = document.getElementById('upload-loading-text');
        
        loadingElement.classList.remove('hidden');
        if (loadingText) {
            loadingText.textContent = `Processing ${fileName}...`;
        }
    }
    
    /**
     * Read file content
     * @param {File} file - File to read
     */
    readFile(file) {
    
        const reader = new FileReader();
        
        // Use named function instead of arrow function
        const self = this;
        reader.onload = function(event) {
            self.processFileContent(file, event.target.result);
        };
        
        reader.onerror = function() {
            self.notifications.showError('Error reading file. Please try again.');
            self.resetUploadArea();
        };
        
        // Read as text (not base64)
        reader.readAsText(file);
    }
    
    /**
     * Process file content after reading
     * @param {File} file - File object
     * @param {string} content - File content as plain text
     */
    processFileContent(file, content) {
    
        // Store file data - now with direct text content, not base64
        this.data.document = {
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified,
            content: content, // Plain text content, no need to decode
            isPlainText: true // Flag to indicate this is plain text
        };
        
        // Update UI
        this.updateDocumentPreview();
        
        // Get existing data and only update the document portion
        const existingData = this.storageManager.load('data', {});
        existingData.document = this.data.document;
        this.storageManager.save('data', existingData);
        
        // Save podcast focus if available
        this.savePodcastFocus();
        
        // Update content state to indicate we have a document
        this.contentStateManager.updateState('hasDocument', true);
        
        this.notifications.showSuccess('Document uploaded successfully!');
    }
    
    /**
     * Save podcast focus with document
     */
    savePodcastFocus() {
    
        const podcastFocusInput = document.getElementById('podcast-focus');
        if (!podcastFocusInput) return;
        
        // Get current focus value
        const podcastFocus = podcastFocusInput.value.trim();
        
        // Save to outlineData storage
        const outlineData = this.storageManager.load('outlineData', {});
        outlineData.podcastFocus = podcastFocus;
        this.storageManager.save('outlineData', outlineData);
    }

    /**
     * Update document preview
     */
    updateDocumentPreview() {
    
        const file = this.data.document;
        
        if (!file) {
            this.resetUploadArea();
            return;
        }
        
        // Format file size
        const formatSize = function(bytes) {
        
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };
        
        // Update document preview elements
        const docIcon = document.getElementById('document-icon');
        const docName = document.getElementById('document-name');
        const docSize = document.getElementById('document-size');
        const docDate = document.getElementById('document-date');
        
        // Set document details
        if (docName) docName.textContent = file.name;
        if (docSize) docSize.textContent = formatSize(file.size);
        if (docDate) docDate.textContent = new Date(file.lastModified).toLocaleDateString();
        
        // Hide loading and placeholder states
        document.getElementById('upload-loading').classList.add('hidden');
        document.getElementById('upload-placeholder').classList.add('hidden');
        
        // Show document preview
        document.getElementById('document-preview').classList.remove('hidden');
        
        // Update button visibility
        this.updateUploadButtons();
        
        // Add change button event listener
        this.setupChangeDocumentListener();
    }
    
    /**
     * Update upload buttons visibility
     */
    updateUploadButtons() {
    
        const browseButton = document.getElementById('browse-file');
        const changeButton = document.getElementById('change-document');
        
        if (browseButton && changeButton) {
        
            if (this.data.document) {
                // If we have a document, show Change and hide Browse
                browseButton.classList.add('hidden');
                changeButton.classList.remove('hidden');
            } else {
                // If no document, show Browse and hide Change
                browseButton.classList.remove('hidden');
                changeButton.classList.add('hidden');
            }
        }
    }
    
    /**
     * Setup change document button listener
     */
    setupChangeDocumentListener() {
    
        const self = this;
        const changeButton = document.getElementById('change-document');
        
        if (changeButton) {
            // Remove existing listeners to prevent duplicates
            const newChangeButton = changeButton.cloneNode(true);
            changeButton.parentNode.replaceChild(newChangeButton, changeButton);
            
            // Add new listener
            newChangeButton.addEventListener('click', function(e) {
                e.stopPropagation();
                self.resetUploadArea();
                document.getElementById('file-input').value = '';
            });
        }
    }
    
    /**
     * Reset upload area to initial state
     */
    resetUploadArea() {
    
        // Hide document preview and loading states
        document.getElementById('document-preview').classList.add('hidden');
        document.getElementById('upload-loading').classList.add('hidden');
        
        // Show upload placeholder
        document.getElementById('upload-placeholder').classList.remove('hidden');
        
        // Remove existing document data without affecting other data
        this.data.document = null;
        
        // Get existing data and only update the document portion
        const existingData = this.storageManager.load('data', {});
        existingData.document = null;
        this.storageManager.save('data', existingData);
        
        // Update content state to indicate we no longer have a document
        this.contentStateManager.updateState('hasDocument', false);
        
        // Update sections based on new state
        this.contentStateManager.updateSections();
        
        // Update button visibility
        this.updateUploadButtons();
        
        // Reattach event listeners for file upload
        this.attachUploadAreaEventListeners();
    }
    
    /**
     * Attach event listeners to upload area
     */
    attachUploadAreaEventListeners() {
    
        // Get references to elements
        const self = this;
        const browseButton = document.getElementById('browse-file');
        const fileInput = document.getElementById('file-input');
        const uploadArea = document.getElementById('upload-area');
        
        // Update button visibility based on current state
        this.updateUploadButtons();
        
        // Add event handlers - using direct property assignment to avoid duplicates
        if (browseButton) {
        
            browseButton.onclick = function(e) {
                e.preventDefault();
                document.getElementById('file-input').click();
            };
        }
        
        // File input change handler
        if (fileInput) {
        
            fileInput.onchange = function(e) {
                self.handleFileUpload(e.target.files[0]);
            };
        }
        
        // Drag/drop handlers for upload area
        if (uploadArea) {
            
            uploadArea.ondragover = function(e) {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            };
            
            uploadArea.ondragleave = function() {
                uploadArea.classList.remove('dragover');
            };
            
            uploadArea.ondrop = function(e) {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                self.handleFileUpload(e.dataTransfer.files[0]);
            };
            
            // Add click handler to make the upload area clickable
            uploadArea.onclick = function(e) {
                // Only trigger if clicking on the placeholder area (not when document is already uploaded)
                if (!self.data.document && e.target.closest('#upload-placeholder')) {
                    document.getElementById('file-input').click();
                }
            };
        }
    }

    /**
     * Get current document data
     * @returns {Object} - Document data
     */
    getDocumentData() {
    
        return this.data.document;
    }
}

export default FileUploader;
