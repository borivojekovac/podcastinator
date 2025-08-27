// Podcastinator App - Script Generator
import NotificationsManager from '../ui/notifications.js';
import ProgressManager from '../ui/progressManager.js';
import ScriptVerifier from './scriptVerifier.js';
import ScriptImprover from './scriptImprover.js';
import {
    getSectionGenerateUser,
    getSummaryGenerateSystem,
    getSummaryGenerateUser,
    getSectionGenerateSystem
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
        // Cross-section review diagnostics (persisted)
        this.crossSectionReview = null;
        
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

            // Make textarea read-only and add loading animation
            if (this.scriptTextarea) {
                this.scriptTextarea.readOnly = true;
                this.scriptTextarea.classList.add('is-loading');
                this.scriptTextarea.setAttribute('aria-busy', 'true');
            }
        } else {
            // Reset UI
            if (this.generateButton) {
                this.generateButton.disabled = false;
            }
            if (this.progressContainer) {
                this.progressContainer.style.display = 'none';
            }

            // Restore textarea interactivity and remove loading animation
            if (this.scriptTextarea) {
                this.scriptTextarea.readOnly = false;
                this.scriptTextarea.classList.remove('is-loading');
                this.scriptTextarea.removeAttribute('aria-busy');
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
        const sectionStrings = outlineText.split(/^\s*---\s*$/m).filter(function(section) { return section.trim(); });
        
        console.log('Found', sectionStrings.length, 'top-level blocks');
        
        // Track total duration for validation
        let totalDuration = 0;
        const sections = [];

        // Helper: parse a numeric duration string within a slice
        function parseDurationMinutes(slice) {
            const durationMatch = slice.match(/Duration:\s*(\d+(?:\.\d+)?)\s*(seconds?|secs?|s|minutes?|mins?|min|m)?/mi);
            if (!durationMatch) {
                return null;
            }
            const value = parseFloat(durationMatch[1]);
            const unitRaw = (durationMatch[2] || '').trim().toLowerCase();
            if (!unitRaw || unitRaw.startsWith('m')) {
                return value;
            }
            if (unitRaw.startsWith('s')) {
                return value / 60;
            }
            return value;
        }

        // For each block, further split by numbered headings (supports 1., 3.1., 4.2.1 etc.)
        for (let b = 0; b < sectionStrings.length; b++) {
            const block = sectionStrings[b];
            // Find all heading matches with their positions
            const headingRegex = /^\s*(\d+(?:\.\d+)*)\.\s+([^\r\n]+)/gm;
            const matches = [];
            let m;
            while ((m = headingRegex.exec(block)) !== null) {
                matches.push({ number: m[1], title: m[2], index: m.index });
            }

            if (matches.length === 0) {
                // No numbered headings; try to parse the whole block as a single section only if it has a duration
                const dur = parseDurationMinutes(block);
                if (dur != null) {
                    totalDuration += dur;
                    sections.push({
                        id: sections.length + 1,
                        number: `${sections.length + 1}`,
                        title: 'Section',
                        durationMinutes: dur,
                        overview: (block.match(/Overview:\s*([^\r\n]+)/m) || [null, 'No overview provided'])[1],
                        content: block.trim()
                    });
                }
                continue;
            }

            // Create slices per heading
            for (let i = 0; i < matches.length; i++) {
                const start = matches[i].index;
                const end = (i + 1 < matches.length) ? matches[i + 1].index : block.length;
                const slice = block.slice(start, end);

                // Determine if this heading has children within the same block (e.g., 3. -> 3.1, 3.2)
                let hasChildrenInBlock = false;
                for (let j = i + 1; j < matches.length; j++) {
                    const childPrefix = matches[i].number + '.';
                    if (matches[j].number.startsWith(childPrefix)) {
                        hasChildrenInBlock = true;
                        break;
                    }
                    // Headings are ordered; if the next heading no longer shares the prefix, we can stop checking
                    if (!matches[j].number.startsWith(matches[i].number)) {
                        break;
                    }
                }

                // If this heading has children, treat it as a container only and skip creating a section for it
                if (hasChildrenInBlock) {
                    continue;
                }

                // Require a duration for a slice to be treated as an actual section
                const durationMinutes = parseDurationMinutes(slice);
                if (durationMinutes == null) {
                    // Skip heading without explicit duration (e.g., a parent heading like "3. Common ...")
                    continue;
                }

                totalDuration += durationMinutes;
                const overviewMatch = slice.match(/Overview:\s*([^\r\n]+)/m);
                sections.push({
                    id: sections.length + 1,
                    number: matches[i].number,
                    title: matches[i].title,
                    durationMinutes: durationMinutes,
                    overview: overviewMatch ? overviewMatch[1] : 'No overview provided',
                    content: slice.trim()
                });
                console.log(`Section ${sections.length}: ${matches[i].number}. ${matches[i].title} (${durationMinutes} min)`);
            }
        }
        
        // Post-process to ensure only leaf sections remain across ALL blocks.
        // If any section number is a strict prefix of another section's number, treat it as a parent and remove it.
        const leafSections = sections.filter(function isLeaf(section) {
            const prefix = section.number + '.';
            return !sections.some(function hasChild(other) {
                return other !== section && other.number.startsWith(prefix);
            });
        });

        // Recompute total duration from leaf sections only
        const leafTotalDuration = leafSections.reduce(function sum(acc, s) {
            return acc + (s.durationMinutes || 0);
        }, 0);

        // Store the total duration for use in prompts
        this.totalPodcastDuration = leafTotalDuration;
        console.log('Total parsed sections:', leafSections.length, '| Total minutes:', leafTotalDuration);
        
        return leafSections;
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
                if (this.cancelGeneration) {
                    this.cancelGeneration = false;
                    throw new Error('Script generation cancelled');
                }
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
            let finalVerificationResult = { isValid: true, summary: '' };
            const csCandidates = [];
            const csAttemptDetails = [];
            
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
                
                // Respect cancellation immediately after cross-section verification completes
                if (this.cancelGeneration) {
                    this.cancelGeneration = false;
                    throw new Error('Script generation cancelled');
                }
                
                // Log verification summary
                this.logVerificationFeedback(`Final Cross-Section Review (Attempt ${csAttempt})`, finalVerificationResult);
                // Mark completion of full-script verification phase
                this.updateCompositeProgress('script-progress', afterFullVerify);
                
                // Compute and record score for this cross-section attempt
                const csScore = this.computeSectionScore(finalVerificationResult);
                csCandidates.push({ text: finalScript, score: csScore, verificationResult: finalVerificationResult, attempt: csAttempt });
                const csIssuesCount = Array.isArray(finalVerificationResult.issues) ? finalVerificationResult.issues.length : 0;
                csAttemptDetails.push({ attempt: csAttempt, score: csScore, isValid: !!finalVerificationResult.isValid, issuesCount: csIssuesCount });
                
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
                    : finalVerificationResult.summary;

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
                
                // Respect cancellation immediately after cross-section improvement completes
                if (this.cancelGeneration) {
                    this.cancelGeneration = false;
                    throw new Error('Script generation cancelled');
                }
                
                if (improvedScript && improvedScript.trim() && improvedScript.trim() !== finalScript.trim()) {
                    finalScript = improvedScript;
                    // Update the UI with the latest cross-section improved script without disturbing user view
                    this.updateScriptViewPreservingUserState(function updateValue(textarea) {
                        textarea.value = finalScript;
                    });
                    this.notifications.showInfo('Cross-section improvements applied. Re-reviewing...');
                } else {
                    this.notifications.showInfo('Cross-section improvement produced no changes. Stopping further attempts.');
                    break;
                }
            }
            
            // Choose and apply the best cross-section candidate (lowest score wins)
            const bestCross = this.selectBestSectionCandidate(csCandidates);
            const chosenFinalScript = bestCross ? bestCross.text : finalScript;
            // Persist cross-section diagnostics summary similar to per-section attempts
            this.crossSectionReview = {
                attempts: csAttemptDetails,
                chosen: bestCross ? {
                    attempt: bestCross.attempt,
                    score: bestCross.score,
                    issuesCount: Array.isArray(bestCross.verificationResult && bestCross.verificationResult.issues) ? bestCross.verificationResult.issues.length : 0,
                    isValid: !!(bestCross.verificationResult && bestCross.verificationResult.isValid)
                } : null,
                totalAttempts: csAttempt,
                candidatesCount: Array.isArray(csCandidates) ? csCandidates.length : 0
            };
            // Update the textarea with the best-scoring final script
            this.updateScriptViewPreservingUserState(function applyFinal(textarea) {
                textarea.value = chosenFinalScript;
            });
            finalScript = chosenFinalScript;
            // Optionally persist cross-section attempt metadata for diagnostics
            // Not stored per-section; can be extended to store globally if desired
            this.saveScriptData();
            // Final progress/size log
            this.logScriptProgress();
            
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

        return getSectionGenerateUser(
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
            
            // Get language setting from scriptData storage
            const scriptStore = this.storageManager.load('scriptData', {});
            const scriptLanguage = scriptStore.language || 'english';
            
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
                let verificationResult = { isValid: true, summary: '' };
                const candidates = [];
                const attemptDetails = [];
                
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
                    
                    // Respect cancellation immediately after verification completes
                    if (this.cancelGeneration) {
                        this.cancelGeneration = false;
                        throw new Error('Script generation cancelled');
                    }
                    
                    // Log verification summary to console
                    this.logVerificationFeedback(`Section ${section.number} Verification (Attempt ${attempt})`, verificationResult);
                    // Composite progress: after verification stage
                    const afterVer = this.computeSectionCompositePercent(i, n, SEC_GEN + SEC_VER);
                    this.updateCompositeProgress('script-progress', afterVer);

                    // Compute and record score for this attempt
                    const score = this.computeSectionScore(verificationResult);
                    candidates.push({ text: finalSectionText, score: score, verificationResult: verificationResult, attempt: attempt });
                    attemptDetails.push({ attempt: attempt, score: score, isValid: !!verificationResult.isValid, issuesCount: Array.isArray(verificationResult.issues) ? verificationResult.issues.length : 0 });

                    // Show interim version of script including current best for this section
                    this.renderInterimWithCurrentSection(finalSectionText);
                    
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
                        : verificationResult.summary;

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
                    
                    // Respect cancellation immediately after improvement completes
                    if (this.cancelGeneration) {
                        this.cancelGeneration = false;
                        throw new Error('Script generation cancelled');
                    }
                    
                    if (improvedSection && improvedSection.trim() && improvedSection.trim() !== finalSectionText.trim()) {
                        finalSectionText = this.processScriptText(improvedSection);
                        this.notifications.showInfo(`Section ${section.number} improved. Re-verifying...`);
                        // Composite progress: after improvement stage
                        const afterImp = this.computeSectionCompositePercent(i, n, SEC_GEN + SEC_VER + SEC_IMP);
                        this.updateCompositeProgress('script-progress', afterImp);
                        // Update interim preview after improvement
                        this.renderInterimWithCurrentSection(finalSectionText);
                    } else {
                        this.notifications.showInfo(`Section ${section.number} did not change after improvement attempt. Stopping further attempts.`);
                        break;
                    }
                }
                // Move to section end
                const afterSection = this.computeSectionCompositePercent(i, n, 1.0);
                this.updateCompositeProgress('script-progress', afterSection);
                
                // Choose the best-scored candidate (lowest score wins)
                const best = this.selectBestSectionCandidate(candidates);
                const chosenText = best ? best.text : finalSectionText;
                const chosenVerification = best ? best.verificationResult : verificationResult;
                const chosenScore = best ? best.score : this.computeSectionScore(verificationResult);

                // Store this section for summary generation, including scoring details
                this.generatedSections.push({
                    number: section.number,
                    title: section.title,
                    content: chosenText,
                    verificationResult: chosenVerification,
                    score: chosenScore,
                    attempts: attemptDetails
                });
                
                // Store the last dialogue turns for continuity
                this.lastDialogueExchanges = this.extractLastExchanges(chosenText, 3); // Get last 3 turns
                
                // Add section content (no separators needed for TTS processing)
                this.appendToScript(chosenText);
                
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
        
        return getSectionGenerateSystem(host, guest, podcastFocus, partType, documentContent);
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
            return { isValid: true, summary: 'Verification error. Using original section.' };
        }
    }

    /**
     * Compute a numeric score for a verification result.
     * Lower is better. Severity weights: critical=5, major=3, minor=1.
     * Unknown severities default to 2.
     * @param {Object} verificationResult
     * @returns {number}
     */
    computeSectionScore(verificationResult) {
    
        if (!verificationResult || !Array.isArray(verificationResult.issues)) {
            return verificationResult && verificationResult.isValid ? 0 : 1;
        }
        let score = 0;
        for (let idx = 0; idx < verificationResult.issues.length; idx++) {
            const issue = verificationResult.issues[idx] || {};
            const sev = (issue.severity || '').toLowerCase();
            let weight = 2;
            if (sev === 'critical') {
                weight = 5;
            } else if (sev === 'major') {
                weight = 3;
            } else if (sev === 'minor') {
                weight = 1;
            }
            score += weight;
        }
        return score;
    }

    /**
     * Select the best section candidate with the lowest score.
     * Ties are broken by fewer issues (if available) then by later attempt number.
     * @param {Array} candidates - [{ text, score, verificationResult, attempt }]
     * @returns {Object|null}
     */
    selectBestSectionCandidate(candidates) {
    
        if (!Array.isArray(candidates) || candidates.length === 0) {
            return null;
        }
        let best = candidates[0];
        for (let i = 1; i < candidates.length; i++) {
            const c = candidates[i];
            if (c.score < best.score) {
                best = c;
                continue;
            }
            if (c.score === best.score) {
                const cIssues = Array.isArray(c.verificationResult && c.verificationResult.issues) ? c.verificationResult.issues.length : 0;
                const bIssues = Array.isArray(best.verificationResult && best.verificationResult.issues) ? best.verificationResult.issues.length : 0;
                if (cIssues < bIssues || (cIssues === bIssues && c.attempt > best.attempt)) {
                    best = c;
                }
            }
        }
        return best;
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
     * Extract the last few turns between HOST and GUEST from a dialogue.
     * Each "turn" is a single speaker block (HOST or GUEST).
     * @param {string} text - The dialogue text to extract from
     * @param {number} exchangeCount - Number of turns to extract (last N speaker turns)
     * @returns {string} - The extracted turns, preserving clean formatting
     */
    extractLastExchanges(text, exchangeCount = 3) {
    
        if (!text || typeof text !== 'string') {
            return '';
        }
        
        // Split by speaker markers
        const speakerSegments = text.split(/---\s*\n(HOST:|GUEST:)/g);
        
        // Reconstruct properly formatted segments
        const formattedSegments = [];
        for (let i = 1; i < speakerSegments.length; i += 2) {
            if (i+1 < speakerSegments.length) {
                // Ensure exactly one newline after the label and normalize body whitespace
                const label = String(speakerSegments[i] || '');
                const body = String(speakerSegments[i+1] || '')
                    .replace(/^\s+/, '')   // remove leading whitespace/newlines
                    .replace(/\s+$/, '');  // remove trailing whitespace/newlines
                formattedSegments.push(`---\n${label}\n${body}`);
            }
        }
        
        // Get the last N turns (speaker blocks)
        const turnsToKeep = Math.min(Math.max(0, exchangeCount | 0), formattedSegments.length);
        if (turnsToKeep === 0) {
            return formattedSegments.length > 0 ? formattedSegments[formattedSegments.length - 1] : '';
        }
        const startIdx = formattedSegments.length - turnsToKeep;
        const lastExchanges = formattedSegments.slice(startIdx);
        
        // Join with a single blank line between segments
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
    
        return getSummaryGenerateUser(lastSection.content);
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
                { role: 'system', content: getSummaryGenerateSystem() },
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
            const selfRef = this;
            this.updateScriptViewPreservingUserState(function append(textarea) {
                if (textarea.value && !textarea.value.endsWith('\n\n')) {
                    textarea.value += '\n\n';
                }
                textarea.value += text;
            });
            // Log progress and size metrics after each update
            this.logScriptProgress();
        }
    }

    /**
     * Render interim view combining finalized sections with a pending section text.
     * Does not persist to storage. Preserves user scroll/selection.
     * @param {string} currentSectionText
     */
    renderInterimWithCurrentSection(currentSectionText) {
        if (!this.scriptTextarea) {
            return;
        }
        const base = this.getCompiledScriptFromGeneratedSections();
        const pending = currentSectionText || '';
        const preview = base ? (base + (base.endsWith('\n\n') ? '' : '\n\n') + pending) : pending;
        this.updateScriptViewPreservingUserState(function previewSetter(textarea) {
            textarea.value = preview;
        });
    }

    /**
     * Build combined script from already finalized generated sections.
     * @returns {string}
     */
    getCompiledScriptFromGeneratedSections() {
        if (!Array.isArray(this.generatedSections) || this.generatedSections.length === 0) {
            return '';
        }
        const parts = [];
        for (let idx = 0; idx < this.generatedSections.length; idx++) {
            const s = this.generatedSections[idx];
            if (s && typeof s.content === 'string' && s.content.trim()) {
                parts.push(s.content.trim());
            }
        }
        return parts.join('\n\n');
    }

    /**
     * Update textarea value while preserving user's scroll position and selection.
     * Also keeps bottom stickiness if user was at bottom pre-update.
     * @param {(textarea: HTMLTextAreaElement) => void} mutator
     */
    updateScriptViewPreservingUserState(mutator) {
        const ta = this.scriptTextarea;
        if (!ta || typeof mutator !== 'function') {
            return;
        }
        const prevScrollTop = ta.scrollTop;
        const prevScrollHeight = ta.scrollHeight;
        const prevClientHeight = ta.clientHeight;
        const atBottom = (prevScrollTop + prevClientHeight) >= (prevScrollHeight - 4);
        const selStart = ta.selectionStart;
        const selEnd = ta.selectionEnd;
        const hadFocus = (document.activeElement === ta);

        mutator(ta);

        // Restore selection if possible
        try {
            if (typeof selStart === 'number' && typeof selEnd === 'number') {
                ta.selectionStart = Math.min(selStart, ta.value.length);
                ta.selectionEnd = Math.min(selEnd, ta.value.length);
            }
        } catch (e) {
            // ignore selection restore issues
        }

        // Restore focus
        if (hadFocus) {
            ta.focus();
        }

        // Preserve scroll position unless user was at bottom, then keep pinned to bottom
        if (atBottom) {
            ta.scrollTop = ta.scrollHeight;
        } else {
            ta.scrollTop = prevScrollTop;
        }
    }

    /**
     * Log progress percentage and script size metrics to console
     */
    logScriptProgress() {
    
        if (!this.scriptTextarea) {
            return;
        }
        const text = this.scriptTextarea.value || '';
        const chars = text.length;
        const words = this.countWords(text);
        const minutes = (words / 160);
        const percent = (typeof this._lastProgress === 'number') ? this._lastProgress : 0;

        // Nicely formatted console output
        const titleStyle = 'font-weight: bold; color: #6c5ce7;';
        const metricStyle = 'color: #2d3436;';
        console.group(`%cScript Progress`, titleStyle);
        console.log('%cPercent:', titleStyle, `${percent}%`);
        console.log('%cCharacters:', metricStyle, chars);
        console.log('%cWords:', metricStyle, words);
        console.log('%cMinutes (approx @160 wpm):', metricStyle, minutes.toFixed(2));
        console.groupEnd();
    }

    /**
     * Count words from a text content
     * @param {string} text
     * @returns {number}
     */
    countWords(text) {
    
        if (!text) {
            return 0;
        }
        const tokens = text.trim().split(/\s+/);
        return tokens.filter(function onlyWords(t) { return t.length > 0; }).length;
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
     * @param {Object} result - Verification result object with isValid and summary properties
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
        
        // Log the summary with nice formatting
        console.log('%cSummary:', 'font-weight: bold;');
        console.dir(result, { depth: null });
        const summaryText = (typeof result.summary === 'string') ? result.summary : (typeof result.feedback === 'string' ? result.feedback : '');
        if (summaryText) {
            console.log(`%c${summaryText}`, feedbackStyle);
        } else {
            try {
                const pretty = JSON.stringify(result.summary || result.feedback || {}, null, 2);
                console.log(`%c${pretty}`, feedbackStyle);
            } catch (e) {
                console.dir(result.summary || result.feedback, { depth: null });
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
