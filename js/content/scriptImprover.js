// Podcastinator App - Script Improvement Module
import NotificationsManager from '../ui/notifications.js';
import {
    buildScriptSectionImproveSystem,
    buildScriptSectionImproveUser,
    buildScriptCrossSectionImproveSystem,
    buildScriptCrossSectionImproveUser
} from './prompts/scriptPrompts.js';

/**
 * ScriptImprover class
 * Handles improvement of podcast scripts based on verification feedback
 */
class ScriptImprover {

    /**
     * Create a new ScriptImprover instance
     * @param {Object} apiManager - The API manager instance for OpenAI calls
     */
    constructor(apiManager) {
    
        this.apiManager = apiManager;
        this.notifications = new NotificationsManager();
    }
    
    /**
     * Escape a string for safe use inside RegExp constructor
     * @param {string} str
     * @returns {string}
     */
    escapeRegExp(str) {
    
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    /**
     * Process script text to ensure proper formatting and remove unwanted elements
     * @param {string} scriptText - Raw script text from AI response
     * @returns {string} - Processed script text
     */
    processScriptText(scriptText) {
    
        // Remove markdown code blocks if present
        let processedText = scriptText
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            // Remove opening code fences like ```markdown, ``` md, ```
            .replace(/```\s*[a-zA-Z-]*\s*\n?/g, '')
            // Remove any remaining triple backticks
            .replace(/```/g, '')
            // Remove stray lines that only say 'markdown' or 'md'
            .replace(/^(?:markdown|md)\s*$/gim, '')
            .trim();
        
        // Remove any stage directions [like this] that might have been added
        processedText = processedText.replace(/\[[^\]]+\]/g, '');
        
        // Ensure proper speaker format (HOST: and GUEST:)
        processedText = processedText.replace(/^HOST\s*:/gm, 'HOST:');
        processedText = processedText.replace(/^GUEST\s*:/gm, 'GUEST:');
        
        return processedText;
    }
    
    /**
     * Improve a script section based on verification feedback
     * @param {string} originalSectionText - The original section text
     * @param {string} feedback - Feedback from verification
     * @param {Object} section - The outline section data
     * @param {string} documentContent - Original document content
     * @param {Object} characterData - Host and guest character data
     * @param {Object} apiData - API credentials and model data
     * @param {number} totalPodcastDuration - Total podcast duration in minutes
     * @returns {string} - Improved section text
     */
    async improveScriptSection(originalSectionText, feedback, section, documentContent, characterData, apiData, totalPodcastDuration) {
    
        try {
            // Get model name in lowercase for easier comparison (kept for logging if needed)
            const modelName = apiData.models.script.toLowerCase(); // Use the main script generation model
            
            // Create prompts via centralized builders
            const systemPrompt = buildScriptSectionImproveSystem();
            const userPrompt = buildScriptSectionImproveUser(
                originalSectionText,
                feedback,
                section,
                documentContent,
                totalPodcastDuration,
                ''
            );
            
            // Do not inject character names/styles to avoid the model switching labels to names
            const fullUserPrompt = userPrompt;
            
            // Get language setting
            const scriptLanguage = apiData.models.scriptLanguage || 'english';
            
            // Create messages array
            const messages = [
                { role: 'system', content: `${systemPrompt}\n\nGenerate the improved section in ${scriptLanguage} language.` },
                { role: 'user', content: fullUserPrompt }
            ];
            
            // Configure options with moderate temperature for creativity while maintaining focus
            const options = {
                temperature: 0.5 // Moderate temperature for creative improvements while maintaining reliability
            };
            
            // Get request body using the OpenAIManager helper
            const requestBody = this.apiManager.createRequestBody(
                apiData.models.script,
                messages,
                options
            );
            
            // Create API request with retry logic
            let data;
            try {
                data = await this.apiManager.createChatCompletion(requestBody, apiData.apiKey);
            } catch (error) {
                console.error('Section improvement failed:', error);
                return originalSectionText; // Return original section if improvement fails
            }
            
            let improvedSectionText = data.choices[0]?.message?.content?.trim();
            
            // Track token usage if available
            if (data.usage) {
                const modelName = apiData.models.script;
                const promptTokens = data.usage.prompt_tokens || 0;
                const completionTokens = data.usage.completion_tokens || 0;
                
                // Track usage via API manager
                this.apiManager.trackCompletionUsage(modelName, promptTokens, completionTokens);
            }
            
            if (improvedSectionText) {
                // Normalize any accidental use of character names as labels back to HOST:/GUEST:
                if (characterData) {
                    const hostName = characterData.host && characterData.host.name ? characterData.host.name.trim() : '';
                    const guestName = characterData.guest && characterData.guest.name ? characterData.guest.name.trim() : '';
                    if (hostName) {
                        const re = new RegExp('^' + this.escapeRegExp(hostName) + '\\s*:', 'gm');
                        improvedSectionText = improvedSectionText.replace(re, 'HOST:');
                    }
                    if (guestName) {
                        const re = new RegExp('^' + this.escapeRegExp(guestName) + '\\s*:', 'gm');
                        improvedSectionText = improvedSectionText.replace(re, 'GUEST:');
                    }
                }
                // Process the text to remove stage directions and ensure proper formatting
                improvedSectionText = this.processScriptText(improvedSectionText);
                return improvedSectionText;
            } else {
                console.warn('Empty response from improvement API. Using original section.');
                return originalSectionText; // Return original section if improvement fails
            }
            
        } catch (error) {
            console.error('Error during section improvement:', error);
            return originalSectionText; // Return original section if improvement fails
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
     * @param {number} totalPodcastDuration - Total podcast duration in minutes
     * @returns {string} - Improved script text
     */
    async improveCrossSectionIssues(originalScriptText, feedback, outlineText, documentContent, characterData, apiData, totalPodcastDuration) {
    
        try {
            // Calculate original script length to ensure we maintain comparable size
            const originalScriptLength = originalScriptText.length;
            console.log(`Original script length: ${originalScriptLength} characters`);
            
            // Get model name in lowercase for easier comparison (optional logging)
            const modelName = apiData.models.script.toLowerCase(); // Use the main script generation model
            
            // Create prompts via centralized builders
            const systemPrompt = buildScriptCrossSectionImproveSystem();
            
            // Get language setting
            const scriptLanguage = apiData.models.scriptLanguage || 'english';
            
            const userPrompt = buildScriptCrossSectionImproveUser(
                originalScriptText,
                feedback,
                outlineText,
                documentContent,
                totalPodcastDuration,
                originalScriptLength,
                characterData
            );
            
            // Do NOT add character context to avoid the model switching labels to names
            const fullUserPrompt = userPrompt;
            
            // Create messages array
            const messages = [
                { role: 'system', content: `${systemPrompt}\n\nGenerate the improved script in ${scriptLanguage} language.` },
                { role: 'user', content: fullUserPrompt }
            ];
            
            // Configure options with moderate temperature for creativity while maintaining focus
            const options = {
                temperature: 0.5 // Moderate temperature for creative improvements while maintaining reliability
            };
            
            // Get request body using the OpenAIManager helper
            const requestBody = this.apiManager.createRequestBody(
                apiData.models.script,
                messages,
                options
            );
            
            // Create API request with retry logic
            let data;
            try {
                data = await this.apiManager.createChatCompletion(requestBody, apiData.apiKey);
            } catch (error) {
                console.error('Cross-section improvement failed:', error);
                return originalScriptText; // Return original script if improvement fails
            }
            
            let improvedScriptText = data.choices[0]?.message?.content?.trim();
            
            // Track token usage if available
            if (data.usage) {
                const modelName = apiData.models.script;
                const promptTokens = data.usage.prompt_tokens || 0;
                const completionTokens = data.usage.completion_tokens || 0;
                
                // Track usage via API manager
                this.apiManager.trackCompletionUsage(modelName, promptTokens, completionTokens);
            }
            
            if (improvedScriptText) {
                // Normalize any accidental use of character names as labels back to HOST:/GUEST:
                if (characterData) {
                    const hostName = characterData.host && characterData.host.name ? characterData.host.name.trim() : '';
                    const guestName = characterData.guest && characterData.guest.name ? characterData.guest.name.trim() : '';
                    if (hostName) {
                        const re = new RegExp('^' + this.escapeRegExp(hostName) + '\\s*:', 'gm');
                        improvedScriptText = improvedScriptText.replace(re, 'HOST:');
                    }
                    if (guestName) {
                        const re = new RegExp('^' + this.escapeRegExp(guestName) + '\\s*:', 'gm');
                        improvedScriptText = improvedScriptText.replace(re, 'GUEST:');
                    }
                }
                // Process the text to remove stage directions and ensure proper formatting
                improvedScriptText = this.processScriptText(improvedScriptText);
                return improvedScriptText;
            } else {
                console.warn('Empty response from improvement API. Using original script.');
                return originalScriptText; // Return original script if improvement fails
            }
            
        } catch (error) {
            console.error('Error during cross-section improvement:', error);
            return originalScriptText; // Return original script if improvement fails
        }
    }
}

export default ScriptImprover;
