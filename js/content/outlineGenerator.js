// Podcastinator App - Outline Generator
import NotificationsManager from '../ui/notifications.js';
import ProgressManager from '../ui/progressManager.js';

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
            
            // Truncate if too long for API limits
            const maxLength = 32000;
            if (documentContent.length > maxLength) {
                documentContent = documentContent.substring(0, maxLength) + '... [Content truncated due to length]';
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
        
        return `You are a podcast outline generator.
        
Create a structured outline for a podcast discussion between a host named "${host.name || 'Host'}" 
(${host.personality ? `personality: ${host.personality}` : ''}) 
and a guest named "${guest.name || 'Guest'}" (${guest.personality ? `personality: ${guest.personality}` : ''}).

IMPORTANT: The target duration for the entire podcast is ${targetDurationMinutes} minutes. You must structure the outline so that each section has an appropriate amount of time allocation, adding up to ${targetDurationMinutes} minutes total.

The outline MUST follow this EXACT format with section separators and duration for easy parsing:

---
1. [Section Title]
Duration: [Target duration in minutes]
Overview: [Brief summary of the discussion points and topics for this section]
KEY FACTS:
- [3-5 specific facts, concepts, or points to cover]
- [3-5 specific topics to cover]
UNIQUE FOCUS: [Brief description of what makes this section distinct from others]
CARRYOVER: [Brief description of topics that build on previous sections]
---
1.1. [Subsection Title]
Duration: [Target duration in minutes]
Overview: [Brief summary of the discussion points for this subsection]
KEY FACTS:
- [3-5 specific facts, concepts, or points to cover]
- [3-5 specific topics to cover]
UNIQUE FOCUS: [Brief description of what makes this section distinct from others]
CARRYOVER: [Brief description of topics that build on previous sections]
---

1. Create a clear, hierarchical structure with main sections and subsections
2. Each section must include:
   - Section number (e.g., 1, 1.1, 2, etc.)
   - A descriptive title
   - Duration in minutes
   - Overview that summarizes the key points for that section
   - KEY FACTS: List 3-5 specific facts, concepts, or points to cover in this section
   - UNIQUE FOCUS: Describe what makes this section distinct from others
   - CARRYOVER: Note any topics that build on previous sections (use "None" if this is the first section or completely independent)
3. Use horizontal rule separators (---) between each section for easy parsing
4. Ensure all section durations add up to the target podcast length
5. Organize content logically with natural flow between sections
6. Balance depth vs. breadth based on available time
7. Distribute topics strategically to minimize redundancy across sections

## Example Format:

---
1. Introduction
Duration: 3 minutes
Overview: Brief exchange of credentials and establishing expertise.
KEY FACTS:
- Host introduces guest's background and expertise
- Overview of what will be covered in the podcast
- Why this topic is relevant to the audience
UNIQUE FOCUS: Setting the foundation and establishing credibility
CARRYOVER: None
---
1.2. Topic Relevance
Duration: 2 minutes
Overview: Discussion of why this topic matters to the audience.
KEY FACTS:
- Current relevance and timeliness of the topic
- Impact on the target audience
- Brief preview of key insights to come
UNIQUE FOCUS: Establishing importance and audience connection
CARRYOVER: Builds on guest's expertise established in introduction
---
2. Main Topic Section
Duration: 7 minutes
Overview: Detailed exploration of the central theme with expert insights.
KEY FACTS:
- Core concept explanation
- Expert analysis and insights
- Real-world examples or case studies
UNIQUE FOCUS: Deep dive into the main subject matter
CARRYOVER: Expands on the topic relevance discussed earlier
---

DO NOT include actual dialogue or script. This is only an outline with clear section separators for parsing. Ensure KEY FACTS are specific and actionable, UNIQUE FOCUS explains what distinguishes each section, and CARRYOVER tracks topic continuity.`;
    }
    
    /**
     * Build user prompt with document content
     * @param {string} documentContent - Document content
     * @returns {string} - User prompt
     */
    buildUserPrompt(documentContent) {
    
        // Base prompt
        let prompt = `Generate a podcast outline based on the following`;
        
        // Add focus if provided
        if (this.podcastFocus && this.podcastFocus.trim().length > 0) {
            prompt += ` focus & overall instructions: "${this.podcastFocus.trim()}"

Document content:
\`\`\` markdown
${documentContent}
\`\`\`

Create a well-organized outline that focuses specifically on the requested topic in a conversational podcast format. Remember that the entire podcast must be exactly ${this.podcastDuration} minutes long, and each section should have an appropriate duration specified.`;
        } else {
            prompt += ` document content:

\`\`\` markdown
${documentContent}
\`\`\`

Create a well-organized outline that covers the key information from this document in a conversational podcast format. Remember that the entire podcast must be exactly ${this.podcastDuration} minutes long, and each section should have an appropriate duration specified.`;
        }
        
        return prompt;
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
        console.log(`%c${result.feedback}`, feedbackStyle);
        
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
            // Get model name in lowercase for easier comparison
            const modelName = apiData.models.outlineVerify.toLowerCase();
            const isAnthropicStyle = modelName.includes('o3') || modelName.includes('o4');
            
            // Create system prompt for reviewing
            const systemPrompt = `You are a podcast outline quality reviewer. Your job is to analyze a generated podcast outline for:

1. STRUCTURE QUALITY: Ensure the outline has a logical structure with appropriate sections
2. TIMING ACCURACY: Verify that section durations add up to the target podcast duration
3. TOPICAL COVERAGE: Check that the outline appears to cover the main topics with appropriate emphasis
4. FOCUS ALIGNMENT: Confirm the outline aligns with any user-specified focus/steer
5. FORMAT CORRECTNESS: Ensure the outline follows the required section numbering and separator format

Respond with a JSON object containing:
- "isValid": true if the outline meets all quality criteria, false otherwise
- "feedback": specific issues found (if isValid is false) or confirmation (if isValid is true)

If the outline is high quality and factually accurate, respond with {"isValid": true, "feedback": "Outline is accurate and well-structured."}`;
            
            // Build user prompt for verification
            const podcastDuration = this.podcastDuration;
            const podcastFocus = this.podcastFocus;
            let userPrompt = `Please review this podcast outline for quality and structure.

Target Podcast Duration: ${podcastDuration} minutes
${podcastFocus ? `Podcast Focus: ${podcastFocus}\n` : ''}

--- GENERATED OUTLINE ---
\`\`\` markdown
${outlineText}
\`\`\`

--- ORIGINAL DOCUMENT CONTENT ---
\`\`\` markdown
${documentContent}
\`\`\`

Verify if this outline has a logical structure, well-balanced sections, and aligns with the target duration and focus. Respond in the required JSON format.`;
            
            // Prepare request body with model-specific parameters
            const requestBody = {
                model: apiData.models.outlineVerify,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ]
            };
            
            // Handle model-specific parameters
            if (!isAnthropicStyle) {
                requestBody.temperature = 0.3; // Lower temperature for more consistent evaluation
            }
            
            // verifyOutline: Call OpenAI API with retry logic
            let responseData;
            try {
                responseData = await this.apiManager.createChatCompletion(requestBody, apiData.apiKey);
            } catch (error) {
                console.error('Outline verification failed:', error);
                return { isValid: true, feedback: 'Verification skipped due to API error. Using original outline.' };
            }
            
            const verificationText = responseData.choices[0]?.message?.content?.trim();
            
            // Parse verification result
            try {
                // Extract JSON from the response (handling cases where there might be text before/after JSON)
                const jsonMatch = verificationText.match(/{[\s\S]*}/m);
                if (jsonMatch) {
                    const resultJson = JSON.parse(jsonMatch[0]);
                    return {
                        isValid: !!resultJson.isValid, // Ensure boolean
                        feedback: resultJson.feedback || 'No specific feedback provided.'
                    };
                } else {
                    // Fallback if no JSON found
                    const isPositive = verificationText.toLowerCase().includes('valid') || 
                                      verificationText.toLowerCase().includes('accurate') ||
                                      verificationText.toLowerCase().includes('good');
                    return {
                        isValid: isPositive,
                        feedback: verificationText.substring(0, 200) + '...'
                    };
                }
            } catch (error) {
                console.error('Error parsing verification result:', error);
                // Default to assuming it's valid to avoid blocking workflow
                return { isValid: true, feedback: 'Unable to parse verification result. Using original outline.' };
            }
            
        } catch (error) {
            console.error('Error during outline verification:', error);
            // Default to assuming it's valid to avoid blocking workflow
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
            // Calculate original outline length to ensure we maintain comparable structure
            const originalOutlineLength = originalOutlineText.length;
            console.log(`Original outline length: ${originalOutlineLength} characters`);
            
            // Get model name in lowercase for easier comparison
            const modelName = apiData.models.outline.toLowerCase(); // Use the main outline generation model
            const isAnthropicStyle = modelName.includes('o3') || modelName.includes('o4');
            
            // Create enhanced system prompt with clear preservation instructions
            const baseSystemPrompt = this.buildSystemPrompt(characterData);
            const systemPrompt = `${baseSystemPrompt}

IMPORTANT INSTRUCTIONS FOR OUTLINE EDITING:

1. MAKE TARGETED CHANGES ONLY - Only modify specific sections mentioned in the feedback. Do not rewrite or restructure unaffected sections.
2. PRESERVE ORIGINAL STRUCTURE - Keep the same section numbering scheme and overall organization unless specific issues were identified.
3. MAINTAIN FORMAT INTEGRITY - Your response MUST follow the exact format with section separators (---), section numbers, titles, durations, and overviews.
4. PRESERVE SECTION DETAILS - Keep the same level of detail in section overviews as the original outline.
5. MAINTAIN APPROPRIATE DURATIONS - Ensure all section durations still add up to the target podcast length.

Warning: If your response significantly restructures or simplifies the outline beyond addressing the specific feedback, it will be rejected.`;
            
            // Build enhanced user prompt for targeted improvement
            const podcastDuration = this.podcastDuration;
            const podcastFocus = this.podcastFocus;
            const userPrompt = `You are a podcast outline editor. I have a podcast outline that needs targeted edits based on specific feedback. Your job is to make PRECISE EDITS to address the feedback while preserving the original structure and format.

Target Podcast Duration: ${podcastDuration} minutes
${podcastFocus ? `Podcast Focus: ${podcastFocus}\n` : ''}

--- ORIGINAL OUTLINE ---
\`\`\` markdown
${originalOutlineText}
\`\`\`

--- FEEDBACK ON ISSUES ---
\`\`\` markdown
${feedback}
\`\`\`

--- ORIGINAL DOCUMENT CONTENT ---
\`\`\` markdown
${documentContent}
\`\`\`

IMPORTANT INSTRUCTIONS:

1. DO NOT REWRITE the entire outline. Make surgical changes ONLY to the specific parts mentioned in the feedback.
2. If the feedback points to issues in specific sections, ONLY modify those sections.
3. MAINTAIN ORIGINAL STRUCTURE - Your edited outline should have approximately the same number of sections and subsections as the original (${originalOutlineText.split('---').length - 1} sections).
4. PRESERVE all section separators (---), numbering, and format from the original outline.
5. KEEP DETAILED OVERVIEWS - Do not shorten or oversimplify section overviews.
6. ENSURE DURATION ACCURACY - Make sure all section durations add up to exactly ${podcastDuration} minutes.
7. Return the COMPLETE outline with your targeted edits incorporated.`;
            
            // Prepare request body with model-specific parameters
            const requestBody = {
                model: apiData.models.outline,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ]
            };
            
            // Handle model-specific parameters with lower temperature for more conservative editing
            if (!isAnthropicStyle) {
                requestBody.temperature = 0.4; // Lower temperature for more conservative edits
            }
            
            // improveOutline: Call OpenAI API with retry logic
            let responseData;
            try {
                responseData = await this.apiManager.createChatCompletion(requestBody, apiData.apiKey);
            } catch (error) {
                console.error('Outline improvement failed:', error);
                return originalOutlineText; // Return original outline if improvement fails
            }
            
            const improvedOutlineText = responseData.choices[0]?.message?.content?.trim();
            
            return improvedOutlineText || originalOutlineText;
            
        } catch (error) {
            console.error('Error during outline improvement:', error);
            return originalOutlineText; // Return original outline if improvement fails
        }
    }
}

export default OutlineGenerator;
