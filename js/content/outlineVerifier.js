// Podcastinator App - Outline Verifier
import NotificationsManager from '../ui/notifications.js';
import { buildOutlineVerificationSystem, buildOutlineVerificationUser } from './prompts/outlinePrompts.js';

class OutlineVerifier {
    constructor(apiManager) {
        this.apiManager = apiManager;
        this.notifications = new NotificationsManager();
    }

    /**
     * Verify the generated outline against document and settings
     * @param {string} outlineText
     * @param {string} documentContent
     * @param {Object} characterData
     * @param {Object} apiData
     * @param {number} podcastDuration
     * @param {string} podcastFocus
     * @returns {Promise<{isValid: boolean, feedback: string}>}
     */
    async verifyOutline(outlineText, documentContent, characterData, apiData, podcastDuration, podcastFocus) {
        try {
            const modelName = (apiData.models.outlineVerify || '').toLowerCase();
            const isAnthropicStyle = modelName.includes('o3') || modelName.includes('o4');

            const systemPrompt = buildOutlineVerificationSystem();

            const userPrompt = buildOutlineVerificationUser(
                outlineText,
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
                options.temperature = 0.3;
            }

            const requestBody = this.apiManager.createRequestBody(
                apiData.models.outlineVerify,
                messages,
                options
            );

            let responseData;
            try {
                responseData = await this.apiManager.createChatCompletion(requestBody, apiData.apiKey);
            } catch (error) {
                console.error('Outline verification failed:', error);
                return { isValid: true, feedback: 'Verification skipped due to API error. Using original outline.' };
            }

            const verificationText = responseData.choices[0]?.message?.content?.trim() || '';

            // Track usage if available
            if (responseData.usage) {
                this.apiManager.trackCompletionUsage(
                    apiData.models.outlineVerify,
                    responseData.usage.prompt_tokens || 0,
                    responseData.usage.completion_tokens || 0
                );
            }

            try {
                const jsonMatch = verificationText.match(/{[\s\S]*}/m);
                if (jsonMatch) {
                    const resultJson = JSON.parse(jsonMatch[0]);
                    
                    // Handle the new richer JSON feedback format
                    if (resultJson.issues && Array.isArray(resultJson.issues)) {
                        // Format the issues into a readable feedback message
                        let feedbackMessage = '';
                        
                        // Add duration information if available
                        if (resultJson.totalDuration !== undefined && 
                            resultJson.targetDuration !== undefined) {
                            feedbackMessage += `Total Duration: ${resultJson.totalDuration} minutes ` +
                                            `(Target: ${resultJson.targetDuration} minutes, ` +
                                            `Difference: ${resultJson.durationDelta || 0} minutes)\n\n`;
                        }
                        
                        // Add issues by severity
                        const criticalIssues = resultJson.issues.filter(function(issue) { return issue.severity === 'critical'; });
                        const majorIssues = resultJson.issues.filter(function(issue) { return issue.severity === 'major'; });
                        const minorIssues = resultJson.issues.filter(function(issue) { return issue.severity === 'minor'; });
                        
                        if (criticalIssues.length > 0) {
                            feedbackMessage += 'CRITICAL ISSUES:\n';
                            criticalIssues.forEach(function(issue) {
                                feedbackMessage += `- [${issue.category}] ${issue.description}\n`;
                            });
                            feedbackMessage += '\n';
                        }
                        
                        if (majorIssues.length > 0) {
                            feedbackMessage += 'MAJOR ISSUES:\n';
                            majorIssues.forEach(function(issue) {
                                feedbackMessage += `- [${issue.category}] ${issue.description}\n`;
                            });
                            feedbackMessage += '\n';
                        }
                        
                        if (minorIssues.length > 0) {
                            feedbackMessage += 'MINOR ISSUES:\n';
                            minorIssues.forEach(function(issue) {
                                feedbackMessage += `- [${issue.category}] ${issue.description}\n`;
                            });
                            feedbackMessage += '\n';
                        }
                        
                        // Add summary if available
                        if (resultJson.summary) {
                            feedbackMessage += `SUMMARY: ${resultJson.summary}`;
                        }
                        
                        return {
                            isValid: !!resultJson.isValid,
                            feedback: feedbackMessage.trim() || 'No specific issues found.'
                        };
                    } else {
                        // Fallback for backward compatibility
                        return {
                            isValid: !!resultJson.isValid,
                            feedback: resultJson.feedback || 'No specific feedback provided.'
                        };
                    }
                } else {
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
                return { isValid: true, feedback: 'Unable to parse verification result. Using original outline.' };
            }
        } catch (error) {
            console.error('Error during outline verification:', error);
            return { isValid: true, feedback: 'Verification error. Using original outline.' };
        }
    }
}

export default OutlineVerifier;
