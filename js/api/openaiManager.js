// Podcastinator App - OpenAI API Manager
import NotificationsManager from '../ui/notifications.js';
import LanguageSupport from '../utils/languageSupport.js';
import RetryManager from '../utils/retryManager.js';

class OpenAIManager {
    constructor(storageManager, contentStateManager) {
        this.storageManager = storageManager;
        this.contentStateManager = contentStateManager;
        this.notifications = new NotificationsManager();
        
        // Load models data from storage
        const savedData = this.storageManager.load('data', {});
        this.languageSupport = new LanguageSupport();
        
        // Initialize retry manager for API calls
        this.retryManager = new RetryManager({
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            jitter: 0.25,
            onRetry: this.handleRetryNotification.bind(this)
        });
        
        // Use empty object for models if not in storage
        // We'll initialize from the DOM selected attributes during init()
        this.data = {
            apiKey: savedData.apiKey || '',
            models: savedData.models || {}
        };
    }

    /**
     * Initialize OpenAI API manager
     */
    init() {
    
        // Initialize models from DOM if no stored values exist
        this.initializeModelsFromDOM();
        this.setupModelSelectionListeners();
        this.setupApiKeyValidation();
    }
    
    /**
     * Initialize models from DOM elements with selected attributes
     */
    initializeModelsFromDOM() {
    
        // Only initialize from DOM if we don't have stored models
        if (Object.keys(this.data.models).length > 0) {
            return;
        }
        
        // Default values in case elements aren't found
        this.data.models = {
            outline: this.getSelectedValue('outline-model', 'gpt-4o-mini'),
            outlineVerify: this.getSelectedValue('outline-verify-model', 'gpt-4o-mini'),
            script: this.getSelectedValue('script-model', 'gpt-4.1-mini'),
            scriptVerify: this.getSelectedValue('script-verify-model', 'gpt-4.1-mini'),
            backstory: this.getSelectedValue('backstory-model', 'gpt-4o-mini'),
            tts: this.getSelectedValue('tts-model', 'tts-1')
        };
        
        // Persist these initial values to storage
        this.saveToStorage();
    }
    
    /**
     * Get the selected value from a select element in the DOM
     * @param {string} elementId - ID of the select element
     * @param {string} defaultValue - Default value if element not found
     * @returns {string} - Selected value or default
     */
    getSelectedValue(elementId, defaultValue) {
    
        const element = document.getElementById(elementId);
        if (!element) {
            return defaultValue;
        }
        
        // Check for options with selected attribute
        const selectedOption = element.querySelector('option[selected]');
        if (selectedOption) {
            return selectedOption.value;
        }
        
        // If no option has selected attribute, use the first option
        if (element.options.length > 0) {
            return element.options[0].value;
        }
        
        return defaultValue;
    }

    /**
     * Setup API key validation listener
     */
    setupApiKeyValidation() {
    
        const self = this;
        const validateKeyButton = document.getElementById('validate-key');
        
        if (validateKeyButton) {
            validateKeyButton.addEventListener('click', function() {
                self.validateApiKey();
            });
        }

        // Populate the API key if available
        if (this.data.apiKey) {
            document.getElementById('api-key').value = this.data.apiKey;
        }
    }

    /**
     * Setup model selection listeners
     */
    setupModelSelectionListeners() {
    
        const self = this;
        const modelSelectors = [
            'outline-model',
            'outline-verify-model',
            'script-model', 
            'script-verify-model',
            'backstory-model',
            'tts-model'
        ];

        modelSelectors.forEach(function(selectorId) {
        
            const element = document.getElementById(selectorId);
            if (element) {
                element.addEventListener('change', function() {
                    self.saveModelSelection(selectorId, this.value);
                });
            }
        });

        // Populate the model selections if available
        if (this.data.models) {
            // Set values if both the element and model value exist
            this.setSelectValueIfExists('outline-model', this.data.models.outline);
            this.setSelectValueIfExists('script-model', this.data.models.script);
            this.setSelectValueIfExists('backstory-model', this.data.models.backstory);
            this.setSelectValueIfExists('tts-model', this.data.models.tts);
            this.setSelectValueIfExists('outline-verify-model', this.data.models.outlineVerify);
            this.setSelectValueIfExists('script-verify-model', this.data.models.scriptVerify);
            
            // Set up language selector if it exists
            const languageSelector = document.getElementById('script-language');
            if (languageSelector) {
                this.populateLanguageOptions(languageSelector);
                const scriptStore = this.storageManager.load('scriptData', {});
                languageSelector.value = scriptStore.language || 'english';
            }
        }
        
        // Add listener for TTS model changes to update language options
        const ttsModelSelector = document.getElementById('tts-model');
        if (ttsModelSelector) {
            ttsModelSelector.addEventListener('change', function() {
                const languageSelector = document.getElementById('script-language');
                if (languageSelector) {
                    self.populateLanguageOptions(languageSelector);
                }
            });
        }

        // Listen for changes to language selector to persist to scriptData
        const languageSelector = document.getElementById('script-language');
        if (languageSelector) {
            languageSelector.addEventListener('change', function onLangChange() {
                const store = self.storageManager.load('scriptData', {}) || {};
                store.language = languageSelector.value || 'english';
                self.storageManager.save('scriptData', store);
            });
        }
    }

    /**
     * Save model selection
     * @param {string} selectorId - ID of model selector element
     * @param {string} value - Selected model value
     */
    saveModelSelection(selectorId, value) {
    
        const modelMap = {
            'outline-model': 'outline',
            'outline-verify-model': 'outlineVerify',
            'script-model': 'script',
            'script-verify-model': 'scriptVerify',
            'backstory-model': 'backstory', 
            'tts-model': 'tts'
        };

        const modelKey = modelMap[selectorId];
        if (modelKey) {
        
            this.data.models[modelKey] = value;
            this.saveToStorage();
            console.log(`Model selection saved: ${modelKey} = ${value}`);
        }
    }

    /**
     * Save all model selections from form elements
     */
    saveAllModelSelections() {
    
        const selectors = {
            'outline-model': 'outline',
            'outline-verify-model': 'outlineVerify',
            'script-model': 'script',
            'script-verify-model': 'scriptVerify',
            'backstory-model': 'backstory',
            'tts-model': 'tts'
        };

        Object.entries(selectors).forEach(([elementId, modelKey]) => {
        
            const element = document.getElementById(elementId);
            if (element) {
                this.data.models[modelKey] = element.value;
            }
        });
        
        this.saveToStorage();
    }

    /**
     * Save data to storage
     */
    saveToStorage() {
    
        const existingData = this.storageManager.load('data', {});
        const updatedData = {
            ...existingData,
            apiKey: this.data.apiKey,
            models: this.data.models
        };
        this.storageManager.save('data', updatedData);
    }

    /**
     * Validate OpenAI API key
     */
    async validateApiKey() {
    
        const apiKey = document.getElementById('api-key').value.trim();
        const validateButton = document.getElementById('validate-key');
        const validateText = document.getElementById('validate-text');
        const validateSpinner = document.getElementById('validate-spinner');
        
        if (!apiKey) {
            this.notifications.showError('Please enter your OpenAI API key');
            return;
        }

        if (!apiKey.startsWith('sk-')) {
            this.notifications.showError('Invalid API key format. OpenAI keys start with "sk-"');
            return;
        }

        // Show loading state
        validateButton.disabled = true;
        validateText.style.display = 'none';
        validateSpinner.style.display = 'inline-block';

        try {
            // Test API key with real OpenAI API call
            const response = await fetch('https://api.openai.com/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                // Save all form data including models
                this.data.apiKey = apiKey;
                this.saveAllModelSelections();
                this.notifications.showSuccess('API key validated successfully! Settings saved.');
                
                // Update content state to indicate we have valid API key
                this.contentStateManager.updateState('hasApiKey', true);
                
                setTimeout(function() {
                    // Content state manager will handle enabling the appropriate sections
                    this.contentStateManager.updateSections();
                }.bind(this), 1500);
            } else {
                let errorMsg = 'Invalid API key';
                if (response.status === 401) {
                    errorMsg = 'Invalid API key. Please check your key and try again.';
                } else if (response.status === 429) {
                    errorMsg = 'API rate limit exceeded. Please try again later.';
                } else if (response.status >= 500) {
                    errorMsg = 'OpenAI API is currently unavailable. Please try again later.';
                }
                this.notifications.showError(errorMsg);
            }
        } catch (error) {
            console.error('API validation error:', error);
            this.notifications.showError('Network error. Please check your connection and try again.');
        } finally {
            // Reset button state
            validateButton.disabled = false;
            validateText.style.display = 'inline';
            validateSpinner.style.display = 'none';
        }
    }

    /**
     * Get current API data
     * @returns {Object} - API data including key and models
     */
    getApiData() {
    
        return {
            apiKey: this.data.apiKey,
            models: this.data.models
        };
    }
    
    /**
     * Populate language options in a select element based on current TTS model
     * @param {HTMLSelectElement} selectElement - The select element to populate
     */
    populateLanguageOptions(selectElement) {
    
        if (!selectElement) {
            return;
        }
        
        // Clear existing options
        selectElement.innerHTML = '';
        
        // Get current TTS model
        const ttsModel = this.data.models.tts;
        
        // Get language options for this model
        const languageOptions = this.languageSupport.getLanguageOptions(ttsModel);
        
        // Add options to select element
        languageOptions.forEach(function addOption(option) {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.text;
            selectElement.appendChild(optionElement);
        });
        
        // Set current value if available
        const scriptStore = this.storageManager.load('scriptData', {});
        const currentLang = scriptStore.language || 'english';
        const isSupported = languageOptions.some(function(option) { return option.value === currentLang; });
        if (isSupported) {
            selectElement.value = currentLang;
        } else {
            selectElement.value = 'english';
            const updated = this.storageManager.load('scriptData', {}) || {};
            updated.language = 'english';
            this.storageManager.save('scriptData', updated);
        }
    }
    
    /**
     * Set value of a select element if it exists
     * @param {string} elementId - ID of select element
     * @param {string} value - Value to set
     */
    setSelectValueIfExists(elementId, value) {
    
        const element = document.getElementById(elementId);
        if (element && value) {
            // Check if this value exists as an option
            const optionExists = Array.from(element.options).some(option => option.value === value);
            
            if (optionExists) {
                element.value = value;
            } else {
                // If the value doesn't exist, find and use the selected option
                const selectedOption = element.querySelector('option[selected]');
                if (selectedOption) {
                    element.value = selectedOption.value;
                    // Update the model value to match
                    const modelKey = {
                        'outline-model': 'outline',
                        'outline-verify-model': 'outlineVerify',
                        'script-model': 'script',
                        'script-verify-model': 'scriptVerify',
                        'backstory-model': 'backstory',
                        'tts-model': 'tts'
                    }[elementId];
                    
                    if (modelKey) {
                        this.data.models[modelKey] = selectedOption.value;
                    }
                }
            }
        }
    }
    
    /**
     * Set the usage counter
     * @param {UsageCounter} usageCounter - Instance of UsageCounter
     */
    setUsageCounter(usageCounter) {
    
        this.usageCounter = usageCounter;
    }
    
    /**
     * Track completion usage
     * @param {string} model - Model name
     * @param {number} promptTokens - Number of input tokens
     * @param {number} completionTokens - Number of output tokens
     */
    trackCompletionUsage(model, promptTokens, completionTokens) {
    
        if (this.usageCounter) {
            this.usageCounter.trackTokenUsage(model, promptTokens, completionTokens);
        }
    }
    
    /**
     * Track TTS usage
     * @param {string} model - TTS model name
     * @param {number} characters - Number of characters processed
     */
    trackTTSUsage(model, characters) {
    
        if (this.usageCounter) {
            this.usageCounter.trackTTSUsage(model, characters);
        }
    }
    
    /**
     * Check if a model is Anthropic-style (Claude/o3/o4)
     * @param {string} modelName - Name of the model
     * @returns {boolean} - True if model is Anthropic-style
     */
    isAnthropicStyleModel(modelName) {
    
        return modelName.toLowerCase().includes('o3') || modelName.toLowerCase().includes('o4');
    }
    
    /**
     * Create a request body for OpenAI API calls with model-specific parameters
     * @param {string} modelName - Name of the model to use
     * @param {Array} messages - Array of message objects with role and content
     * @param {Object} options - Additional options like temperature, max_tokens, etc.
     * @returns {Object} - Request body object ready to be stringified
     */
    createRequestBody(modelName, messages, options = {}) {
    
        // Check if this is an Anthropic-style model
        const isAnthropicStyle = this.isAnthropicStyleModel(modelName);
        
        // Start with basic request body that works for all models
        const requestBody = {
            model: modelName,
            messages: messages
        };
        
        // Add temperature if specified in options
        if (!isAnthropicStyle && options.temperature !== undefined) {
            requestBody.temperature = options.temperature;
        }
        
        // Handle token limits differently based on model type
        if (options.maxTokens !== undefined) {
            if (isAnthropicStyle) {
                requestBody.max_completion_tokens = options.maxTokens;
            } else {
                requestBody.max_tokens = options.maxTokens;
            }
        }
        
        // Add any other options that are model-agnostic
        const otherOptions = ['stream', 'top_p', 'frequency_penalty', 'presence_penalty'];
        otherOptions.forEach(option => {
            const camelOption = option.replace(/_([a-z])/g, g => g[1].toUpperCase());
            if (options[camelOption] !== undefined) {
                requestBody[option] = options[camelOption];
            }
        });
        
        return requestBody;
    }
    
    /**
     * Handle retry notification
     * @param {Object} retryInfo - Information about the retry
     */
    handleRetryNotification(retryInfo) {
    
        const { error, attempt, delay, maxRetries } = retryInfo;
        const delaySeconds = Math.ceil(delay / 1000);
        
        // Log detailed error information
        const errorDetails = {
            status: error.status || 'Network Error',
            message: error.message || 'Unknown error',
            body: error.body || '',
            endpoint: error.endpoint || '',
            attempt: attempt,
            maxRetries: maxRetries
        };
        
        console.warn(`OpenAI API call failed, retrying (${attempt}/${maxRetries}) in ${delaySeconds}s...`, errorDetails);
        
        // Only show notification for first retry to avoid spamming
        if (attempt === 1) {
            this.notifications.showInfo(`API call failed (${errorDetails.status}). Retrying automatically...`);
        }
    }
    
    /**
     * Make a fetch request to the OpenAI API with retry logic
     * @param {string} endpoint - API endpoint (e.g., '/v1/chat/completions')
     * @param {Object} options - Fetch options including method, headers, and body
     * @param {Function} [responseValidator] - Optional function to validate response content
     * @returns {Promise<Object>} - API response data (already JSON parsed)
     */
    async fetchWithRetry(endpoint, options, responseValidator) {
    
        const apiUrl = `https://api.openai.com${endpoint}`;
        const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        
        // Log request attempt
        console.log(`[API:${requestId}] Making request to ${endpoint}`);
        
        try {
            // Use retryManager for the actual retry mechanism
            return await this.retryManager.execute(
                async () => {
                    // Start time for performance logging
                    const startTime = performance.now();
                    
                    try {
                        const response = await fetch(apiUrl, options);
                        const endTime = performance.now();
                        const duration = Math.round(endTime - startTime);
                        
                        // Log successful response time
                        console.log(`[API:${requestId}] Response received in ${duration}ms with status ${response.status}`);
                        
                        // Handle non-2xx responses by throwing an error
                        if (!response.ok) {
                            const errorBody = await response.text();
                            let parsedError = errorBody;
                            
                            // Try to parse JSON error response
                            try {
                                parsedError = JSON.parse(errorBody);
                            } catch (e) {
                                // Keep as text if not JSON
                            }
                            
                            // Create detailed error
                            const error = new Error(`API request failed with status ${response.status}`);
                            error.status = response.status;
                            error.body = parsedError;
                            error.endpoint = endpoint;
                            error.requestId = requestId;
                            
                            // Log the error details
                            console.error(`[API:${requestId}] Request failed with status ${response.status}:`, {
                                endpoint: endpoint,
                                status: response.status,
                                error: parsedError,
                                duration: duration
                            });
                            
                            throw error;
                        }
                        
                        // Parse the JSON response
                        const responseData = await response.json();
                        
                        // If a response validator is provided, use it to check the response
                        if (responseValidator && !responseValidator(responseData)) {
                            console.warn(`[API:${requestId}] Response validation failed:`, responseData);
                            const error = new Error('Response validation failed');
                            error.status = 'VALIDATION_FAILED';
                            error.body = responseData;
                            error.endpoint = endpoint;
                            error.requestId = requestId;
                            throw error;
                        }
                        
                        return responseData;
                    } catch (error) {
                        // Enhance error with endpoint info if it's a network error
                        if (!error.status) {
                            error.endpoint = endpoint;
                            error.requestId = requestId;
                            console.error(`[API:${requestId}] Network error:`, {
                                endpoint: endpoint,
                                error: error.message
                            });
                        }
                        throw error;
                    }
                },
                // Custom function to determine if error is retryable
                (error) => {
                    // Retry on validation failures (our custom status)
                    if (error.status === 'VALIDATION_FAILED') {
                        console.log(`[API:${requestId}] Content validation failed, will retry`);
                        return true;
                    }
                    
                    // Retry on network errors (handled by RetryManager.isNetworkError)
                    if (!error.status) {
                        console.log(`[API:${requestId}] Network error detected, will retry`);
                        return true;
                    }
                    
                    // Retry on rate limits (429) and server errors (5xx)
                    const isRetryable = error.status === 429 || (error.status >= 500 && error.status < 600);
                    
                    console.log(
                        `[API:${requestId}] Status ${error.status} ${isRetryable ? 'is' : 'is not'} retryable`
                    );
                    
                    return isRetryable;
                }
            );
        } catch (finalError) {
            // Final error after all retries
            console.error(`[API:${requestId}] All retry attempts failed for ${endpoint}:`, {
                error: finalError.message,
                status: finalError.status || 'Network Error',
                body: finalError.body || ''
            });
            throw finalError;
        }
    }
    
    /**
     * Make a chat completions API call with retry logic
     * @param {Object} requestBody - Request body for the API call
     * @param {string} apiKey - OpenAI API key
     * @returns {Promise<Object>} - API response data
     */
    async createChatCompletion(requestBody, apiKey) {
    
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        };
        
        // Define a content validator function to check for valid content in the response
        const chatContentValidator = (responseData) => {
            const hasValidContent = responseData.choices && 
                                    responseData.choices[0] && 
                                    responseData.choices[0].message && 
                                    responseData.choices[0].message.content && 
                                    responseData.choices[0].message.content.trim().length > 0;
            
            // If validation fails, show a notification on first validation failure only
            if (!hasValidContent && !this._hasShownEmptyContentWarning) {
                this._hasShownEmptyContentWarning = true;
                this.notifications.showInfo(`Empty response received from API. Retrying automatically...`);
                
                // Reset the flag after a delay so we don't spam the user with notifications
                setTimeout(() => {
                    this._hasShownEmptyContentWarning = false;
                }, 30000); // Reset after 30 seconds
            }
            
            return hasValidContent;
        };
        
        try {
            // Use fetchWithRetry with our content validator
            const responseData = await this.fetchWithRetry(
                '/v1/chat/completions', 
                options, 
                chatContentValidator
            );
            
            // Track usage if available
            if (responseData.usage && this.usageCounter) {
                this.trackCompletionUsage(
                    requestBody.model,
                    responseData.usage.prompt_tokens,
                    responseData.usage.completion_tokens
                );
            }
            
            return responseData;
        } catch (error) {
            console.error('Chat completion failed after all retries:', error);
            
            // Add more context to the error if it was a validation failure
            if (error.status === 'VALIDATION_FAILED') {
                throw new Error('No valid content received from API after maximum retries');
            }
            
            throw error;
        }
    }
    
    /**
     * Make a text-to-speech API call with retry logic
     * @param {Object} requestBody - Request body for the API call
     * @param {string} apiKey - OpenAI API key
     * @returns {Promise<ArrayBuffer>} - Audio data as ArrayBuffer
     */
    async createSpeech(requestBody, apiKey) {
    
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        };
        
        try {
            const response = await this.fetchWithRetry('/v1/audio/speech', options);
            const audioData = await response.arrayBuffer();
            
            // Track TTS usage if available
            if (this.usageCounter && requestBody.input) {
                this.trackTTSUsage(requestBody.model, requestBody.input.length);
            }
            
            return audioData;
        } catch (error) {
            console.error('Speech generation error:', error);
            throw error;
        }
    }
}


export default OpenAIManager;
