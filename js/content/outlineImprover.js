// Podcastinator App - Outline Improver
import NotificationsManager from '../ui/notifications.js';
import { buildOutlineGenerationSystem, buildOutlineImproveSystem, buildOutlineImproveUser } from './prompts/outlinePrompts.js';

class OutlineImprover {
    constructor(apiManager) {
        this.apiManager = apiManager;
        this.notifications = new NotificationsManager();
    }

    /**
     * Improve outline based on verification feedback
     * @param {string} originalOutlineText
     * @param {string} feedback
     * @param {string} documentContent
     * @param {Object} characterData
     * @param {Object} apiData
     * @param {number} podcastDuration
     * @param {string} podcastFocus
     * @returns {Promise<string>} improved outline
     */
    async improveOutline(originalOutlineText, feedback, documentContent, characterData, apiData, podcastDuration, podcastFocus) {
        try {
            const originalOutlineLength = originalOutlineText.length;
            const modelName = (apiData.models.outline || '').toLowerCase();
            const isAnthropicStyle = modelName.includes('o3') || modelName.includes('o4');

            const baseSystemPrompt = buildOutlineGenerationSystem(characterData.host || {}, characterData.guest || {}, podcastDuration);
            const systemPrompt = buildOutlineImproveSystem(baseSystemPrompt);

            const userPrompt = buildOutlineImproveUser(
                originalOutlineText,
                feedback,
                documentContent,
                podcastDuration,
                podcastFocus
            );

            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ];

            const options = {};
            if (!isAnthropicStyle) {
                options.temperature = 0.4;
            }

            const requestBody = this.apiManager.createRequestBody(
                apiData.models.outline,
                messages,
                options
            );

            let responseData;
            try {
                responseData = await this.apiManager.createChatCompletion(requestBody, apiData.apiKey);
            } catch (error) {
                console.error('Outline improvement failed:', error);
                return originalOutlineText;
            }

            if (responseData.usage) {
                this.apiManager.trackCompletionUsage(
                    apiData.models.outline,
                    responseData.usage.prompt_tokens || 0,
                    responseData.usage.completion_tokens || 0
                );
            }

            const improvedOutlineText = responseData.choices[0]?.message?.content?.trim();
            return improvedOutlineText || originalOutlineText;
        } catch (error) {
            console.error('Error during outline improvement:', error);
            return originalOutlineText;
        }
    }

    
}

export default OutlineImprover;
