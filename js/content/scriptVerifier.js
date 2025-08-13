// Podcastinator App - Script Verification Module
import NotificationsManager from '../ui/notifications.js';
import {
    buildScriptSectionVerificationSystem,
    buildScriptSectionVerificationUser,
    buildScriptVerificationSystem,
    buildScriptVerificationUser,
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
     * @returns {Object} - Verification result with isValid flag and feedback
     */
    async verifyScriptSection(sectionText, section, previousSections, documentContent, characterData, apiData, totalPodcastDuration) {
    
        try {
            // Get model name in lowercase for easier comparison
            const modelName = apiData.models.scriptVerify.toLowerCase();
            const isAnthropicStyle = modelName.includes('o3') || modelName.includes('o4');
            
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
                return { isValid: true, feedback: 'Verification skipped due to API error. Using original section.' };
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
                        feedback: resultJson.feedback || 'No specific feedback provided.'
                    };
                } else {
                    // Fallback if no JSON found
                    const isPositive = verificationText.toLowerCase().includes('valid') || 
                                      verificationText.toLowerCase().includes('coherent') ||
                                      verificationText.toLowerCase().includes('good');
                    return {
                        isValid: isPositive,
                        feedback: verificationText.substring(0, 200) + '...'
                    };
                }
            } catch (error) {
                console.error('Error parsing verification result:', error);
                // Default to assuming it's valid to avoid blocking workflow
                return { isValid: true, feedback: 'Unable to parse verification result. Using original section.' };
            }
            
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
     * @param {number} totalPodcastDuration - Total podcast duration in minutes
     * @returns {Object} - Verification result with isValid flag and feedback
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
                        feedback: resultJson.feedback || 'No specific feedback provided.'
                    };
                } else {
                    // Fallback if no JSON found
                    const isPositive = verificationText.toLowerCase().includes('valid') || 
                                      verificationText.toLowerCase().includes('coherent') ||
                                      verificationText.toLowerCase().includes('good');
                    return {
                        isValid: isPositive,
                        feedback: verificationText.substring(0, 200) + '...'
                    };
                }
            } catch (error) {
                console.error('Error parsing verification result:', error);
                // Default to assuming it's valid to avoid blocking workflow
                return { isValid: true, feedback: 'Unable to parse verification result. Using original script.' };
            }
            
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
     * @param {number} totalPodcastDuration - Total podcast duration in minutes 
     * @returns {Object} - Verification result with isValid flag and feedback
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
                        feedback: resultJson.feedback || 'No specific cross-section issues found.'
                    };
                } else {
                    // Fallback if no JSON found
                    const isPositive = verificationText.toLowerCase().includes('valid') || 
                                      verificationText.toLowerCase().includes('coherent') ||
                                      verificationText.toLowerCase().includes('good');
                    return {
                        isValid: isPositive,
                        feedback: verificationText.substring(0, 200) + '...'
                    };
                }
            } catch (error) {
                console.error('Error parsing cross-section verification result:', error);
                return { isValid: true, feedback: 'Unable to parse verification result.' };
            }
            
        } catch (error) {
            console.error('Error during cross-section verification:', error);
            return { isValid: true, feedback: 'Verification error.' };
        }
    }
}

export default ScriptVerifier;
