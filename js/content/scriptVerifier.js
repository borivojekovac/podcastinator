// Podcastinator App - Script Verification Module
import NotificationsManager from '../ui/notifications.js';
import {
    buildScriptSectionVerificationSystem,
    buildScriptSectionVerificationUser,
    buildScriptCrossSectionVerificationSystem,
    buildScriptCrossSectionVerificationUser
} from './prompts/scriptPrompts.js';

/**
 * ScriptVerifier class
 * Handles verification of podcast scripts against outlines, documents, and quality criteria
 */
class ScriptVerifier {

    /**
     * Create a new ScriptVerifier instance
     * @param {Object} apiManager - The API manager instance for OpenAI calls
     */
    constructor(apiManager) {
    
        this.apiManager = apiManager;
        this.notifications = new NotificationsManager();
    }
    
    /**
     * Log verification feedback to console in a nicely formatted way
     * @param {string} title - Title for the log group
     * @param {Object} result - Verification result object with isValid and feedback properties
     */
    logVerificationFeedback(title, result) {
    
        console.group(`🔍 ${title}`);
        console.log(`✅ Valid: ${result.isValid}`);
        console.log(`💬 Feedback: ${result.feedback}`);
        console.groupEnd();
    }
    
    /**
     * Verify a single script section against its outline section and requirements
     * @param {string} sectionText - The generated section text
     * @param {Object} section - The outline section data
     * @param {Array} previousSections - Array of previously generated sections
     * @param {string} documentContent - Original document content
     * @param {Object} characterData - Host and guest character data
     * @param {Object} apiData - API credentials and model data
     * @param {number} totalPodcastDuration - Total podcast duration in minutes
     * @returns {Object} - Verification result with isValid flag, feedback, issues, and rawJson when available
     */
    async verifyScriptSection(sectionText, section, previousSections, documentContent, characterData, apiData, totalPodcastDuration) {
    
        try {
            // Get model name in lowercase for easier comparison
            const modelName = apiData.models.scriptVerify.toLowerCase();
            const isAnthropicStyle = modelName.includes('o3') || modelName.includes('o4');
            
            // Helpers: word counting and duration issue injection
            function computeWordCount(input) {
            
                if (!input || typeof input !== 'string') {
                    return 0;
                }
                // Normalize newlines
                let t = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
                // Remove separators-only lines
                t = t.replace(/^---\s*$/gm, '');
                // Remove speaker labels at line starts
                t = t.replace(/^HOST\s*:\s*/gm, '').replace(/^GUEST\s*:\s*/gm, '');
                // Remove stage directions like [laughs]
                t = t.replace(/\[[^\]]+\]/g, '');
                // Collapse multiple whitespace
                t = t.replace(/\s+/g, ' ').trim();
                // Word-like tokens (basic latin + common accented letters + digits)
                const matches = t.match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9]+(?:'[A-Za-zÀ-ÖØ-öø-ÿ0-9]+)?/g);
                return matches ? matches.length : 0;
            }

            function ensureDurationIssue(resultJsonObj, targetWords, actualWords) {
            
                if (!resultJsonObj) {
                    return;
                }
                if (!Array.isArray(resultJsonObj.issues)) {
                    resultJsonObj.issues = [];
                }
                const hasDuration = resultJsonObj.issues.some(function(issue) { return issue && issue.category === 'DURATION'; });
                // Allow a small tolerance ~80 words (~0.5 minute at 160 wpm)
                const tolerance = 160 / 2;
                if (Math.abs(actualWords - targetWords) > tolerance && !hasDuration) {
                    const underTarget = actualWords < targetWords;
                    const delta = Math.abs(targetWords - actualWords);
                    const deficit = targetWords - actualWords; // may be negative when over target
                    const issue = {
                        category: 'DURATION',
                        severity: 'critical',
                        description: `Word count ${actualWords} ${underTarget ? '<' : '>'} target ${targetWords} (${underTarget ? 'short by' : 'over by'} ${delta}).`,
                        evidence: `Overall script length across HOST and GUEST turns is ${underTarget ? 'under' : 'over'} target.`,
                        fix: underTarget
                            ? 'Expand GUEST answers with concrete examples and add one brief HOST follow-up to reach target words.'
                            : 'Tighten GUEST answers (remove redundancy) and keep HOST follow-ups concise to reduce word count.',
                        actions: underTarget
                            ? [
                                'Add 2–4 sentences of expert, document-grounded elaboration in a GUEST turn that explains the core point',
                                'Add a short HOST follow-up question prompting one more concise GUEST explanation'
                              ]
                            : [
                                'Remove redundant or repetitive sentences in a GUEST turn while preserving unique information',
                                'Merge or shorten a HOST prompt to be more concise',
                                'Replace verbose phrasing with tighter wording without losing meaning'
                              ],
                        notes: 'Aim to meet target duration with substance; prefer clarity over filler.'
                    };
                    resultJsonObj.issues.push(issue);
                    // Force invalid due to hard duration requirement
                    resultJsonObj.isValid = false;
                }
            }

            const wordTarget = Math.round(((section && section.durationMinutes) ? section.durationMinutes : 0) * 160);
            const wordCount = computeWordCount(sectionText);

            // Create prompts via builders
            const systemPrompt = buildScriptSectionVerificationSystem();
            // Determine last previous section TEXT (builder expects string)
            let previousSectionText = '';
            if (previousSections && previousSections.length > 0) {
                const last = previousSections[previousSections.length - 1];
                if (typeof last === 'string') {
                    previousSectionText = last;
                } else if (last && typeof last === 'object') {
                    previousSectionText = last.content || last.text || '';
                }
            }
            const userPrompt = buildScriptSectionVerificationUser(
                section,
                sectionText,
                documentContent,
                totalPodcastDuration,
                previousSectionText
            );
            
            // Create messages array
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ];
            
            // Configure options with lower temperature for consistent evaluation
            const options = {
                temperature: 0.3
            };
            
            // Get request body using the OpenAIManager helper
            const requestBody = this.apiManager.createRequestBody(
                apiData.models.scriptVerify,
                messages,
                options
            );
            
            // Create API request with retry logic
            let data;
            try {
                data = await this.apiManager.createChatCompletion(requestBody, apiData.apiKey);
            } catch (error) {
                console.error('Section verification failed:', error);
                // Even on API failure, return a rawJson with duration metrics
                const fallback = {
                    isValid: wordCount >= wordTarget,
                    issues: [],
                    wordTarget: wordTarget,
                    wordCount: wordCount,
                    feedback: 'Verification skipped due to API error.'
                };
                ensureDurationIssue(fallback, wordTarget, wordCount);
                return { isValid: fallback.isValid, feedback: fallback.feedback, issues: fallback.issues, rawJson: fallback };
            }
            
            const verificationText = data.choices[0]?.message?.content?.trim();
            
            // Track token usage if available
            if (data.usage) {
                const modelName = apiData.models.scriptVerify;
                const promptTokens = data.usage.prompt_tokens || 0;
                const completionTokens = data.usage.completion_tokens || 0;
                
                // Track usage via API manager
                this.apiManager.trackCompletionUsage(modelName, promptTokens, completionTokens);
            }
            
            // Parse verification result
            try {
                // Extract JSON from the response (handling cases where there might be text before/after JSON)
                const jsonMatch = verificationText.match(/{[\s\S]*}/m);
                if (jsonMatch) {
                    const resultJson = JSON.parse(jsonMatch[0]);
                    // Inject JS-computed duration metrics
                    resultJson.wordTarget = wordTarget;
                    resultJson.wordCount = wordCount;
                    ensureDurationIssue(resultJson, wordTarget, wordCount);
                    
                    // Return with structured issues if available
                    return {
                        isValid: !!resultJson.isValid, // Ensure boolean
                        feedback: resultJson.feedback || resultJson.summary || 'No specific feedback provided.',
                        issues: Array.isArray(resultJson.issues) ? resultJson.issues : [],
                        rawJson: resultJson
                    };
                } else {
                    // Fallback if no JSON found
                    const isPositive = verificationText.toLowerCase().includes('valid') || 
                                      verificationText.toLowerCase().includes('coherent') ||
                                      verificationText.toLowerCase().includes('good');
                    // Build a minimal JSON payload with JS-computed duration info
                    const minimalJson = {
                        isValid: isPositive && (wordCount >= wordTarget),
                        issues: [],
                        wordTarget: wordTarget,
                        wordCount: wordCount,
                        feedback: verificationText.substring(0, 200) + '...'
                    };
                    ensureDurationIssue(minimalJson, wordTarget, wordCount);
                    return {
                        isValid: minimalJson.isValid,
                        feedback: minimalJson.feedback,
                        issues: minimalJson.issues,
                        rawJson: minimalJson
                    };
                }
            } catch (error) {
                console.error('Error parsing verification result:', error);
                // Default to assuming it's valid to avoid blocking workflow
                const fallbackJson = {
                    isValid: wordCount >= wordTarget,
                    issues: [],
                    wordTarget: wordTarget,
                    wordCount: wordCount,
                    feedback: 'Unable to parse verification result. Using original section.'
                };
                ensureDurationIssue(fallbackJson, wordTarget, wordCount);
                return { isValid: fallbackJson.isValid, feedback: fallbackJson.feedback, issues: fallbackJson.issues, rawJson: fallbackJson };
            }
            
        } catch (error) {
            console.error('Error during section verification:', error);
            // Default to assuming it's valid to avoid blocking workflow
            return { isValid: true, feedback: 'Verification error. Using original section.', issues: [], rawJson: null };
        }
    }
    
    /**
     * Verify the generated script against the outline and target duration
     * @param {string} scriptText - The generated script text
     * @param {string} outlineText - Original outline content
     * @param {string} documentContent - Original document content
     * @param {Object} characterData - Host and guest character data
     * @param {Object} apiData - API credentials and model data
     * @param {number} totalPodcastDuration - Total podcast duration in minutes
     * @returns {Object} - Verification result with isValid flag, feedback, and rawJson when available
     */
    async verifyScript(scriptText, outlineText, documentContent, characterData, apiData, totalPodcastDuration) {
    
        try {
            // Get model name in lowercase for easier comparison
            const modelName = apiData.models.scriptVerify.toLowerCase();
            const isAnthropicStyle = modelName.includes('o3') || modelName.includes('o4');
            
            const systemPrompt = buildScriptVerificationSystem();
            const userPrompt = buildScriptVerificationUser(
                scriptText,
                outlineText,
                documentContent,
                totalPodcastDuration
            );
            
            // Create messages array
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ];
            
            // Configure options with lower temperature for consistent evaluation
            const options = {
                temperature: 0.3
            };
            
            // Get request body using the OpenAIManager helper
            const requestBody = this.apiManager.createRequestBody(
                apiData.models.scriptVerify,
                messages,
                options
            );
            
            // Create API request with retry logic
            let data;
            try {
                data = await this.apiManager.createChatCompletion(requestBody, apiData.apiKey);
            } catch (error) {
                console.error('Script verification failed:', error);
                return { isValid: true, feedback: 'Verification skipped due to API error. Using original script.' };
            }
            
            const verificationText = data.choices[0]?.message?.content?.trim();
            
            // Track token usage if available
            if (data.usage) {
                const modelName = apiData.models.scriptVerify;
                const promptTokens = data.usage.prompt_tokens || 0;
                const completionTokens = data.usage.completion_tokens || 0;
                
                // Track usage via API manager
                this.apiManager.trackCompletionUsage(modelName, promptTokens, completionTokens);
            }
            
            // Parse verification result
            try {
                // Extract JSON from the response (handling cases where there might be text before/after JSON)
                const jsonMatch = verificationText.match(/{[\s\S]*}/m);
                if (jsonMatch) {
                    const resultJson = JSON.parse(jsonMatch[0]);
                    return {
                        isValid: !!resultJson.isValid, // Ensure boolean
                        feedback: resultJson.feedback || resultJson.summary || 'No specific feedback provided.',
                        rawJson: resultJson
                    };
                } else {
                    // Fallback if no JSON found
                    const isPositive = verificationText.toLowerCase().includes('valid') || 
                                      verificationText.toLowerCase().includes('coherent') ||
                                      verificationText.toLowerCase().includes('good');
                    return {
                        isValid: isPositive,
                        feedback: verificationText.substring(0, 200) + '...',
                        rawJson: null
                    };
                }
            } catch (error) {
                console.error('Error parsing verification result:', error);
                // Default to assuming it's valid to avoid blocking workflow
                return { isValid: true, feedback: 'Unable to parse verification result. Using original script.', rawJson: null };
            }
            
        } catch (error) {
            console.error('Error during script verification:', error);
            // Default to assuming it's valid to avoid blocking workflow
            return { isValid: true, feedback: 'Verification error. Using original script.', rawJson: null };
        }
    }
    
    /**
     * Verify the script specifically focusing on cross-section issues
     * @param {string} scriptText - The generated script text
     * @param {string} outlineText - Original outline content
     * @param {string} documentContent - Original document content
     * @param {Object} characterData - Host and guest character data
     * @param {Object} apiData - API credentials and model data
     * @param {number} totalPodcastDuration - Total podcast duration in minutes 
     * @returns {Object} - Verification result with isValid flag, feedback, and rawJson when available
     */
    async verifyScriptForCrossSectionIssues(scriptText, outlineText, documentContent, characterData, apiData, totalPodcastDuration) {
    
        try {
            // Get model name in lowercase for easier comparison
            const modelName = apiData.models.scriptVerify.toLowerCase();
            const isAnthropicStyle = modelName.includes('o3') || modelName.includes('o4');
            
            const systemPrompt = buildScriptCrossSectionVerificationSystem();
            const userPrompt = buildScriptCrossSectionVerificationUser(
                scriptText,
                outlineText,
                totalPodcastDuration
            );
            
            // Create messages array
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ];
            
            // Configure options with lower temperature for consistent evaluation
            const options = {
                temperature: 0.3
            };
            
            // Get request body using the OpenAIManager helper
            const requestBody = this.apiManager.createRequestBody(
                apiData.models.scriptVerify,
                messages,
                options
            );
            
            // Create API request with retry logic
            let data;
            try {
                data = await this.apiManager.createChatCompletion(requestBody, apiData.apiKey);
            } catch (error) {
                console.error('Cross-section verification failed:', error);
                return { isValid: true, feedback: 'Cross-section verification skipped due to API error.' };
            }
            const verificationText = data.choices[0]?.message?.content?.trim();
            
            // Track token usage if available
            if (data.usage) {
                const modelName = apiData.models.scriptVerify;
                const promptTokens = data.usage.prompt_tokens || 0;
                const completionTokens = data.usage.completion_tokens || 0;
                
                // Track usage via API manager
                this.apiManager.trackCompletionUsage(modelName, promptTokens, completionTokens);
            }
            
            // Parse verification result
            try {
                // Extract JSON from the response (handling cases where there might be text before/after JSON)
                const jsonMatch = verificationText.match(/{[\s\S]*}/m);
                if (jsonMatch) {
                    const resultJson = JSON.parse(jsonMatch[0]);
                    return {
                        isValid: !!resultJson.isValid, // Ensure boolean
                        feedback: resultJson.feedback || resultJson.summary || 'No specific cross-section issues found.',
                        rawJson: resultJson
                    };
                } else {
                    // Fallback if no JSON found
                    const isPositive = verificationText.toLowerCase().includes('valid') || 
                                      verificationText.toLowerCase().includes('coherent') ||
                                      verificationText.toLowerCase().includes('good');
                    return {
                        isValid: isPositive,
                        feedback: verificationText.substring(0, 200) + '...',
                        rawJson: null
                    };
                }
            } catch (error) {
                console.error('Error parsing cross-section verification result:', error);
                return { isValid: true, feedback: 'Unable to parse verification result.', rawJson: null };
            }
            
        } catch (error) {
            console.error('Error during cross-section verification:', error);
            return { isValid: true, feedback: 'Verification error.', rawJson: null };
        }
    }
}

export default ScriptVerifier;
