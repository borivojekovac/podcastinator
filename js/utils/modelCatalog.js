// Podcastinator App - OpenAI Model Catalog
// Centralized source of truth for OpenAI model metadata, capabilities, and pricing

class ModelCatalog {
    constructor() {
        // Define all known OpenAI models with metadata
        this.models = {
            // Frontier text models (current generation)
            'gpt-5.5': {
                name: 'GPT-5.5',
                category: 'text',
                description: 'Flagship model for complex reasoning and coding',
                deprecated: false,
                supportsTemperature: false,
                tokenLimitField: 'max_completion_tokens',
                supportsReasoning: true,
                context: '200kt',
                costPer1kInput: 0.00375,
                costPer1kOutput: 0.015
            },
            'gpt-5.5-pro': {
                name: 'GPT-5.5 Pro',
                category: 'text',
                description: 'GPT-5.5 with more compute for smarter responses',
                deprecated: false,
                supportsTemperature: false,
                tokenLimitField: 'max_completion_tokens',
                supportsReasoning: true,
                context: '200kt',
                costPer1kInput: 0.00375,
                costPer1kOutput: 0.015
            },
            'gpt-5.4': {
                name: 'GPT-5.4',
                category: 'text',
                description: 'More affordable model for coding and professional work',
                deprecated: false,
                supportsTemperature: false,
                tokenLimitField: 'max_completion_tokens',
                supportsReasoning: true,
                context: '200kt',
                costPer1kInput: 0.00125,
                costPer1kOutput: 0.005
            },
            'gpt-5.4-pro': {
                name: 'GPT-5.4 Pro',
                category: 'text',
                description: 'GPT-5.4 with more compute for smarter responses',
                deprecated: false,
                supportsTemperature: false,
                tokenLimitField: 'max_completion_tokens',
                supportsReasoning: true,
                context: '200kt',
                costPer1kInput: 0.00125,
                costPer1kOutput: 0.005
            },
            'gpt-5.4-mini': {
                name: 'GPT-5.4 mini',
                category: 'text',
                description: 'Strongest mini model for coding and cost efficiency',
                deprecated: false,
                supportsTemperature: false,
                tokenLimitField: 'max_completion_tokens',
                supportsReasoning: true,
                context: '128kt',
                costPer1kInput: 0.00015,
                costPer1kOutput: 0.0006
            },
            'gpt-5.4-nano': {
                name: 'GPT-5.4 nano',
                category: 'text',
                description: 'Cheapest GPT-5.4-class model for simple high-volume tasks',
                deprecated: false,
                supportsTemperature: false,
                tokenLimitField: 'max_completion_tokens',
                supportsReasoning: true,
                context: '128kt',
                costPer1kInput: 0.00003,
                costPer1kOutput: 0.00012
            },
            'gpt-5-mini': {
                name: 'GPT-5 mini',
                category: 'text',
                description: 'Near-frontier intelligence for cost-sensitive workloads',
                deprecated: false,
                supportsTemperature: true,
                tokenLimitField: 'max_tokens',
                supportsReasoning: false,
                context: '128kt',
                costPer1kInput: 0.00015,
                costPer1kOutput: 0.0006
            },
            'gpt-5-nano': {
                name: 'GPT-5 nano',
                category: 'text',
                description: 'Fastest, most cost-efficient version of GPT-5',
                deprecated: false,
                supportsTemperature: true,
                tokenLimitField: 'max_tokens',
                supportsReasoning: false,
                context: '128kt',
                costPer1kInput: 0.00003,
                costPer1kOutput: 0.00012
            },
            'gpt-5': {
                name: 'GPT-5',
                category: 'text',
                description: 'Previous intelligent reasoning model',
                deprecated: false,
                supportsTemperature: false,
                tokenLimitField: 'max_completion_tokens',
                supportsReasoning: true,
                context: '200kt',
                costPer1kInput: 0.00125,
                costPer1kOutput: 0.005
            },
            'gpt-4.1': {
                name: 'GPT-4.1',
                category: 'text',
                description: 'Smartest non-reasoning model',
                deprecated: false,
                supportsTemperature: true,
                tokenLimitField: 'max_tokens',
                supportsReasoning: false,
                context: '128kt',
                costPer1kInput: 0.01,
                costPer1kOutput: 0.03
            },
            'gpt-4.1-mini': {
                name: 'GPT-4.1 mini',
                category: 'text',
                description: 'Smaller, faster version of GPT-4.1',
                deprecated: false,
                supportsTemperature: true,
                tokenLimitField: 'max_tokens',
                supportsReasoning: false,
                context: '128kt',
                costPer1kInput: 0.005,
                costPer1kOutput: 0.015
            },

            // Deprecated/legacy reasoning models
            'o3': {
                name: 'o3',
                category: 'text',
                description: 'Reasoning model (succeeded by GPT-5)',
                deprecated: true,
                supportsTemperature: false,
                tokenLimitField: 'max_completion_tokens',
                supportsReasoning: true,
                context: '200kt',
                costPer1kInput: 0.005,
                costPer1kOutput: 0.015
            },
            'o3-pro': {
                name: 'o3-pro',
                category: 'text',
                description: 'o3 with more compute (deprecated)',
                deprecated: true,
                supportsTemperature: false,
                tokenLimitField: 'max_completion_tokens',
                supportsReasoning: true,
                context: '200kt',
                costPer1kInput: 0.005,
                costPer1kOutput: 0.015
            },
            'o4-mini': {
                name: 'o4-mini',
                category: 'text',
                description: 'Fast reasoning model (succeeded by GPT-5 mini)',
                deprecated: true,
                supportsTemperature: false,
                tokenLimitField: 'max_completion_tokens',
                supportsReasoning: true,
                context: '200kt',
                costPer1kInput: 0.0025,
                costPer1kOutput: 0.0075
            },

            // Deprecated legacy models
            'gpt-4.1-nano': {
                name: 'GPT-4.1 nano',
                category: 'text',
                description: 'Deprecated fastest version of GPT-4.1',
                deprecated: true,
                supportsTemperature: true,
                tokenLimitField: 'max_tokens',
                supportsReasoning: false,
                context: '128kt',
                costPer1kInput: 0.0025,
                costPer1kOutput: 0.0075
            },
            'gpt-3.5-turbo': {
                name: 'GPT-3.5 Turbo',
                category: 'text',
                description: 'Deprecated legacy model',
                deprecated: true,
                supportsTemperature: true,
                tokenLimitField: 'max_tokens',
                supportsReasoning: false,
                context: '4kt',
                costPer1kInput: 0.0005,
                costPer1kOutput: 0.0015
            },
            'gpt-3.5-turbo-16k': {
                name: 'GPT-3.5 Turbo 16k',
                category: 'text',
                description: 'Deprecated legacy model with extended context',
                deprecated: true,
                supportsTemperature: true,
                tokenLimitField: 'max_tokens',
                supportsReasoning: false,
                context: '16kt',
                costPer1kInput: 0.001,
                costPer1kOutput: 0.002
            },

            // TTS models
            'gpt-4o-mini-tts': {
                name: 'GPT-4o Mini TTS',
                category: 'tts',
                description: 'Text-to-speech powered by GPT-4o mini',
                deprecated: false,
                supportsTtsInstructions: true,
                supportsTtsSpeed: false,
                costPer1kChars: 0.015
            },
            'tts-1': {
                name: 'TTS-1',
                category: 'tts',
                description: 'Text-to-speech optimized for speed',
                deprecated: false,
                supportsTtsInstructions: false,
                supportsTtsSpeed: true,
                costPer1kChars: 0.015
            },
            'tts-1-hd': {
                name: 'TTS-1 HD',
                category: 'tts',
                description: 'Text-to-speech optimized for quality',
                deprecated: false,
                supportsTtsInstructions: false,
                supportsTtsSpeed: true,
                costPer1kChars: 0.03
            }
        };
    }

    /**
     * Get all text models (non-TTS)
     * @param {boolean} includeDeprecated - Include deprecated models
     * @returns {Array} Array of model IDs
     */
    getTextModels(includeDeprecated = false) {
        return Object.entries(this.models)
            .filter(([_, meta]) => meta.category === 'text' && (includeDeprecated || !meta.deprecated))
            .map(([id, _]) => id);
    }

    /**
     * Get all TTS models
     * @returns {Array} Array of model IDs
     */
    getTtsModels() {
        return Object.entries(this.models)
            .filter(([_, meta]) => meta.category === 'tts' && !meta.deprecated)
            .map(([id, _]) => id);
    }

    /**
     * Get model metadata
     * @param {string} modelId - Model identifier
     * @returns {Object|null} Model metadata or null if not found
     */
    getModel(modelId) {
        return this.models[modelId] || null;
    }

    /**
     * Check if a model is deprecated
     * @param {string} modelId - Model identifier
     * @returns {boolean}
     */
    isDeprecated(modelId) {
        const meta = this.models[modelId];
        return meta ? meta.deprecated : false;
    }

    /**
     * Check if a model exists (deprecated or not)
     * @param {string} modelId - Model identifier
     * @returns {boolean}
     */
    modelExists(modelId) {
        return modelId in this.models;
    }

    /**
     * Get default model for a given role
     * @param {string} role - 'outline', 'script', 'backstory', or 'tts'
     * @returns {string} Default model ID
     */
    getDefaultModel(role) {
        switch (role) {
            case 'outline':
            case 'outlineVerify':
            case 'script':
            case 'scriptVerify':
            case 'backstory':
                return 'gpt-5.4-mini'; // High quality, cost-efficient
            case 'tts':
                return 'tts-1-hd'; // High quality TTS
            default:
                return 'gpt-5.4-mini';
        }
    }

    /**
     * Get all model options for UI select (non-deprecated only)
     * @param {string} category - 'text' or 'tts'
     * @returns {Array} Array of {value, label} objects
     */
    getSelectOptions(category = 'text') {
        const models = category === 'tts' ? this.getTtsModels() : this.getTextModels(false);
        return models.map(modelId => {
            const meta = this.models[modelId];
            return {
                value: modelId,
                label: `${meta.name} (${meta.context || 'N/A'})`
            };
        });
    }

    /**
     * Get all model options including deprecated (for loading old configs)
     * @param {string} category - 'text' or 'tts'
     * @returns {Array} Array of {value, label, deprecated} objects
     */
    getAllSelectOptions(category = 'text') {
        const allModels = category === 'tts' 
            ? Object.entries(this.models).filter(([_, m]) => m.category === 'tts').map(([id, _]) => id)
            : Object.entries(this.models).filter(([_, m]) => m.category === 'text').map(([id, _]) => id);
        
        return allModels.map(modelId => {
            const meta = this.models[modelId];
            return {
                value: modelId,
                label: `${meta.name} (${meta.context || 'N/A'})${meta.deprecated ? ' [DEPRECATED]' : ''}`,
                deprecated: meta.deprecated
            };
        });
    }
}

export default ModelCatalog;
