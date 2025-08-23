// Podcastinator App - Script Generator
import NotificationsManager from '../ui/notifications.js';
import ProgressManager from '../ui/progressManager.js';
import ScriptVerifier from './scriptVerifier.js';
import ScriptImprover from './scriptImprover.js';
import {
    buildScriptSectionUser,
    buildConversationSummarySystem,
    buildConversationSummaryUser,
    buildScriptSystem
} from './prompts/scriptPrompts.js';

// Composite progress weights (overall)
const PROG_SECTIONS_WEIGHT = 0.80;          // Sections generation + per-section verify/improve
const PROG_FULL_VERIFY_WEIGHT = 0.12;       // Full script cross-section verification
const PROG_CROSS_IMPROVE_WEIGHT = 0.08;     // Cross-section improvement

// Per-section internal split
const SEC_GEN = 0.60;
const SEC_VER = 0.30;
const SEC_IMP = 0.10;

// Composite progress helper
const PROG_SECTION_GEN_WEIGHT = PROG_SECTIONS_WEIGHT * SEC_GEN;
const PROG_SECTION_VER_WEIGHT = PROG_SECTIONS_WEIGHT * SEC_VER;
const PROG_SECTION_IMP_WEIGHT = PROG_SECTIONS_WEIGHT * SEC_IMP;

/**
 * Handles the generation of podcast scripts using OpenAI
 */
class ScriptGenerator {
    constructor(storageManager, contentStateManager, apiManager) {
        this.storageManager = storageManager;
        this.contentStateManager = contentStateManager;
        this.apiManager = apiManager;
        this.notifications = new NotificationsManager();
        this.progressManager = new ProgressManager();
        
        // Initialize verification and improvement modules
        this.scriptVerifier = new ScriptVerifier(apiManager);
        this.scriptImprover = new ScriptImprover(apiManager);
        
        // Generation state
        this.isGenerating = false;
        this.cancelGeneration = false;
        this.currentSection = 0;
        this.totalSections = 0;
        
        // Conversation tracking for continuity
        this.conversationSummary = '';
        this.lastSectionSummary = '';
        this.lastDialogueExchanges = ''; // Store actual dialogue exchanges for continuity
        this.topicsSummary = ''; // Store structured topics summary
        this.generatedSections = [];
        // Cumulative context across all prior sections
        this.allSectionSummaries = [];
        this.allTopicsCovered = [];
        
        // Load existing script data from storage
        const savedData = this.storageManager.load('scriptData', {});
        this.scriptData = savedData.script || '';

        // Bind handlers to ensure correct 'this' context for event listeners
        this.handleGenerateScript = this.handleGenerateScript.bind(this);
        this.handleCancelGeneration = this.handleCancelGeneration.bind(this);
        this.handleScriptChange = this.handleScriptChange.bind(this);
    }

    /**
     * Initialize the script generator
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
     * Update composite progress monotonically (0-100)
     * @param {string} containerId 
     * @param {number} percent 
     */
    updateCompositeProgress(containerId, percent) {
    
        if (typeof this._lastProgress !== 'number') {
            this._lastProgress = 0;
        }
        const clamped = Math.max(this._lastProgress, Math.min(100, Math.round(percent)));
        this._lastProgress = clamped;
        if (this.progressManager && typeof this.progressManager.updateProgress === 'function') {
            this.progressManager.updateProgress(containerId, clamped);
        }
    }

    /**
     * Compute composite percent for a section at a given stage
     * @param {number} sectionIndexZeroBased
     * @param {number} totalSections
     * @param {number} sectionStageFraction  // 0.0 to 1.0 within the section span
     */
    computeSectionCompositePercent(sectionIndexZeroBased, totalSections, sectionStageFraction) {
    
        if (!totalSections || totalSections <= 0) {
            return 0;
        }
        const sectionSpan = PROG_SECTIONS_WEIGHT * (1 / totalSections);
        const base = PROG_SECTIONS_WEIGHT * (sectionIndexZeroBased / totalSections);
        const value = (base + sectionSpan * sectionStageFraction) * 100;
        return value;
    }
    
    /**
     * Initialize UI components
     */
    initializeUI() {
    
        // Get UI elements
        this.scriptTextarea = document.getElementById('script-text');
        this.generateButton = document.getElementById('generate-script');
        this.progressContainer = document.getElementById('script-progress');
        this.progressBar = this.progressContainer.querySelector('.progress-bar .progress-fill');
        this.cancelButton = document.getElementById('cancel-script');
        
        // Make sure progress bar is initially hidden
        if (this.progressContainer) {
            this.progressContainer.style.display = 'none';
        }
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
    
        // Generate script button
        if (this.generateButton) {
            this.generateButton.addEventListener('click', this.handleGenerateScript);
        }
        
        // Cancel generation button
        if (this.cancelButton) {
            this.cancelButton.addEventListener('click', this.handleCancelGeneration);
        }
        
        // Listen for changes to script text
        if (this.scriptTextarea) {
            this.scriptTextarea.addEventListener('input', this.handleScriptChange);
        }
    }
    
    /**
     * Restore saved data if it exists
     */
    restoreSavedData() {
    
        if (this.scriptData && this.scriptTextarea) {
            this.scriptTextarea.value = this.scriptData;
            
            // Update state if we have valid script data
            if (this.scriptData.trim()) {
                this.contentStateManager.updateState('hasScript', true);
            }
        }
    }
    
    /**
     * Handle generate script button click
     */
    async handleGenerateScript() {
    
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
            
            // Get document and outline data
            const data = this.storageManager.load('data', {});
            const outlineData = this.storageManager.load('outlineData', {});
            
            if (!outlineData.outline) {
                throw new Error('No outline found. Please generate an outline first.');
            }
            
            // Get character data
            const characterData = {
                host: data.host || {},
                guest: data.guest || {}
            };
            
            if (!characterData.host || !characterData.guest) {
                throw new Error('Host and guest character data is required. Please complete character creation first.');
            }
            
            // Parse outline sections
            const sections = this.parseOutlineSections(outlineData.outline);
            this.totalSections = sections.length;
            
            if (this.totalSections === 0) {
                throw new Error('Could not parse any sections from the outline. Please check the outline format.');
            }
            
            // Reset script content before generation
            this.scriptTextarea.value = '';
            this.saveScriptData();
            
            // Generate script section by section
            await this.generateFullScript(sections, characterData, apiData);
            
        } catch (error) {
            console.error('Script generation error:', error);
            this.notifications.showError(error.message || 'Failed to generate script. Please try again.');
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
        this.notifications.showInfo('Cancelling script generation...');
    }
    
    /**
     * Handle script text changes
     */
    handleScriptChange() {
    
        // Save to storage
        this.saveScriptData();
        
        // Update content state
        const hasScript = this.scriptTextarea.value.trim().length > 0;
        this.contentStateManager.updateState('hasScript', hasScript);
    }
    
    /**
     * Set generating state and update UI
     * @param {boolean} isGenerating - Whether generation is in progress
     */
    setGeneratingState(isGenerating) {
    
        this.isGenerating = isGenerating;
        
        if (isGenerating) {
            // Update UI for generating state
            if (this.generateButton) {
                this.generateButton.disabled = true;
            }
            if (this.progressContainer) {
                this.progressContainer.style.display = 'flex';
            }
            if (this.progressManager) {
                this.progressManager.resetProgress('script-progress');
            }
            this.cancelGeneration = false;
        } else {
            // Reset UI
            if (this.generateButton) {
                this.generateButton.disabled = false;
            }
            if (this.progressContainer) {
                this.progressContainer.style.display = 'none';
            }
        }
    }
    
    /**
     * Parse outline into sections for script generation
     * @param {string} outlineText - The outline text to parse
     * @returns {Array} - Array of outline sections
     */
    parseOutlineSections(outlineText) {
    
        console.log('Parsing outline sections, length:', outlineText.length);
        
        // Split by horizontal rule separators - more forgiving of whitespace
        const sectionStrings = outlineText.split(/^\s*---\s*$/m).filter(section => section.trim());
        
        console.log('Found', sectionStrings.length, 'sections');
        
        // Track total duration for validation
        let totalDuration = 0;
        
        const sections = sectionStrings.map((sectionStr, index) => {
            // Extract section number and title
            const titleMatch = sectionStr.match(/^\s*(\d+(?:\.\d+)*)\.\s+([^\r\n]+)/m);
            
            // Extract duration
            const durationMatch = sectionStr.match(/Duration:\s*(\d+(?:\.\d+)?)\s*(seconds?|secs?|s|minutes?|mins?|min|m)?/mi);
            let durationMinutes = 0;
            if (durationMatch) {
                const value = parseFloat(durationMatch[1]);
                const unitRaw = (durationMatch[2] || '').trim().toLowerCase();
                if (!unitRaw || unitRaw.startsWith('m')) {
                    // Treat as minutes when unit is missing or minutes-like (minute/min/mins/m)
                    durationMinutes = value;
                } else if (unitRaw.startsWith('s')) {
                    // Convert seconds to minutes
                    durationMinutes = value / 60;
                } else {
                    // Fallback: assume minutes
                    durationMinutes = value;
                }
            }
            
            // Extract overview
            const overviewMatch = sectionStr.match(/Overview:\s*([^\r\n]+)/m);
            
            // Add to total duration
            totalDuration += durationMinutes;
            
            const section = {
                id: index + 1,
                number: titleMatch ? titleMatch[1] : `${index + 1}`,
                title: titleMatch ? titleMatch[2] : `Section ${index + 1}`,
                durationMinutes: durationMinutes,
                overview: overviewMatch ? overviewMatch[1] : 'No overview provided',
                content: sectionStr.trim()
            };
            
            console.log(`Section ${index + 1}:`, section.title, '(', section.durationMinutes, 'min)');
            
            return section;
        });
        
        // Store the total duration for use in prompts
        this.totalPodcastDuration = totalDuration;
        
        return sections;
    }
    
    /**
     * Generate full podcast script using OpenAI API
     * @param {Array} sections - Parsed outline sections
     * @param {Object} characterData - Host and guest character data
     * @param {Object} apiData - API credentials and model data
     */
    async generateFullScript(sections, characterData, apiData) {
    
        try {
            // Initialize progress tracking and conversation context
            this.currentSection = 0;
            this.totalSections = sections.length;
            this.conversationSummary = '';
            this.lastSectionSummary = '';
            this.topicsSummary = '';
            this.generatedSections = [];
            // Reset composite progress
            this._lastProgress = 0;
            if (this.progressManager) {
                this.progressManager.resetProgress('script-progress');
                this.progressManager.updateProgress('script-progress', 0);
            }
            
            // Generate each section
            for (let i = 0; i < sections.length; i++) {
                // Check if cancelled
                if (this.cancelGeneration) {
                    this.cancelGeneration = false;
                    throw new Error('Script generation cancelled');
                }
                
                // Update progress
                this.currentSection = i + 1;
                // Composite progress is updated within generateScriptSection() after each stage
                
                // Check if this is the last section
                const isLastSection = (i === sections.length - 1);
                
                // Generate section
                const partType = (i === 0) ? 'intro' : (isLastSection ? 'outro' : 'section');
                await this.generateScriptSection(sections[i], characterData, apiData, partType);
                
                // Update conversation summary after each section (except the last one)
                if (!isLastSection) {
                    await this.updateConversationSummary(apiData);
                }
            }
            
            // After all sections complete, move progress through full-script verification band
            const afterFullVerify = (PROG_SECTIONS_WEIGHT + PROG_FULL_VERIFY_WEIGHT) * 100; // 92%
            
            // Get document and outline data
            const documentData = this.storageManager.load('data', {});
            const outlineData = this.storageManager.load('outlineData', {});
            const documentContent = documentData.document?.content || '';
            
            // Iterative final cross-section review and improvement (up to 3 attempts)
            let finalScript = this.scriptData;
            let csAttempt = 0;
            const csMaxAttempts = 3;
            let finalVerificationResult = { isValid: true, feedback: '' };
            
            while (csAttempt < csMaxAttempts) {
                csAttempt++;
                const finalReviewNotificationId = Date.now();
                this.notifications.showInfo(`Performing cross-section review (attempt ${csAttempt}/${csMaxAttempts})...`, finalReviewNotificationId);
                
                // Call cross-section verification via ScriptVerifier
                finalVerificationResult = await this.scriptVerifier.verifyScriptForCrossSectionIssues(
                    finalScript,
                    outlineData.outline,
                    documentContent,
                    characterData,
                    apiData,
                    this.totalPodcastDuration
                );
                
                // Clear the verification notification
                this.notifications.clearNotification(finalReviewNotificationId);
                
                // Log verification feedback
                this.logVerificationFeedback(`Final Cross-Section Review (Attempt ${csAttempt})`, finalVerificationResult);
                // Mark completion of full-script verification phase
                this.updateCompositeProgress('script-progress', afterFullVerify);
                
                if (finalVerificationResult.isValid) {
                    this.notifications.showInfo('Final review passed with no cross-section issues found.');
                    break;
                }
                
                if (csAttempt >= csMaxAttempts) {
                    this.notifications.showInfo('Max cross-section improvement attempts reached. Proceeding with best version available.');
                    break;
                }
                
                const improvementNotificationId = Date.now();
                this.notifications.showInfo(`Applying cross-section improvements (attempt ${csAttempt}/${csMaxAttempts})...`, improvementNotificationId);
                
                // Attempt to improve the script with focus on cross-section issues via ScriptImprover
                // Prefer structured JSON for downstream cross-section improvement if available
                const csFeedback = (finalVerificationResult && finalVerificationResult.rawJson)
                    ? JSON.stringify(finalVerificationResult.rawJson)
                    : finalVerificationResult.feedback;

                const improvedScript = await this.scriptImprover.improveCrossSectionIssues(
                    finalScript,
                    csFeedback,
                    outlineData.outline,
                    documentContent,
                    characterData,
                    apiData,
                    this.totalPodcastDuration
                );
                
                // Clear the improvement notification
                this.notifications.clearNotification(improvementNotificationId);
                
                if (improvedScript && improvedScript.trim() && improvedScript.trim() !== finalScript.trim()) {
                    finalScript = improvedScript;
                    this.notifications.showInfo('Cross-section improvements applied. Re-reviewing...');
                } else {
                    this.notifications.showInfo('Cross-section improvement produced no changes. Stopping further attempts.');
                    break;
                }
            }
            
            // Update the textarea with the final script
            this.scriptTextarea.value = finalScript;
            this.saveScriptData();
            
            // Show final status notification
            this.notifications.showSuccess('Script generation and verification complete!');
            
            // Update state
            this.contentStateManager.updateState('hasScript', true);
            
            // Show success message
            this.notifications.showSuccess('Script generated successfully!');
            
            // Update progress to complete
            this.updateCompositeProgress('script-progress', 100);
            
        } catch (error) {
            // If not cancelled, rethrow
            if (error.message !== 'Script generation cancelled') {
                throw error;
            }
        }
    }
    
    /**
     * Add language instruction to system prompt
     * @param {string} systemPrompt - Base system prompt
     * @param {string} language - Script language
     * @returns {string} - System prompt with language instruction
     */
    addLanguageInstruction(systemPrompt, language) {
    
        return `${systemPrompt}\n- Generate the script in ${language} language.`;
    }
    
    /**
     * Build user prompt for script section
     * @param {Object} section - Section data from outline
     * @param {Object} data - Document data
     * @param {boolean} isLastSection - Whether this is the last section
     * @returns {string} - User prompt for section
     */
    buildScriptSectionUserPrompt(section, data, partType) {
    
        // Build aggregated conversation context from all prior sections
        const aggregatedSummaries = this.buildAggregatedSummaries();
        const aggregatedTopics = this.buildAggregatedTopics();

        return buildScriptSectionUser(
            section,
            this.totalPodcastDuration,
            this.lastDialogueExchanges,
            this.topicsSummary,
            partType,
            aggregatedSummaries,
            aggregatedTopics
        );
    }

    /**
     * Build aggregated summaries for all prior sections (ordered)
     * @returns {string} - Aggregated summary text
     */
    buildAggregatedSummaries() {
    
        if (!this.allSectionSummaries || this.allSectionSummaries.length === 0) {
            return '';
        }
        const lines = this.allSectionSummaries.map(item => {
            const num = item.number || '';
            const title = item.title || '';
            const sum = (item.summary || '').replace(/\s+/g, ' ').trim();
            return `Section ${num} (${title}): ${sum}`.trim();
        });
        return lines.join('\n');
    }

    /**
     * Build aggregated topics covered across all prior sections (deduplicated lines)
     * @returns {string} - Aggregated topics list text
     */
    buildAggregatedTopics() {
    
        if (!this.allTopicsCovered || this.allTopicsCovered.length === 0) {
            return '';
        }
        const seen = new Set();
        const out = [];
        for (const item of this.allTopicsCovered) {
            const block = item.topics || '';
            const lines = block.split(/\r?\n/);
            for (let line of lines) {
                const trimmed = line.trim();
                if (!trimmed) {
                    continue;
                }
                // Normalize bullet prefix; keep original line if it starts with '-'
                const normalizedForKey = trimmed.replace(/^[-*]\s*/, '').toLowerCase();
                if (seen.has(normalizedForKey)) {
                    continue;
                }
                seen.add(normalizedForKey);
                // Ensure bullet formatting
                const bullet = trimmed.startsWith('-') ? trimmed : `- ${trimmed}`;
                out.push(bullet);
            }
        }
        return out.join('\n');
    }
    
    /**
     * Generate script section
     * @param {Object} section - Section data from outline
     * @param {Object} characterData - Host and guest character data
     * @param {Object} apiData - API credentials and model data
     * @param {boolean} isLastSection - Whether this is the final section
     */
    async generateScriptSection(section, characterData, apiData, partType = '') {
    
        try {
            // Get the full document content first
            const data = this.storageManager.load('data', {});
            const documentContent = data.document?.content || '';
            
            // Build system prompt for section with document content
            const systemPrompt = this.buildSystemPrompt(characterData, partType, documentContent);
            
            // Get language setting
            const scriptLanguage = apiData.models.scriptLanguage || 'english';
            
            // Build user prompt with conversation context
            const userPrompt = this.buildScriptSectionUserPrompt(section, data, partType);
            
            // Add language instruction to system prompt
            const languageSystemPrompt = this.addLanguageInstruction(systemPrompt, scriptLanguage);
            
            // Create message array
            const messages = [
                { role: 'system', content: languageSystemPrompt },
                { role: 'user', content: userPrompt }
            ];
            
            // Configure options
            const options = {
                /*maxTokens: 2000,*/
                temperature: 0.7
            };
            
            // Get request body using the OpenAIManager helper
            const requestBody = this.apiManager.createRequestBody(
                apiData.models.script,
                messages,
                options
            );
            
            // generateScriptSection: Call OpenAI API with retry logic
            const responseData = await this.apiManager.createChatCompletion(requestBody, apiData.apiKey);
            let sectionText = responseData.choices[0]?.message?.content?.trim();
            
            // Track token usage if available
            if (responseData.usage) {
                const modelName = apiData.models.script;
                const promptTokens = responseData.usage.prompt_tokens || 0;
                const completionTokens = responseData.usage.completion_tokens || 0;
                
                // Track usage via API manager
                this.apiManager.trackCompletionUsage(modelName, promptTokens, completionTokens);
            }
            
            if (sectionText) {
                // Process the text to remove stage directions and ensure proper formatting
                sectionText = this.processScriptText(sectionText);
                // Composite progress: after generation stage for this section
                const i = (typeof this.currentSection === 'number' && this.currentSection > 0) ? (this.currentSection - 1) : 0;
                const n = (typeof this.totalSections === 'number' && this.totalSections > 0) ? this.totalSections : 1;
                const afterGen = this.computeSectionCompositePercent(i, n, SEC_GEN);
                this.updateCompositeProgress('script-progress', afterGen);
                
                // Previous sections for context in verification
                const previousSections = [...this.generatedSections]; // Copy current sections before adding this one
                
                // Iterative verification and improvement (up to 3 attempts)
                let finalSectionText = sectionText;
                let attempt = 0;
                const maxAttempts = 3;
                let verificationResult = { isValid: true, feedback: '' };
                
                while (attempt < maxAttempts) {
                    attempt++;
                    // Perform section verification
                    const verificationNotificationId = Date.now();
                    this.notifications.showInfo(`Verifying section ${section.number} quality (attempt ${attempt}/${maxAttempts})...`, verificationNotificationId);
                    
                    verificationResult = await this.verifyScriptSection(
                        finalSectionText,
                        section,
                        previousSections,
                        documentContent,
                        characterData,
                        apiData
                    );
                    
                    // Clear the verification notification
                    this.notifications.clearNotification(verificationNotificationId);
                    
                    // Log verification feedback to console
                    this.logVerificationFeedback(`Section ${section.number} Verification (Attempt ${attempt})`, verificationResult);
                    // Composite progress: after verification stage
                    const afterVer = this.computeSectionCompositePercent(i, n, SEC_GEN + SEC_VER);
                    this.updateCompositeProgress('script-progress', afterVer);
                    
                    if (verificationResult.isValid) {
                        this.notifications.showInfo(`Section ${section.number} verification passed on attempt ${attempt}.`);
                        break;
                    }
                    
                    if (attempt >= maxAttempts) {
                        this.notifications.showInfo(`Max improvement attempts reached for section ${section.number}. Proceeding with best version available.`);
                        break;
                    }
                    
                    // Show improvement notification
                    const improvementNotificationId = Date.now();
                    this.notifications.showInfo(`Improving section ${section.number} (attempt ${attempt}/${maxAttempts})...`, improvementNotificationId);
                    
                    // Attempt to improve the section
                    // Prefer structured JSON for downstream improvement if available
                    const sectionFeedback = (verificationResult && verificationResult.rawJson)
                        ? JSON.stringify(verificationResult.rawJson)
                        : verificationResult.feedback;

                    const improvedSection = await this.improveScriptSection(
                        finalSectionText,
                        sectionFeedback,
                        section,
                        previousSections,
                        documentContent,
                        characterData,
                        apiData
                    );
                    
                    // Clear the improvement notification
                    this.notifications.clearNotification(improvementNotificationId);
                    
                    if (improvedSection && improvedSection.trim() && improvedSection.trim() !== finalSectionText.trim()) {
                        finalSectionText = this.processScriptText(improvedSection);
                        this.notifications.showInfo(`Section ${section.number} improved. Re-verifying...`);
                        // Composite progress: after improvement stage
                        const afterImp = this.computeSectionCompositePercent(i, n, SEC_GEN + SEC_VER + SEC_IMP);
                        this.updateCompositeProgress('script-progress', afterImp);
                    } else {
                        this.notifications.showInfo(`Section ${section.number} did not change after improvement attempt. Stopping further attempts.`);
                        break;
                    }
                }
                // Move to section end
                const afterSection = this.computeSectionCompositePercent(i, n, 1.0);
                this.updateCompositeProgress('script-progress', afterSection);
                
                // Store this section for summary generation
                this.generatedSections.push({
                    number: section.number,
                    title: section.title,
                    content: finalSectionText,
                    verificationResult: verificationResult
                });
                
                // Store the last dialogue exchanges for continuity
                this.lastDialogueExchanges = this.extractLastExchanges(finalSectionText, 2); // Get last 2 exchanges
                
                // Add section content (no separators needed for TTS processing)
                this.appendToScript(finalSectionText);
                
                // Save to storage
                this.saveScriptData();
            } else {
                throw new Error(`No content received from API for section ${section.number}`);
            }
            
        } catch (error) {
            throw error;
        }
    }
    
    /**
     * Build user prompt for script outro
     * @returns {string} - User prompt for outro
     */
    buildOutroUserPrompt() {
    
        return buildScriptOutroUser(this.lastDialogueExchanges);
    }
    
    /**
     * Build system prompt based on part type
     * @param {Object} characterData - Host and guest character data
     * @param {string} partType - Part type (intro, section, lastSection, outro)
     * @param {string} documentContent - Content of the document (optional)
     * @returns {string} - System prompt
     */
    buildSystemPrompt(characterData, partType, documentContent = '') {
    
        const host = characterData.host || {};
        const guest = characterData.guest || {};
        const outlineData = this.storageManager.load('outlineData', {});
        const podcastFocus = outlineData.podcastFocus || '';
        
        return buildScriptSystem(host, guest, podcastFocus, partType, documentContent);
    }
    
    /**
     * Verify script section quality
     * @param {string} sectionText - Section text to verify
     * @param {Object} section - Section data
     * @param {Array} previousSections - Previous sections for context
     * @param {string} documentContent - Content of the document
     * @param {Object} characterData - Host and guest character data
     * @param {Object} apiData - API credentials and model data
     * @returns {Object} - Verification result
     */
    async verifyScriptSection(sectionText, section, previousSections, documentContent, characterData, apiData) {
    
        try {
            // Delegate to ScriptVerifier
            const result = await this.scriptVerifier.verifyScriptSection(
                sectionText,
                section,
                previousSections, 
                documentContent, 
                characterData, 
                apiData,
                this.totalPodcastDuration
            );
            
            return result;
        } catch (error) {
            console.error('Error during section verification:', error);
            // Default to assuming it's valid to avoid blocking workflow
            return { isValid: true, feedback: 'Verification error. Using original section.' };
        }
    }
    
    /**
     * Verify the generated script against the outline and target duration
     * @param {string} scriptText - The generated script text
     * @param {string} outlineText - Original outline content
     * @param {string} documentContent - Original document content
     * @param {Object} characterData - Host and guest character data
     * @param {Object} apiData - API credentials and model data
     * @returns {Object} - Verification result with isValid flag and feedback
     */
    async verifyScript(scriptText, outlineText, documentContent, characterData, apiData) {
    
        try {
            // Delegate to ScriptVerifier
            const result = await this.scriptVerifier.verifyScript(
                scriptText, 
                outlineText, 
                documentContent, 
                characterData, 
                apiData,
                this.totalPodcastDuration
            );
            
            return result;
        } catch (error) {
            console.error('Error during script verification:', error);
            // Default to assuming it's valid to avoid blocking workflow
            return { isValid: true, feedback: 'Verification error. Using original script.' };
        }
    }
    
    /**
     * Verify the script specifically focusing on cross-section issues
     * @param {string} scriptText - The generated script text
     * @param {string} outlineText - Original outline content
     * @param {string} documentContent - Original document content
     * @param {Object} characterData - Host and guest character data
     * @param {Object} apiData - API credentials and model data
     * @returns {Object} - Verification result with isValid flag and feedback
     */
    async verifyScriptForCrossSectionIssues(scriptText, outlineText, documentContent, characterData, apiData) {
    
        try {
            // Delegate to ScriptVerifier
            const result = await this.scriptVerifier.verifyScriptForCrossSectionIssues(
                scriptText, 
                outlineText, 
                documentContent, 
                characterData, 
                apiData,
                this.totalPodcastDuration
            );
            
            return result;
        } catch (error) {
            console.error('Error during cross-section verification:', error);
            // Default to assuming it's valid to avoid blocking workflow
            return { isValid: true, feedback: 'Cross-section verification error.' };
        }
    }
    
    /**
     * Improve cross-section issues in the script based on verification feedback
     * @param {string} originalScriptText - The original script text
     * @param {string} feedback - Feedback from cross-section verification
     * @param {string} outlineText - Original outline content
     * @param {string} documentContent - Original document content
     * @param {Object} characterData - Host and guest character data
     * @param {Object} apiData - API credentials and model data
     * @returns {string} - Improved script text
     */
    async improveCrossSectionIssues(originalScriptText, feedback, outlineText, documentContent, characterData, apiData) {
    
        try {
            // Delegate to ScriptImprover
            const improvedScriptText = await this.scriptImprover.improveCrossSectionIssues(
                originalScriptText,
                feedback,
                outlineText,
                documentContent,
                characterData,
                apiData,
                this.totalPodcastDuration
            );
            
            return this.processScriptText(improvedScriptText);
        } catch (error) {
            console.error('Error during cross-section improvement:', error);
            return originalScriptText; // Return original script if improvement fails
        }
    }
    
    /**
     * Process script text to remove stage directions and ensure proper formatting
     * @param {string} text - Script text to process
     * @returns {string} - Processed text
     */
    processScriptText(text) {
    
        if (!text || typeof text !== 'string') {
            return '';
        }
        
        // Normalize line endings and strip markdown fences
        let processedText = text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            // Remove opening code fences like ```markdown, ``` md, ```
            .replace(/```\s*[a-zA-Z-]*\s*\n?/g, '')
            // Remove any remaining triple backticks
            .replace(/```/g, '')
            // Remove stray lines that only say 'markdown' or 'md'
            .replace(/^(?:markdown|md)\s*$/gim, '');
        
        // Fix cases where separator and label are on the same line (e.g., ---HOST: or --- GUEST:)
        processedText = processedText.replace(/(^|\n)---\s*(HOST|GUEST):/g, '$1---\n$2:');
        
        // Ensure each speaker label is on its own line
        processedText = processedText.replace(/([^\n])\s*(HOST:|GUEST:)/g, '$1\n$2');
        
        // Insert a '---' line immediately before any speaker label that does not already have one
        // Only insert when not already immediately preceded by a separator line
        processedText = processedText.replace(/(^|\n)(?!---\s*\n)(HOST:|GUEST:)/g, '$1---\n$2');
        
        // Collapse any duplicate separators before a label (e.g., "---\n---\nHOST:" => "---\nHOST:")
        processedText = processedText.replace(/(^|\n)(?:---\s*\n)+(?=(HOST:|GUEST:))/g, '$1---\n');
        
        // Remove any stage directions [like this]
        processedText = processedText.replace(/\[[^\]]*\]/g, '');
        
        // Collapse excessive blank lines
        processedText = processedText.replace(/\n{3,}/g, '\n\n');
        
        // Ensure the script starts with the --- marker
        const trimmed = processedText.trimStart();
        if (!trimmed.startsWith('---')) {
            processedText = '---\n' + trimmed;
        } else {
            processedText = trimmed;
        }
        
        // Ensure every '---' is followed by a newline (defensive)
        processedText = processedText.replace(/(^|\n)---\s*(?!\n)/g, '$1---\n');
        
        // Trim excessive trailing newlines and stray trailing separator
        processedText = processedText.replace(/(\n---\s*)+$/g, '');
        processedText = processedText.replace(/\n{3,}$/g, '\n\n');
        
        return processedText;
    }
    
    /**
     * Extract the last few exchanges between HOST and GUEST from a dialogue
     * @param {string} text - The dialogue text to extract from
     * @param {number} exchangeCount - Number of exchanges to extract (an exchange is HOST+GUEST)
     * @returns {string} - The extracted exchanges
     */
    extractLastExchanges(text, exchangeCount = 2) {
    
        if (!text || typeof text !== 'string') {
            return '';
        }
        
        // Split by speaker markers
        const speakerSegments = text.split(/---\s*\n(HOST:|GUEST:)/g);
        
        // Reconstruct properly formatted segments
        const formattedSegments = [];
        for (let i = 1; i < speakerSegments.length; i += 2) {
            if (i+1 < speakerSegments.length) {
                formattedSegments.push(`---\n${speakerSegments[i]}${speakerSegments[i+1].trim()}`);
            }
        }
        
        // Get the last N exchanges (HOST+GUEST pairs)
        const totalPairs = Math.floor(formattedSegments.length / 2);
        const pairsToKeep = Math.min(exchangeCount, totalPairs);
        
        if (pairsToKeep === 0) {
            return '';
        }
        
        const startIdx = formattedSegments.length - (pairsToKeep * 2);
        const lastExchanges = formattedSegments.slice(startIdx);
        
        return lastExchanges.join('\n\n');
    }
    
    /**
     * Update conversation summary for context in next section
     * @param {Object} apiData - API credentials and model data
     */
    /**
     * Build conversation summary prompt
     * @param {Object} lastSection - Last generated section
     * @returns {string} - Prompt for conversation summarization
     */
    buildConversationSummaryPrompt(lastSection) {
    
        return buildConversationSummaryUser(lastSection.content);
    }
    
    async updateConversationSummary(apiData) {
    
        try {
            // If we don't have any generated sections yet, skip
            if (this.generatedSections.length === 0) {
                return;
            }
            
            // Get the most recent section
            const lastSection = this.generatedSections[this.generatedSections.length - 1];
            
            // Enhanced prompt for structured summarization
            const prompt = this.buildConversationSummaryPrompt(lastSection);
            
            // Create message array
            const messages = [
                { role: 'system', content: buildConversationSummarySystem() },
                { role: 'user', content: prompt }
            ];
            
            // Configure options
            const options = {
                /*maxTokens: 300,*/
                temperature: 0.5
            };
            
            // Get request body using the OpenAIManager helper
            const requestBody = this.apiManager.createRequestBody(
                apiData.models.outline, // Using outline model for summarization
                messages,
                options
            );
            
            // updateConversationSummary: Call OpenAI API for summarization with retry logic
            const responseData = await this.apiManager.createChatCompletion(requestBody, apiData.apiKey);
            
            const summary = responseData.choices[0]?.message?.content?.trim();
            
            // Track token usage if available
            if (responseData.usage) {
                const modelName = apiData.models.outline;
                const promptTokens = responseData.usage.prompt_tokens || 0;
                const completionTokens = responseData.usage.completion_tokens || 0;
                
                // Track usage via API manager
                this.apiManager.trackCompletionUsage(modelName, promptTokens, completionTokens);
            }
            
            if (summary) {
                // Parse the structured summary
                const summaryMatch = summary.match(/SUMMARY:\s*(.*?)(?=\n\n|\n?TOPICS COVERED:)/s);
                const topicsMatch = summary.match(/TOPICS COVERED:\s*([\s\S]*?)(?=\n\n|$)/s);
                
                const generalSummary = summaryMatch ? summaryMatch[1].trim() : summary;
                const topicsText = topicsMatch ? topicsMatch[1].trim() : '';
                
                // Store both general summary and structured topics
                this.conversationSummary = generalSummary;
                this.topicsSummary = topicsText; // New property to store topics
                
                // Store the last section summary
                this.lastSectionSummary = generalSummary;

                // Append to cumulative arrays (no size caps)
                this.allSectionSummaries.push({
                    number: lastSection.number,
                    title: lastSection.title,
                    summary: generalSummary
                });
                this.allTopicsCovered.push({
                    number: lastSection.number,
                    title: lastSection.title,
                    topics: topicsText
                });
            }
            
        } catch (error) {
            // Just log the error but don't fail the whole process
            console.error('Error generating conversation summary:', error);
        }
    }
    
    /**
     * Extract key facts from outline section content
     * @param {string} sectionContent - Section content from outline
     * @returns {string} - Extracted key facts
     */
    extractKeyFacts(sectionContent) {
    
        const keyFactsMatch = sectionContent.match(/KEY FACTS:\s*([\s\S]*?)(?=\n\nUNIQUE FOCUS:|\n\nCARRYOVER:|$)/s);
        return keyFactsMatch ? keyFactsMatch[1].trim() : 'No specific key facts provided';
    }
    
    /**
     * Extract unique focus from outline section content
     * @param {string} sectionContent - Section content from outline
     * @returns {string} - Extracted unique focus
     */
    extractUniqueFocus(sectionContent) {
    
        const uniqueFocusMatch = sectionContent.match(/UNIQUE FOCUS:\s*(.*?)(?=\n\nCARRYOVER:|\n\n|$)/s);
        return uniqueFocusMatch ? uniqueFocusMatch[1].trim() : 'No unique focus specified';
    }
    
    /**
     * Extract carryover topics from outline section content
     * @param {string} sectionContent - Section content from outline
     * @returns {string} - Extracted carryover topics
     */
    extractCarryover(sectionContent) {
    
        const carryoverMatch = sectionContent.match(/CARRYOVER:\s*(.*?)(?=\n\n|$)/s);
        return carryoverMatch ? carryoverMatch[1].trim() : 'No carryover topics';
    }
    
    /**
     * Append text to script textarea
     * @param {string} text - Text to append
     */
    appendToScript(text) {
    
        if (this.scriptTextarea) {
            if (this.scriptTextarea.value && !this.scriptTextarea.value.endsWith('\n\n')) {
                this.scriptTextarea.value += '\n\n';
            }
            this.scriptTextarea.value += text;
            
            // Scroll to bottom
            this.scriptTextarea.scrollTop = this.scriptTextarea.scrollHeight;
        }
    }
    
    /**
     * Save script data to storage
     */
    saveScriptData() {
    
        const scriptData = {
            script: this.scriptTextarea.value,
            timestamp: new Date().toISOString()
        };
        
        this.storageManager.save('scriptData', scriptData);
        this.scriptData = this.scriptTextarea.value;
    }
    
    /**
     * Handle API error response
     * @param {Response} response - Fetch API response
     */
    async handleApiError(response) {
    
        let errorMessage = 'Failed to generate script';
        
        if (response.status === 401) {
            errorMessage = 'Invalid API key. Please check your credentials.';
        } else if (response.status === 429) {
            errorMessage = 'API rate limit exceeded. Please try again later.';
        } else {
            const errorData = await response.json().catch(() => ({}));
            errorMessage = errorData.error?.message || errorMessage;
        }
        
        throw new Error(errorMessage);
    }
    
    /**
     * Log verification feedback to console in a nicely formatted way
     * @param {string} title - Title for the log group
     * @param {Object} result - Verification result object with isValid and feedback properties
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
            `%cValidation: ${result.isValid ? 'PASSED ✅' : 'NEEDS IMPROVEMENT ⚠️'}`,
            validStyle
        );
        
        // Log the feedback with nice formatting
        console.log('%cFeedback:', 'font-weight: bold;');
        if (typeof result.feedback === 'string') {
            console.log(`%c${result.feedback}`, feedbackStyle);
        } else {
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
     * Improve a single script section based on verification feedback
     * @param {string} sectionText - The original section text
     * @param {string} feedback - Feedback from verification
     * @param {Object} section - The outline section data
     * @param {Array} previousSections - Array of previously generated sections
     * @param {string} documentContent - Original document content
     * @param {Object} characterData - Host and guest character data
     * @param {Object} apiData - API credentials and model data
     * @returns {string} - Improved section text
     */
    async improveScriptSection(sectionText, feedback, section, previousSections, documentContent, characterData, apiData) {
    
        try {
            // Format previously covered topics for continuity checking
            let previousTopics = '';
            if (previousSections && previousSections.length > 0) {
                previousTopics = previousSections.map(prevSection => 
                    `Section ${prevSection.number}: ${prevSection.title}`
                ).join('\n');
            }
            
            // Delegate to ScriptImprover
            const improvedSectionText = await this.scriptImprover.improveScriptSection(
                sectionText,
                feedback,
                section,
                documentContent,
                characterData,
                apiData,
                this.totalPodcastDuration
            );
            
            return improvedSectionText;
        } catch (error) {
            console.error('Error during section improvement:', error);
            return sectionText; // Return original section if improvement fails
        }
    }
    
    /**
     * Verify a single script section against its outline section and requirements
     * @param {string} sectionText - The generated section text
     * @param {Object} section - The outline section data
     * @param {Array} previousSections - Array of previously generated sections
     * @param {string} documentContent - Original document content
     * @param {Object} characterData - Host and guest character data
     * @param {Object} apiData - API credentials and model data
     * @returns {Object} - Verification result with isValid flag and feedback
     */
    async verifyScriptSection(sectionText, section, previousSections, documentContent, characterData, apiData) {
    
        try {
            // Delegate to ScriptVerifier
            const result = await this.scriptVerifier.verifyScriptSection(
                sectionText,
                section,
                previousSections, 
                documentContent, 
                characterData, 
                apiData,
                this.totalPodcastDuration
            );
            
            return result;
        } catch (error) {
            console.error('Error during section verification:', error);
            // Default to assuming it's valid to avoid blocking workflow
            return { isValid: true, feedback: 'Verification error. Using original section.' };
        }
    }
    
    /**
     * Verify the generated script against the outline and target duration
     * @param {string} scriptText - The generated script text
     * @param {string} outlineText - Original outline content
     * @param {string} documentContent - Original document content
     * @param {Object} characterData - Host and guest character data
     * @param {Object} apiData - API credentials and model data
     * @returns {Object} - Verification result with isValid flag and feedback
     */
    async verifyScript(scriptText, outlineText, documentContent, characterData, apiData) {
    
        try {
            // Delegate to ScriptVerifier
            const result = await this.scriptVerifier.verifyScript(
                scriptText, 
                outlineText, 
                documentContent, 
                characterData, 
                apiData,
                this.totalPodcastDuration
            );
            
            return result;
        } catch (error) {
            console.error('Error during script verification:', error);
            // Default to assuming it's valid to avoid blocking workflow
            return { isValid: true, feedback: 'Verification error. Using original script.' };
        }
    }
    
    /**
     * Verify the script specifically focusing on cross-section issues
     * @param {string} scriptText - The generated script text
     * @param {string} outlineText - Original outline content
     * @param {string} documentContent - Original document content
     * @param {Object} characterData - Host and guest character data
     * @param {Object} apiData - API credentials and model data
     * @returns {Object} - Verification result with isValid flag and feedback
     */
    async verifyScriptForCrossSectionIssues(scriptText, outlineText, documentContent, characterData, apiData) {
    
        try {
            // Delegate to ScriptVerifier
            const result = await this.scriptVerifier.verifyScriptForCrossSectionIssues(
                scriptText, 
                outlineText, 
                documentContent, 
                characterData, 
                apiData,
                this.totalPodcastDuration
            );
            
            return result;
        } catch (error) {
            console.error('Error during cross-section verification:', error);
            // Default to assuming it's valid to avoid blocking workflow
            return { isValid: true, feedback: 'Cross-section verification error.' };
        }
    }
    
    /**
     * Improve cross-section issues in the script based on verification feedback
     * @param {string} originalScriptText - The original script text
     * @param {string} feedback - Feedback from cross-section verification
     * @param {string} outlineText - Original outline content
     * @param {string} documentContent - Original document content
     * @param {Object} characterData - Host and guest character data
     * @param {Object} apiData - API credentials and model data
     * @returns {string} - Improved script text
     */
    async improveCrossSectionIssues(originalScriptText, feedback, outlineText, documentContent, characterData, apiData) {
    
        try {
            // Delegate to ScriptImprover
            const improvedScriptText = await this.scriptImprover.improveCrossSectionIssues(
                originalScriptText,
                feedback,
                outlineText,
                documentContent,
                characterData,
                apiData,
                this.totalPodcastDuration
            );
            
            return improvedScriptText;
        } catch (error) {
            console.error('Error during cross-section improvement:', error);
            return originalScriptText; // Return original script if improvement fails
        }
    }
    


}

export default ScriptGenerator;
