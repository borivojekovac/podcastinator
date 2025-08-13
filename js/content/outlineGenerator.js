// Podcastinator App - Outline Generator
import NotificationsManager from '../ui/notifications.js';
import ProgressManager from '../ui/progressManager.js';
import { buildOutlineGenerationSystem, buildOutlineGenerationUser } from './prompts/outlinePrompts.js';
import OutlineVerifier from './outlineVerifier.js';
import OutlineImprover from './outlineImprover.js';

/**
 * Handles the generation of podcast outlines using OpenAI
 */
class OutlineGenerator {
    constructor(storageManager, contentStateManager, apiManager) {
        this.storageManager = storageManager;
        this.contentStateManager = contentStateManager;
        this.apiManager = apiManager;
        this.notifications = new NotificationsManager();
        this.progressManager = new ProgressManager();
        
        // Helpers
        this.outlineVerifier = new OutlineVerifier(this.apiManager);
        this.outlineImprover = new OutlineImprover(this.apiManager);
        
        // Generation state
        this.isGenerating = false;
        this.cancelGeneration = false;
        
        // Load existing outline data from storage
        const savedData = this.storageManager.load('outlineData', {});
        this.outlineData = savedData.outline || '';
        
        // Load podcast settings or use defaults
        this.podcastDuration = savedData.podcastDuration || 30;
        this.podcastFocus = savedData.podcastFocus || '';
    }

    /**
     * Initialize the outline generator
     */
    init() {
    
        // Initialize UI components
        this.initializeUI();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Restore saved data if it exists
        this.restoreSavedData();
    }
    
    /**
     * Initialize UI components
     */
    initializeUI() {
    
        // Get UI elements
        this.outlineTextarea = document.getElementById('outline-text');
        this.generateButton = document.getElementById('generate-outline');
        this.progressContainer = document.getElementById('outline-progress');
        this.progressBar = this.progressContainer.querySelector('.progress-bar .progress-fill');
        this.cancelButton = document.getElementById('cancel-outline');
        
        // Get podcast configuration elements
        this.podcastDurationInput = document.getElementById('podcast-duration');
        this.podcastFocusInput = document.getElementById('podcast-focus'); // Now in document upload section
        
        // Set initial values if we have saved data
        if (this.podcastDurationInput) {
            this.podcastDurationInput.value = this.podcastDuration;
        }
        
        if (this.podcastFocusInput) {
            this.podcastFocusInput.value = this.podcastFocus;
        }
        
        // Make sure progress bar is initially hidden
        if (this.progressContainer) {
            this.progressContainer.style.display = 'none';
        }
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
    
        // Generate outline button
        if (this.generateButton) {
            this.generateButton.addEventListener('click', this.handleGenerateOutline.bind(this));
        }
        
        // Cancel generation button
        if (this.cancelButton) {
            this.cancelButton.addEventListener('click', this.handleCancelGeneration.bind(this));
        }
        
        // Listen for changes to outline text
        if (this.outlineTextarea) {
            this.outlineTextarea.addEventListener('input', this.handleOutlineChange.bind(this));
        }
        
        // Listen for changes to podcast duration
        if (this.podcastDurationInput) {
            this.podcastDurationInput.addEventListener('change', this.handlePodcastSettingsChange.bind(this));
        }
        
        // Listen for changes to podcast focus
        if (this.podcastFocusInput) {
            this.podcastFocusInput.addEventListener('input', this.handlePodcastSettingsChange.bind(this));
        }
    }
    
    /**
     * Restore saved data if it exists
     */
    restoreSavedData() {
    
        if (this.outlineData && this.outlineTextarea) {
            this.outlineTextarea.value = this.outlineData;
            
            // Update state if we have valid outline data
            if (this.outlineData.trim()) {
                this.contentStateManager.updateState('hasOutline', true);
            }
        }
    }
    
    /**
     * Handle generate outline button click
     */
    async handleGenerateOutline() {
    
        // Check if we're already generating
        if (this.isGenerating) {
            return;
        }
        
        try {
            // Get API data
            const apiData = this.apiManager.getApiData();
            if (!apiData.apiKey) {
                this.notifications.showError('OpenAI API key is required. Please configure it in step 1.');
                return;
            }
            
            // Set generating state
            this.setGeneratingState(true);
            
            // Get document data from the main data store
            const data = this.storageManager.load('data', {});
            if (!data.document || !data.document.content) {
                throw new Error('No document content found. Please upload a document first.');
            }
            
            const documentData = data.document;
            
            // Get character data
            const characterData = this.storageManager.load('data', {});
            if (!characterData.host || !characterData.guest) {
                throw new Error('Host and guest character data is required. Please complete character creation first.');
            }
            
            // Generate outline
            await this.generateOutline(documentData, characterData, apiData);
            
        } catch (error) {
            console.error('Outline generation error:', error);
            this.notifications.showError(error.message || 'Failed to generate outline. Please try again.');
        } finally {
            // Reset generating state
            this.setGeneratingState(false);
        }
    }
    
    /**
     * Handle cancel generation button click
     */
    handleCancelGeneration() {
    
        this.cancelGeneration = true;
        this.notifications.showInfo('Cancelling outline generation...');
    }
    
    /**
     * Handle outline text changes
     */
    handleOutlineChange() {
    
        // Save to storage
        this.saveOutlineData();
        
        // Update content state
        const hasOutline = this.outlineTextarea.value.trim().length > 0;
        this.contentStateManager.updateState('hasOutline', hasOutline);
    }
    
    /**
     * Handle podcast settings changes
     */
    handlePodcastSettingsChange() {
    
        // Update the podcast settings
        if (this.podcastDurationInput) {
            this.podcastDuration = parseInt(this.podcastDurationInput.value, 10) || 30;
        }
        
        if (this.podcastFocusInput) {
            this.podcastFocus = this.podcastFocusInput.value.trim();
        }
        
        // Save the updated settings
        this.saveOutlineData();
    }
    
    /**
     * Generate podcast outline using OpenAI API
     * @param {Object} documentData - Document data including content
     * @param {Object} characterData - Host and guest character data
     * @param {Object} apiData - API credentials and model data
     */
    async generateOutline(documentData, characterData, apiData) {
    
        try {
            // Update progress
            this.progressManager.updateProgress('outline-progress', 10);
            
            // Get the document content (now stored as plain text)
            let documentContent = '';
            
            if (documentData.content) {
                // Plain text content, no need to decode
                documentContent = documentData.content;
            } else {
                throw new Error('Invalid document content format');
            }
            
            // Build system prompt
            const systemPrompt = this.buildSystemPrompt(characterData);
            
            // Build user prompt with document content
            const userPrompt = this.buildUserPrompt(documentContent);
            
            // Get model name in lowercase for easier comparison
            const modelName = apiData.models.outline.toLowerCase();
            const isAnthropicStyle = modelName.includes('o3') || modelName.includes('o4');
            
            // Prepare request body with model-specific parameters
            const requestBody = {
                model: apiData.models.outline,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ]
            };
            
            // Handle model-specific parameters
            if (!isAnthropicStyle) {
                requestBody.temperature = 0.7; // Only set for non-Anthropic models
            }
            
            // generateOutline: Call OpenAI API with retry logic
            const responseData = await this.apiManager.createChatCompletion(requestBody, apiData.apiKey);
            
            // Update progress
            this.progressManager.updateProgress('outline-progress', 50);
            
            // Check if cancelled
            if (this.cancelGeneration) {
                this.cancelGeneration = false;
                throw new Error('Outline generation cancelled');
            }
            
            const outlineText = responseData.choices[0]?.message?.content?.trim();
            
            if (outlineText) {
                // Update progress - now we'll verify
                this.progressManager.updateProgress('outline-progress', 60);
                
                // Set up iterative verification and improvement
                let currentOutline = outlineText;
                let isValid = false;
                let feedback = '';
                let iterationCount = 0;
                const maxIterations = 3;
                
                // Iterative verification and improvement loop
                while (!isValid && iterationCount < maxIterations) {
                    iterationCount++;
                    
                    // Show reviewing notification with iteration count
                    const reviewNotificationId = Date.now();
                    this.notifications.showInfo(`Reviewing outline quality (attempt ${iterationCount}/${maxIterations})...`, reviewNotificationId);
                    
                    // Review the outline with a second model
                    const reviewResult = await this.verifyOutline(currentOutline, documentContent, characterData, apiData);
                    
                    // Clear the review notification
                    this.notifications.clearNotification(reviewNotificationId);
                    
                    // Log review feedback to console
                    this.logVerificationFeedback(`Outline Review (Iteration ${iterationCount})`, reviewResult);
                    
                    // Update status based on review result
                    isValid = reviewResult.isValid;
                    feedback = reviewResult.feedback;
                    
                    // If still not valid and we haven't reached max iterations, edit the outline
                    if (!isValid && iterationCount < maxIterations) {
                        this.progressManager.updateProgress('outline-progress', 60 + (iterationCount * 10));
                        const editingNotificationId = Date.now();
                        this.notifications.showInfo(`Editing outline (attempt ${iterationCount}/${maxIterations})...`, editingNotificationId);
                        
                        // Attempt to edit the outline
                        const editedOutline = await this.improveOutline(currentOutline, feedback, documentContent, characterData, apiData);
                        
                        // Clear the editing notification
                        this.notifications.clearNotification(editingNotificationId);
                        
                        if (editedOutline) {
                            currentOutline = editedOutline;
                            this.notifications.showInfo(`Outline editing ${iterationCount} complete. Reviewing again...`);
                        } else {
                            // If editing failed, break the loop
                            break;
                        }
                    }
                }
                
                // Set final outline text
                let finalOutlineText = currentOutline;
                
                // Show final status notification
                if (isValid) {
                    this.notifications.showSuccess('Outline review successful!');
                } else if (iterationCount >= maxIterations) {
                    this.notifications.showSuccess(`Outline edited ${iterationCount} times. Best possible version achieved.`);
                } else {
                    this.notifications.showSuccess('Outline editing complete.');
                }
                
                // Set outline in textarea
                this.outlineTextarea.value = finalOutlineText;
                
                // Save to storage
                this.saveOutlineData();
                
                // Update content state
                this.contentStateManager.updateState('hasOutline', true);
                
                // Show success message
                this.notifications.showSuccess('Outline generated successfully!');
                
                // Update progress to complete
                this.progressManager.updateProgress('outline-progress', 100);
            } else {
                throw new Error('No outline content received from API');
            }
            
        } catch (error) {
            throw error;
        }
    }
    
    /**
     * Build system prompt for outline generation
     * @param {Object} characterData - Host and guest character data
     * @returns {string} - System prompt
     */
    buildSystemPrompt(characterData) {
    
        const host = characterData.host || {};
        const guest = characterData.guest || {};
        const targetDurationMinutes = this.podcastDuration;
        return buildOutlineGenerationSystem(host, guest, targetDurationMinutes);
    }
    
    /**
     * Build user prompt with document content
     * @param {string} documentContent - Document content
     * @returns {string} - User prompt
     */
    buildUserPrompt(documentContent) {
    
        return buildOutlineGenerationUser(documentContent, this.podcastDuration, this.podcastFocus);
    }
    
    /**
     * Set generating state and update UI
     * @param {boolean} isGenerating - Whether generation is in progress
     */
    setGeneratingState(isGenerating) {
    
        this.isGenerating = isGenerating;
        
        if (isGenerating) {
            // Update UI for generating state
            this.generateButton.disabled = true;
            this.progressContainer.style.display = 'flex';
            this.progressManager.resetProgress('outline-progress');
            this.cancelGeneration = false;
        } else {
            // Reset UI
            this.generateButton.disabled = false;
            this.progressContainer.style.display = 'none';
        }
    }
    
    /**
     * Save outline data to storage
     */
    saveOutlineData() {
    
        const outlineData = {
            outline: this.outlineTextarea.value,
            podcastDuration: this.podcastDuration,
            podcastFocus: this.podcastFocus,
            timestamp: new Date().toISOString()
        };
        
        this.storageManager.save('outlineData', outlineData);
        this.outlineData = this.outlineTextarea.value;
    }
    
    /**
     * Log review feedback to console in a nicely formatted way
     * @param {string} title - Title for the log group
     * @param {Object} result - Review result object with isValid and feedback properties
     */
    logVerificationFeedback(title, result) {
    
        // Create styled console output
        const titleStyle = 'font-weight: bold; font-size: 14px; color: #3498db;';
        const validStyle = result.isValid ? 'color: #2ecc71; font-weight: bold;' : 'color: #e74c3c; font-weight: bold;';
        const feedbackStyle = 'color: #333; background: #f8f9fa; padding: 4px; border-left: 3px solid #3498db;';
        
        // Open a console group with the title
        console.group(`%c${title}`, titleStyle);
        
        // Log the validation status
        console.log(
            `%cReview: ${result.isValid ? 'PASSED ✅' : 'NEEDS EDITING ⚠️'}`,
            validStyle
        );
        
        // Log the feedback with nice formatting
        console.log('%cFeedback:', 'font-weight: bold;');
        if (typeof result.feedback === 'string') {
            console.log(`%c${result.feedback}`, feedbackStyle);
        } else {
            // Show structured feedback objects/arrays clearly
            try {
                const pretty = JSON.stringify(result.feedback, null, 2);
                console.log(`%c${pretty}`, feedbackStyle);
            } catch (e) {
                console.dir(result.feedback, { depth: null });
            }
        }
        
        // Close the console group
        console.groupEnd();
    }
    
    /**
     * Review the generated outline against the original document
     * @param {string} outlineText - The generated outline text
     * @param {string} documentContent - Original document content
     * @param {Object} characterData - Host and guest character data
     * @param {Object} apiData - API credentials and model data
     * @returns {Object} - Review result with isValid flag and feedback
     */
    async verifyOutline(outlineText, documentContent, characterData, apiData) {
    
        try {
            const result = await this.outlineVerifier.verifyOutline(
                outlineText,
                documentContent,
                characterData,
                apiData,
                this.podcastDuration,
                this.podcastFocus
            );
            return result;
        } catch (error) {
            console.error('Error during outline verification:', error);
            return { isValid: true, feedback: 'Verification error. Using original outline.' };
        }
    }
    
    /**
     * Edit the outline based on review feedback
     * @param {string} originalOutlineText - The original outline text
     * @param {string} feedback - Feedback from review
     * @param {string} documentContent - Original document content
     * @param {Object} characterData - Host and guest character data
     * @param {Object} apiData - API credentials and model data
     * @returns {string} - Edited outline text
     */
    async improveOutline(originalOutlineText, feedback, documentContent, characterData, apiData) {
    
        try {
            const improved = await this.outlineImprover.improveOutline(
                originalOutlineText,
                feedback,
                documentContent,
                characterData,
                apiData,
                this.podcastDuration,
                this.podcastFocus
            );
            return improved;
        } catch (error) {
            console.error('Error during outline improvement:', error);
            return originalOutlineText; // Return original outline if improvement fails
        }
    }
}

export default OutlineGenerator;
