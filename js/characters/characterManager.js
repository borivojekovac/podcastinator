// Podcastinator App - Character Manager
import NotificationsManager from '../ui/notifications.js';
import ProgressManager from '../ui/progressManager.js';

class CharacterManager {
    constructor(storageManager, contentStateManager, apiManager) {
        this.storageManager = storageManager;
        this.contentStateManager = contentStateManager;
        this.apiManager = apiManager;
        this.notifications = new NotificationsManager();
        this.progressManager = new ProgressManager();
        
        // Define character types
        this.types = ['host', 'guest'];
        
        // Define personality types with descriptions
        this.personalities = {
            'enthusiastic': 'Energetic and passionate about the topic',
            'professional': 'Formal and authoritative with expert knowledge',
            'casual': 'Relaxed, conversational and approachable',
            'analytical': 'Detail-oriented and logical with thoughtful insights',
            'humorous': 'Light-hearted with a good sense of humor',
            'empathetic': 'Understanding and compassionate about others\'s perspectives'
        };
        
        // Define voice types with descriptions (from OpenAI TTS voices)
        this.voices = {
            'alloy': 'Alloy (Male, versatile and balanced)',
            'echo': 'Echo (Male, deep and resonant)',
            'fable': 'Fable (Female, warm and gentle)',
            'onyx': 'Onyx (Male, authoritative and confident)',
            'nova': 'Nova (Female, energetic and professional)',
            'shimmer': 'Shimmer (Female, bright and expressive)'
        };
        
        // Define voice instruction presets for GPT-4o-mini-TTS
        this.voiceInstructions = {
            'professional': {
                'host': 'You are a professional podcast host. Speak clearly and with confidence. Maintain a moderate pace with appropriate pauses. Use subtle emphasis for important points.',
                'guest': 'You are a professional podcast guest. Speak with authority and expertise. Maintain a clear, measured tone. Use thoughtful pacing with occasional emphasis on key points.'
            },
            'enthusiastic': {
                'host': 'You are an enthusiastic podcast host. Speak with high energy and excitement. Vary your tone frequently with lots of dynamic range. Use upbeat pacing and emphasize interesting points.',
                'guest': 'You are an enthusiastic podcast guest. Speak with passion and energy about the topic. Use animated vocal inflections and convey genuine excitement through your tone.'
            },
            'calm': {
                'host': 'You are a calm and soothing podcast host. Speak gently with a warm tone. Use a slightly slower pace with soft, measured delivery. Create a relaxing atmosphere through your voice.',
                'guest': 'You are a calm and thoughtful podcast guest. Speak in a soothing, measured way. Maintain an even tone with gentle inflections. Use a relaxed pace with natural pauses for reflection.'
            },
            'authoritative': {
                'host': 'You are an authoritative podcast host. Speak with gravitas and command. Use a measured pace with deliberate emphasis. Maintain a steady, confident tone throughout.',
                'guest': 'You are an authoritative expert guest. Speak with gravitas and deep knowledge. Use a confident, assertive tone. Emphasize key points with deliberate pacing and clear articulation.'
            },
            'conversational': {
                'host': 'You are a casual, conversational podcast host. Speak naturally as if chatting with a friend. Use a relaxed tone with authentic reactions. Allow for natural pauses and informal language.',
                'guest': 'You are a casual, down-to-earth podcast guest. Speak naturally as if in a friendly conversation. Use an informal, relaxed tone with authentic vocal patterns and occasional humor.'
            },
            'dramatic': {
                'host': 'You are a dramatic podcast narrator. Use theatrical delivery with significant dynamic range. Employ dramatic pauses and emphasis. Create tension and resolution through your vocal performance.',
                'guest': 'You are a dramatic and expressive speaker. Use theatrical vocal techniques with significant dynamic range. Employ dramatic pauses and emphasis to create impact and hold attention.'
            },
            'friendly': {
                'host': 'You are a friendly, approachable podcast host. Speak warmly with a welcoming tone. Use a moderately upbeat pace with genuine enthusiasm. Sound inviting and accessible to listeners.',
                'guest': 'You are a friendly and approachable podcast guest. Speak warmly with an inviting tone. Use a natural, comfortable pace and sound genuinely engaged and happy to share information.'
            },
            'contemplative': {
                'host': 'You are a thoughtful, contemplative podcast host. Speak with measured consideration. Use deliberate pacing with thoughtful pauses. Convey depth and reflection in your tone.',
                'guest': 'You are a thoughtful, contemplative speaker. Use a measured pace with reflective pauses. Speak with depth and nuance, conveying careful consideration of complex ideas through your tone.'
            },
            'news': {
                'host': 'You are a news anchor style podcast host. Speak with clear, precise delivery. Use professional pacing with slight emphasis on key information. Maintain an informative, authoritative tone.',
                'guest': null
            },
            'storytelling': {
                'host': 'You are an engaging storyteller host. Use a dynamic narrative voice with natural rises and falls. Employ well-placed pauses for effect. Convey emotion and progression through your vocal delivery.',
                'guest': 'You are an engaging storyteller. Use a dynamic narrative voice with well-paced delivery. Create immersion through vocal variation and well-timed pauses. Draw listeners in with your engaging tone.'
            },
            'educational': {
                'host': 'You are an educational podcast host. Speak clearly with a focus on comprehension. Use a measured pace with emphasis on key concepts. Maintain an informative but engaging tone.',
                'guest': null
            },
            'academic': {
                'host': null,
                'guest': 'You are an academic professor or researcher. Speak with precise, clear articulation. Use a measured pace appropriate for complex subjects. Maintain an authoritative but accessible tone.'
            },
            'technical': {
                'host': null,
                'guest': 'You are a technical specialist or expert. Speak with precise articulation when explaining complex concepts. Use a measured, clear delivery with emphasis on technical terminology.'
            }
        };
        
        // Load characters data from storage
        const savedData = this.storageManager.load('data', {});
        this.data = {
            host: savedData.host || {},
            guest: savedData.guest || {}
        };
        
        // Status flags for API calls
        this.isGeneratingBackstory = {
            host: false,
            guest: false
        };
    }

    /**
     * Initialize character manager
     */
    init() {
    
        // Setup options first, then populate data
        this.populatePersonalityOptions();
        this.populateVoiceOptions();
        
        // After dropdowns are populated, set saved values and update UI
        this.populateCharacterData();
        
        // Set up event listeners last
        this.setupEventListeners();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
    
        const self = this;
        
        // Set up event listeners for each character type
        this.types.forEach(function(type) {
        
            // Backstory generation button
            const generateBackstoryBtn = document.getElementById(`generate-${type}-backstory`);
            if (generateBackstoryBtn) {
                generateBackstoryBtn.addEventListener('click', function() {
                    self.generateBackstory(type);
                });
            }

            // Save character button
            const saveButton = document.getElementById(`save-${type}`);
            if (saveButton) {
                saveButton.addEventListener('click', function() {
                    self.saveCharacter(type);
                });
            }
            
            // Voice instructions preset selection
            const voiceInstructionsPreset = document.getElementById(`${type}-voice-instructions-preset`);
            if (voiceInstructionsPreset) {
                voiceInstructionsPreset.addEventListener('change', function() {
                    self.handleVoiceInstructionPresetChange(type);
                });
            }
            
            // Voice instructions manual editing
            const voiceInstructions = document.getElementById(`${type}-voice-instructions`);
            if (voiceInstructions) {
                voiceInstructions.addEventListener('input', function() {
                    self.handleVoiceInstructionsManualEdit(type);
                });
            }
            
            // Speech rate slider
            const speechRateSlider = document.getElementById(`${type}-speech-rate`);
            if (speechRateSlider) {
                speechRateSlider.addEventListener('input', function() {
                    self.handleSpeechRateChange(type);
                });
            }
            
            // Real-time updates for form fields
            const formFields = [`${type}-name`, `${type}-personality`, `${type}-voice`, `${type}-backstory`, `${type}-voice-instructions`, `${type}-speech-rate`];
            formFields.forEach(function(fieldId) {
            
                const field = document.getElementById(fieldId);
                if (field) {
                    field.addEventListener('change', function() {
                        self.updateFormStatus(type);
                    });
                    
                    if (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA') {
                        field.addEventListener('input', function() {
                            self.updateFormStatus(type);
                        });
                    }
                }
            });
        });
        
        // Set up listener for TTS model change to show/hide voice instructions and speech rate
        const ttsModelSelect = document.getElementById('tts-model');
        if (ttsModelSelect) {
            ttsModelSelect.addEventListener('change', function() {
                self.updateVoiceInstructionsVisibility();
                self.updateSpeechRateVisibility();
            });
            
            // Initialize visibility on page load
            this.updateVoiceInstructionsVisibility();
            this.updateSpeechRateVisibility();
        }
    }

    /**
     * Populate personality select options for both characters
     */
    populatePersonalityOptions() {
    
        this.types.forEach(function(type) {
        
            const select = document.getElementById(`${type}-personality`);
            if (select) {
                // Clear existing options except the first placeholder
                while (select.options.length > 1) {
                    select.remove(1);
                }
                
                // Add personality options
                Object.entries(this.personalities).forEach(function([value, description]) {
                
                    const option = document.createElement('option');
                    option.value = value;
                    option.text = description;
                    select.appendChild(option);
                });
            }
        }.bind(this));
    }
    
    /**
     * Populate voice select options for both characters
     */
    populateVoiceOptions() {
    
        this.types.forEach(function(type) {
        
            const select = document.getElementById(`${type}-voice`);
            if (select) {
                // Clear existing options except the first placeholder
                while (select.options.length > 1) {
                    select.remove(1);
                }
                
                // Add voice options
                Object.entries(this.voices).forEach(function([value, description]) {
                
                    const option = document.createElement('option');
                    option.value = value;
                    option.text = description;
                    select.appendChild(option);
                });
            }
        }.bind(this));
    }

    /**
     * Populate character data in form elements
     */
    populateCharacterData() {
    
        this.types.forEach(function(type) {
        
            const characterData = this.data[type];
            if (characterData && characterData.name) {
                document.getElementById(`${type}-name`).value = characterData.name;
                
                // Get the personality select and set its value if it exists in the saved data
                const personalitySelect = document.getElementById(`${type}-personality`);
                if (personalitySelect && characterData.personality) {
                    personalitySelect.value = characterData.personality;
                }
                
                // Get the voice select and set its value if it exists in the saved data
                const voiceSelect = document.getElementById(`${type}-voice`);
                if (voiceSelect && characterData.voice) {
                    voiceSelect.value = characterData.voice;
                }
                
                // Set backstory
                document.getElementById(`${type}-backstory`).value = characterData.backstory || '';
                
                // Set voice instructions if they exist
                const voiceInstructionsField = document.getElementById(`${type}-voice-instructions`);
                if (voiceInstructionsField && characterData.voiceInstructions) {
                    voiceInstructionsField.value = characterData.voiceInstructions;
                }
                
                // Set voice instructions preset if it exists
                const voiceInstructionsPresetField = document.getElementById(`${type}-voice-instructions-preset`);
                if (voiceInstructionsPresetField && characterData.voiceInstructionsPreset) {
                    voiceInstructionsPresetField.value = characterData.voiceInstructionsPreset;
                }
                
                // Set speech rate slider and display value if it exists
                const speechRateSlider = document.getElementById(`${type}-speech-rate`);
                const speechRateValue = document.getElementById(`${type}-speech-rate-value`);
                if (speechRateSlider && speechRateValue && characterData.speechRate) {
                    const actualRate = parseFloat(characterData.speechRate);
                    
                    // Convert actual rate to raw slider value
                    const rawValue = this.speechRateToRaw(actualRate);
                    
                    // Update slider position
                    speechRateSlider.value = rawValue;
                    
                    // Update display value
                    speechRateValue.textContent = actualRate.toFixed(2);
                }
                
                // Force character preview update
                this.updateCharacterPreview(type);
            }
            
            // Always update form status to set buttons correctly
            this.updateFormStatus(type);
        }.bind(this));
    }

    /**
     * Update form status based on field values
     * @param {string} type - Character type ('host' or 'guest') 
     */
    updateFormStatus(type) {
    
        const requiredFields = [
            `${type}-name`,
            `${type}-personality`,
            `${type}-voice`
        ];
        
        // Check if all required fields have values
        const isComplete = requiredFields.every(function(fieldId) {
        
            const field = document.getElementById(fieldId);
            return field && field.value.trim() !== '';
        });
        
        // Update save button state
        const saveButton = document.getElementById(`save-${type}`);
        if (saveButton) {
            saveButton.disabled = !isComplete;
        }
        
        // Update character preview
        this.updateCharacterPreview(type);
        
        return isComplete;
    }
    
    /**
     * Update character preview UI
     * @param {string} type - Character type ('host' or 'guest')
     */
    updateCharacterPreview(type) {
    
        const name = document.getElementById(`${type}-name`).value.trim();
        const personality = document.getElementById(`${type}-personality`).value;
        const voice = document.getElementById(`${type}-voice`).value;
        const preview = document.getElementById(`${type}-preview`);
        const traits = document.getElementById(`${type}-traits`);
        
        // If preview UI is not present, safely exit
        if (!preview || !traits) {
            return;
        }
        
        // No preview if name is empty
        if (!name) {
            preview.style.display = 'none';
            return;
        }
        
        // Create traits HTML
        let traitsHTML = '';
        
        // Add name if available
        if (name) {
            traitsHTML += `<div class="character-trait">${name}</div>`;
        }
        
        // Add personality if selected
        if (personality) {
            const personalityText = this.personalities[personality] || personality;
            traitsHTML += `<div class="character-trait">${personalityText}</div>`;
        }
        
        // Add voice if selected
        if (voice) {
            const voiceText = this.voices[voice] || voice;
            traitsHTML += `<div class="character-trait voice">${voiceText.split('(')[0].trim()}</div>`;
        }
        
        // Check if we have at least some traits to show
        if (traitsHTML) {
            traits.innerHTML = traitsHTML;
            preview.style.display = 'block';
            
            // Update status
            const isComplete = name && personality && voice;
            const statusDiv = document.getElementById(`${type}-status`);
            const statusText = document.getElementById(`${type}-status-text`);
            
            if (statusDiv && statusText) {
                if (isComplete) {
                    statusDiv.className = 'character-status complete';
                    statusText.textContent = 'Character complete';
                } else {
                    statusDiv.className = 'character-status incomplete';
                    statusText.textContent = 'Character incomplete';
                }
            }
        } else {
            preview.style.display = 'none';
        }
    }
    
    /**
     * Save character data
     * @param {string} type - Character type ('host' or 'guest')
     */
    saveCharacter(type) {
    
        // Get form values
        const name = document.getElementById(`${type}-name`).value.trim();
        const personality = document.getElementById(`${type}-personality`).value;
        const voice = document.getElementById(`${type}-voice`).value;
        const backstory = document.getElementById(`${type}-backstory`).value.trim();
        const voiceInstructions = document.getElementById(`${type}-voice-instructions`).value.trim();
        const voiceInstructionsPreset = document.getElementById(`${type}-voice-instructions-preset`).value;
        
        // Get the raw slider value
        const rawSliderValue = document.getElementById(`${type}-speech-rate`).value;
        
        // Convert to actual speech rate - this is what we should store
        const speechRate = this.rawToSpeechRate(parseFloat(rawSliderValue));
        
        // Validate required fields
        if (!name || !personality || !voice) {
            this.notifications.showError(`Please fill out all required fields for the ${type} character.`);
            return;
        }
        
        // Update character data
        this.data[type] = {
            name,
            personality,
            voice,
            backstory,
            voiceInstructions,
            voiceInstructionsPreset,
            speechRate
        };
        
        // Save to storage
        const existingData = this.storageManager.load('data', {});
        existingData[type] = this.data[type];
        this.storageManager.save('data', existingData);
        
        // Show success message
        this.notifications.showSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} character saved successfully!`);
        
        // Update content state to enable next section
        if (type === 'host') {
            this.contentStateManager.updateState('hasHostCharacter', true);
        } else if (type === 'guest') {
            this.contentStateManager.updateState('hasGuestCharacter', true);
        }
        
        // Update workflow if both characters are complete
        if (this.contentStateManager.getState('hasHostCharacter') && 
            this.contentStateManager.getState('hasGuestCharacter')) {
            this.contentStateManager.updateState('hasCharacters', true);
        }
        
        // Update UI sections
        setTimeout(() => {
            this.contentStateManager.updateSections();
        }, 1000);
    }

    /**
     * Generate character backstory using OpenAI API
     * @param {string} type - Character type ('host' or 'guest')
     */
    async generateBackstory(type) {
    
        // Get user prompt
        const prompt = document.getElementById(`${type}-backstory-prompt`).value.trim();
        if (!prompt) {
            this.notifications.showError('Please enter a prompt for backstory generation');
            return;
        }
        
        // Get API data
        const apiData = this.apiManager.getApiData();
        if (!apiData.apiKey) {
            this.notifications.showError('OpenAI API key is required. Please configure it in step 1.');
            return;
        }
        
        // Get personality selection
        const personalitySelect = document.getElementById(`${type}-personality`);
        const personality = personalitySelect.value || '';
        const personalityText = personality ? this.personalities[personality] || personality : '';
        
        // Set up UI for loading state
        const backstoryArea = document.getElementById(`${type}-backstory`);
        const generateButton = document.getElementById(`generate-${type}-backstory`);
        const originalButtonText = generateButton.textContent;
        
        // Prevent multiple simultaneous calls
        if (this.isGeneratingBackstory[type]) {
            return;
        }
        
        try {
            // Set loading state
            this.isGeneratingBackstory[type] = true;
            generateButton.disabled = true;
            generateButton.innerHTML = '<span class="spinner"></span> Generating...';
            backstoryArea.classList.add('loading');
            
            // Build context for more interesting results
            let characterName = document.getElementById(`${type}-name`).value.trim();
            if (!characterName) {
                characterName = `${type.charAt(0).toUpperCase() + type.slice(1)} character`;
            }
            
            // Build system prompt and user prompt
            const systemPrompt = `You are a creative character developer for podcasts. 
            Create a detailed backstory for a podcast ${type} character named ${characterName}.
            ${personalityText ? `Their personality is ${personalityText}.` : ''}
            The backstory should include their background, expertise, communication style, and unique traits.
            Keep it concise (100-200 words max) but rich in personality.`;
            
            const userPrompt = `Based on this brief description, create a backstory for ${characterName}: "${prompt}"`;
            
            // Create API request
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiData.apiKey}`
                },
                body: JSON.stringify({
                    model: apiData.models.backstory,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    max_tokens: 1000,
                    temperature: 0.7
                })
            });
            
            // Handle API response
            if (!response.ok) {
                let errorMessage = 'Failed to generate backstory';
                
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
            
            const data = await response.json();
            const backstory = data.choices[0]?.message?.content?.trim();
            
            // Track token usage if available
            if (data.usage) {
                const modelName = apiData.models.backstory;
                const promptTokens = data.usage.prompt_tokens || 0;
                const completionTokens = data.usage.completion_tokens || 0;
                
                // Track usage via API manager
                this.apiManager.trackCompletionUsage(modelName, promptTokens, completionTokens);
            }
            
            if (backstory) {
                backstoryArea.value = backstory;
                this.notifications.showSuccess('Backstory generated! You can edit it if needed.');
                this.updateFormStatus(type);
            } else {
                throw new Error('No backstory content received from API');
            }
            
        } catch (error) {
            console.error('Backstory generation error:', error);
            this.notifications.showError(error.message || 'Failed to generate backstory. Please try again.');
        } finally {
            // Reset UI state
            this.isGeneratingBackstory[type] = false;
            generateButton.disabled = false;
            generateButton.textContent = originalButtonText;
            backstoryArea.classList.remove('loading');
        }
    }

    /**
     * Save data to storage
     */
    saveToStorage() {
    
        const existingData = this.storageManager.load('data', {});
        const updatedData = {
            ...existingData,
            host: this.data.host,
            guest: this.data.guest
        };
        this.storageManager.save('data', updatedData);
    }

    /**
     * Get character data
     * @returns {Object} - Character data for host and guest
     */
    getCharacterData() {
    
        return {
            host: this.data.host,
            guest: this.data.guest
        };
    }
    
    /**
     * Check if both characters are complete
     * @returns {boolean} - True if both characters are complete and valid
     */
    areCharactersComplete() {
    
        // Check if both host and guest have required fields
        return this.types.every(function(type) {
        
            const character = this.data[type];
            return character && 
                   character.name && 
                   character.personality && 
                   character.voice;
        }.bind(this));
    }

    /**
     * Save all data to storage
     */
    saveToStorage() {
    
        const existingData = this.storageManager.load('data', {});
        existingData.host = this.data.host;
        existingData.guest = this.data.guest;
        this.storageManager.save('data', existingData);
    }
    
    /**
     * Handle voice instruction preset selection changes
     * @param {string} type - Character type ('host' or 'guest')
     */
    handleVoiceInstructionPresetChange(type) {
    
        const presetSelect = document.getElementById(`${type}-voice-instructions-preset`);
        const instructionsTextarea = document.getElementById(`${type}-voice-instructions`);
        
        if (!presetSelect || !instructionsTextarea) {
            return;
        }
        
        const selectedPreset = presetSelect.value;
        
        if (selectedPreset === 'custom') {
            // Do nothing if custom is selected - keep existing text
            return;
        }
        
        if (selectedPreset && this.voiceInstructions[selectedPreset] && this.voiceInstructions[selectedPreset][type]) {
            // Set the instructions text from the preset
            instructionsTextarea.value = this.voiceInstructions[selectedPreset][type];
        } else {
            // Clear the instructions if no preset is selected
            instructionsTextarea.value = '';
        }
    }
    
    /**
     * Handle manual editing of voice instructions
     * @param {string} type - Character type ('host' or 'guest')
     */
    handleVoiceInstructionsManualEdit(type) {
    
        const presetSelect = document.getElementById(`${type}-voice-instructions-preset`);
        const instructionsTextarea = document.getElementById(`${type}-voice-instructions`);
        
        if (!presetSelect || !instructionsTextarea) {
            return;
        }
        
        // Get current preset and instructions text
        const selectedPreset = presetSelect.value;
        const currentText = instructionsTextarea.value;
        
        // If a preset is selected (not custom) but the text doesn't match the preset,
        // that means user has manually edited it, so we should switch to custom
        if (selectedPreset !== 'custom' && selectedPreset !== '') {
            const presetText = this.voiceInstructions[selectedPreset] && 
                               this.voiceInstructions[selectedPreset][type];
                               
            if (presetText !== currentText) {
                presetSelect.value = 'custom';
            }
        }
    }
    
    /**
     * Update voice instructions visibility based on TTS model
     */
    updateVoiceInstructionsVisibility() {
    
        const ttsModel = document.getElementById('tts-model');
        if (!ttsModel) return;
        
        // Show voice instructions only for GPT-4o-mini-TTS
        const showVoiceInstructions = ttsModel.value === 'gpt-4o-mini-tts';
        
        this.types.forEach(function(type) {
        
            const container = document.getElementById(`${type}-voice-instructions-container`);
            if (container) {
                container.style.display = showVoiceInstructions ? 'block' : 'none';
            }
        });
    }

    /**
     * Update speech rate visibility based on TTS model
     */
    updateSpeechRateVisibility() {
    
        const ttsModel = document.getElementById('tts-model');
        if (!ttsModel) return;
        
        // Show speech rate only for TTS-1 and TTS-1-HD
        const showSpeechRate = ttsModel.value === 'tts-1' || ttsModel.value === 'tts-1-hd';
        
        this.types.forEach(function(type) {
        
            const container = document.getElementById(`${type}-speech-rate-container`);
            if (container) {
                container.style.display = showSpeechRate ? 'block' : 'none';
            }
        });
    }
    
    /**
     * Convert raw slider value to actual speech rate
     * @param {number} rawValue - Slider value (-3 to +3)
     * @returns {number} - Actual speech rate value
     */
    rawToSpeechRate(rawValue) {
    
        let actualRate;
        
        if (rawValue < 0) {
            // Negative values (slower): 1/(|value|+1)
            actualRate = 1 / (Math.abs(rawValue) + 1);
        } else if (rawValue > 0) {
            // Positive values (faster): rawValue+1
            actualRate = rawValue + 1;
        } else {
            // Zero (normal): 1.0
            actualRate = 1.0;
        }
        
        return actualRate;
    }
    
    /**
     * Convert actual speech rate to raw slider value
     * @param {number} speechRate - Actual speech rate value
     * @returns {number} - Raw slider value (-3 to +3)
     */
    speechRateToRaw(speechRate) {
    
        // Handle standard case
        if (speechRate === 1.0) {
            return 0;
        }
        
        // Handle slower than normal (rate < 1.0)
        if (speechRate < 1.0) {
            // Invert the formula: 1 / (|value| + 1)
            // If speechRate = 1/(|value|+1), then |value| = (1/speechRate) - 1
            const absValue = (1 / speechRate) - 1;
            return -absValue; // Negative for slower speeds
        }
        
        // Handle faster than normal (rate > 1.0)
        // Invert the formula: rawValue + 1 = speechRate
        // Therefore: rawValue = speechRate - 1
        return speechRate - 1;
    }
    
    /**
     * Handle speech rate change
     * @param {string} type - Character type ('host' or 'guest')
     */
    handleSpeechRateChange(type) {
    
        const slider = document.getElementById(`${type}-speech-rate`);
        const valueDisplay = document.getElementById(`${type}-speech-rate-value`);
        
        if (slider && valueDisplay) {
            // Get the raw slider value (-4 to +4)
            const rawValue = parseFloat(slider.value);
            
            // Convert to actual speech rate using helper method
            const actualRate = this.rawToSpeechRate(rawValue);
            
            // Round to 2 decimal places for display
            const rateValue = actualRate.toFixed(2);
            valueDisplay.textContent = rateValue;
            
            // Save the actual rate value, not the raw slider value
            this.data[type].speechRate = actualRate;
            
            // Update form status
            this.updateFormStatus(type);
        }
    }

}

export default CharacterManager;
