// Podcastinator App - Audio Generator
import NotificationsManager from '../ui/notifications.js';
import ProgressManager from '../ui/progressManager.js';
import Mp3Encoder from '../utils/mp3Encoder.js';
import RetryManager from '../utils/retryManager.js';

/**
 * Handles the generation of podcast audio using OpenAI TTS
 */
class AudioGenerator {
    constructor(storageManager, contentStateManager, apiManager) {
        this.storageManager = storageManager;
        this.contentStateManager = contentStateManager;
        this.apiManager = apiManager;
        this.notifications = new NotificationsManager();
        this.progressManager = new ProgressManager();
        
        // Generation state
        this.isGenerating = false;
        this.cancelGeneration = false;
        this.currentSegment = 0;
        this.totalSegments = 0;
        
        // Initialize retry manager with default settings
        this.retryManager = new RetryManager({
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            jitter: 0.25,
            onRetry: this.handleRetryNotification.bind(this),
            shouldCancel: this.checkCancelStatus.bind(this)
        });
        
        // Audio context and nodes
        this.audioContext = null;
        this.audioSegments = [];
        this.finalAudio = null;
        
        // MP3 encoder for efficient audio encoding
        this.mp3Encoder = null;
        
        // Session storage for cached audio segments
        this.segmentCache = {};
        
        // Blob URL for current audio
        this.audioUrl = null;
        
        // Load existing audio data from storage
        const savedData = this.storageManager.load('audioData', {});
        this.audioData = savedData.audioData || null; // Base64 encoded audio data
        this.silenceDuration = savedData.silenceDuration || 500; // Default 500ms silence between speakers
        
        // If we have audio data, create a blob URL for it
        if (this.audioData) {
            this.createBlobUrlFromAudioData();
        }
    }

    /**
     * Initialize the audio generator
     */
    init() {
        // Initialize UI components
        this.initializeUI();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Restore saved data if it exists
        this.restoreSavedData();
        
        // Immediately check for script availability (after UI is initialized)
        const self = this;
        setTimeout(function checkForExistingScript() {
            self.updateButtonState();
            
            // Check if script exists in storage
            const scriptData = self.storageManager.load('scriptData', {});
            if (scriptData.script && scriptData.script.trim()) {
                console.log('Script found in storage, enabling audio generation');
                self.contentStateManager.updateState('hasScript', true);
            }
        }, 100);
    }
    
    /**
     * Initialize UI components
     */
    initializeUI() {
        // Get UI elements
        this.silenceInput = document.getElementById('silence-duration');
        this.generateButton = document.getElementById('generate-audio');
        this.downloadButton = document.getElementById('download-audio');
        this.progressContainer = document.getElementById('audio-progress');
        this.progressBar = this.progressContainer.querySelector('.progress-bar .progress-fill');
        this.cancelButton = this.progressContainer.querySelector('.btn-cancel');
        this.audioResult = document.getElementById('audio-result');
        this.audioPlayer = this.audioResult.querySelector('audio');
        this.audioSource = document.getElementById('audio-source');
        
        // Make sure progress bar is initially hidden
        if (this.progressContainer) {
            this.progressContainer.style.display = 'none';
        }
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Generate audio button
        if (this.generateButton) {
            this.generateButton.addEventListener('click', this.handleGenerateAudio.bind(this));
        }
        
        // Cancel generation button
        if (this.cancelButton) {
            this.cancelButton.addEventListener('click', this.handleCancelGeneration.bind(this));
        }
        
        // Download button
        if (this.downloadButton) {
            this.downloadButton.addEventListener('click', this.handleDownloadAudio.bind(this));
        }
        
        // Silence duration input
        if (this.silenceInput) {
            this.silenceInput.addEventListener('change', this.handleSilenceDurationChange.bind(this));
        }
        
        // Listen for content state changes to update button state
        document.addEventListener('contentStateChanged', this.updateButtonState.bind(this));
    }
    
    /**
     * Restore saved data if it exists
     */
    restoreSavedData() {
        // Restore silence duration
        if (this.silenceDuration && this.silenceInput) {
            this.silenceInput.value = this.silenceDuration;
        }
        
        // Restore audio if available
        if (this.audioUrl) {
            this.showAudioPlayer(this.audioUrl);
            this.contentStateManager.updateState('hasAudio', true);
        }
        
        // Update button state based on script availability
        this.updateButtonState();
    }
    
    /**
     * Handle generate audio button click
     */
    async handleGenerateAudio() {
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
            
            // Get script data
            const scriptData = this.storageManager.load('scriptData', {});
            
            if (!scriptData.script) {
                throw new Error('No script found. Please generate a script first.');
            }
            
            // Get character data for voices
            const data = this.storageManager.load('data', {});
            const characterData = {
                host: data.host || {},
                guest: data.guest || {}
            };
            
            if (!characterData.host.voice || !characterData.guest.voice) {
                throw new Error('Host and guest voice selection is required. Please complete character creation first.');
            }
            
            // Initialize Web Audio API
            await this.initAudioContext();
            
            // Parse script segments
            const segments = this.parseScriptSegments(scriptData.script);
            this.totalSegments = segments.length;
            
            if (this.totalSegments === 0) {
                throw new Error('Could not parse any segments from the script. Please check the script format.');
            }
            
            // Clear previous results
            this.audioSegments = [];
            this.segmentCache = {};
            
            // Generate audio segment by segment
            await this.generatePodcastAudio(segments, characterData, apiData);
            
        } catch (error) {
            console.error('Audio generation error:', error);
            this.notifications.showError(error.message || 'Failed to generate audio. Please try again.');
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
        this.notifications.showInfo('Cancelling audio generation...');
    }
    
    /**
     * Handle silence duration change
     */
    handleSilenceDurationChange() {
        // Save new duration to storage (in milliseconds)
        this.silenceDuration = parseInt(this.silenceInput.value, 10);
        this.saveAudioData();
    }
    
    /**
     * Handle download audio button click
     */
    handleDownloadAudio() {
        if (!this.audioUrl) {
            this.notifications.showError('No audio available for download.');
            return;
        }
        
        // Create download link
        const link = document.createElement('a');
        link.href = this.audioUrl;
        link.download = 'podcast.mp3'; // Change extension to mp3
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    /**
     * Initialize Web Audio API context
     */
    async initAudioContext() {
        // Create audio context if it doesn't exist
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Resume context if it's suspended (needed due to autoplay policy)
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }
    
    /**
     * Parse script into segments for audio generation
     * @param {string} scriptText - The script text to parse
     * @returns {Array} - Array of script segments
     */
    parseScriptSegments(scriptText) {
        if (!scriptText) {
            return [];
        }
        
        // Split by lines
        const segments = [];
        const lines = scriptText.split('\n');
        
        let currentSpeaker = null;
        let currentText = '';
        
        // Regex pattern for speaker identification
        // This matches:
        // - Optional whitespace at the beginning of the line
        // - HOST: or GUEST: (case-insensitive)
        // - Captures any text after the colon
        const speakerPattern = /^\s*(HOST|GUEST)\s*:\s*(.*)/i;
        
        // Section separator pattern
        const separatorPattern = /^\s*---\s*$/;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check for section separator
            if (separatorPattern.test(line)) {
                // Found separator, check next line for speaker
                if (i + 1 < lines.length) {
                    const nextLine = lines[i + 1];
                    const speakerMatch = nextLine.match(speakerPattern);
                    
                    // Save current segment if exists
                    if (currentSpeaker && currentText.trim()) {
                        segments.push({
                            speaker: currentSpeaker,
                            text: currentText.trim()
                        });
                        currentText = '';
                    }
                    
                    // Update speaker if the next line is a speaker marker
                    if (speakerMatch) {
                        currentSpeaker = speakerMatch[1].toUpperCase();
                        i++; // Skip the speaker line
                    }
                }
            }
            // Check for inline speaker labels
            else {
                const speakerMatch = line.match(speakerPattern);
                
                if (speakerMatch) {
                    // If current segment is in progress, save it
                    if (currentSpeaker && currentText.trim()) {
                        segments.push({
                            speaker: currentSpeaker,
                            text: currentText.trim()
                        });
                        currentText = '';
                    }
                    
                    // Update speaker and capture text content
                    currentSpeaker = speakerMatch[1].toUpperCase();
                    currentText = speakerMatch[2] + '\n';
                }
                else if (currentSpeaker) {
                    // Add to current segment
                    currentText += line + '\n';
                }
            }
        }
        
        // Add final segment if there is one
        if (currentSpeaker && currentText.trim()) {
            segments.push({
                speaker: currentSpeaker,
                text: currentText.trim()
            });
        }
        
        return segments;
    }
    
    /**
     * Generate podcast audio from script segments
     * @param {Array} segments - Parsed script segments
     * @param {Object} characterData - Host and guest character data
     * @param {Object} apiData - API credentials and model data
     */
    async generatePodcastAudio(segments, characterData, apiData) {
        try {
            // Initialize progress tracking
            this.currentSegment = 0;
            
            // We'll initialize the MP3 encoder when we get the first audio segment
            // This ensures we match OpenAI's TTS sample rate correctly
            this.mp3Encoder = null;
            
            // Generate audio for each segment
            for (let i = 0; i < segments.length; i++) {
                // Check if cancelled
                if (this.cancelGeneration) {
                    this.cancelGeneration = false;
                    throw new Error('Audio generation cancelled');
                }
                
                // Update progress
                this.currentSegment = i + 1;
                const progressPercentage = Math.floor((this.currentSegment / this.totalSegments) * 100);
                this.progressManager.updateProgress('audio-progress', progressPercentage);
                
                // Generate segment audio
                const segment = segments[i];
                const isSpeakerHost = segment.speaker === 'HOST';
                
                // Get appropriate voice based on speaker
                const voice = isSpeakerHost ? 
                    characterData.host.voice : 
                    characterData.guest.voice;
                
                // Generate audio for this segment
                const audioBuffer = await this.generateSegmentAudio(segment.text, voice, apiData);
                
                // Initialize MP3 encoder with the actual sample rate from OpenAI if needed
                if (!this.mp3Encoder) {
                    // Get the actual sample rate from the audio buffer
                    const sampleRate = audioBuffer.sampleRate;
                    console.log(`Initializing MP3 encoder with detected sample rate: ${sampleRate}Hz`);
                    this.mp3Encoder = new Mp3Encoder(sampleRate, 1, 128);
                }
                
                // Encode audio buffer to MP3 immediately
                this.mp3Encoder.encodeAudioBuffer(audioBuffer);
                
                // No need to store WAV chunks in memory as they're now encoded to MP3
                // We simply discard the audio buffer after encoding
                
                // Add silence between segments (except after the last segment)
                if (i < segments.length - 1) {
                    // Convert milliseconds to seconds for the encoder
                    this.mp3Encoder.encodeSilence(this.silenceDuration / 1000);
                }
            }
            
            // Finalize MP3 encoding
            const mp3Blob = this.mp3Encoder.finish();
            
            // Convert blob to base64 data for storage
            const reader = new FileReader();
            const self = this;
            
            reader.onloadend = function handleReaderComplete() {
                // Store the base64 data
                self.audioData = reader.result;
                self.saveAudioData();
                
                // Create a blob URL for playback
                self.createBlobUrlFromAudioData();
                
                // Show audio player
                self.showAudioPlayer(self.audioUrl);
            };
            
            reader.readAsDataURL(mp3Blob);
            
            // Update state
            this.contentStateManager.updateState('hasAudio', true);
            
            // Show success message
            this.notifications.showSuccess('Podcast audio generated successfully!');
            
            // Update progress to complete
            this.progressManager.updateProgress('audio-progress', 100);
            
        } catch (error) {
            // If not cancelled, rethrow
            if (error.message !== 'Audio generation cancelled') {
                throw error;
            }
        }
    }
    
    /**
     * Generate audio for a script segment
     * @param {string} text - The text to convert to speech
     * @param {string} voice - The voice to use
     * @param {Object} apiData - API credentials and model data
     * @returns {AudioBuffer} - The audio buffer
     */
    async generateSegmentAudio(text, voice, apiData) {
        // Create a cache key based on text, voice and model
        const cacheKey = `${voice}_${text.substring(0, 100)}`;
        
        // Check if we have this segment cached
        if (this.segmentCache[cacheKey]) {
            return this.segmentCache[cacheKey];
        }
        
        try {
            // Use RetryManager to handle retries with exponential backoff
            const audioBuffer = await this.retryManager.execute(
                async () => {
                    // Determine if we're using the GPT-4o-mini-TTS model
                    const isGpt4oMiniTts = apiData.models.tts === 'gpt-4o-mini-tts';
                    
                    // Get character data for voice instructions and speech rate
                    let voiceInstructions = null;
                    let speechRate = null;
                    
                    // Load character data
                    const characters = this.storageManager.load('data', {});
                    let characterType = null;
                    
                    // Determine if this is host or guest based on voice
                    if (characters.host && characters.host.voice === voice) {
                        characterType = 'host';
                    } else if (characters.guest && characters.guest.voice === voice) {
                        characterType = 'guest';
                    }
                    
                    if (characterType) {
                        // Get voice instructions if available for GPT-4o-mini-TTS
                        if (isGpt4oMiniTts && characters[characterType].voiceInstructions) {
                            voiceInstructions = characters[characterType].voiceInstructions;
                        }
                        
                        // Get speech rate if available
                        if (characters[characterType].speechRate) {
                            speechRate = parseFloat(characters[characterType].speechRate);
                        }
                    }
                    
                    // Prepare API request body
                    const requestBody = {
                        model: apiData.models.tts,
                        voice: voice,
                        input: text,
                        response_format: 'wav', // Use uncompressed WAV instead of MP3
                        language: apiData.models.scriptLanguage || 'english'
                    };
                    
                    // Add voice instructions if available for GPT-4o-mini-TTS
                    if (isGpt4oMiniTts && voiceInstructions) {
                        requestBody.instructions = voiceInstructions;
                    }
                    
                    // Add speech rate if available (only for TTS-1 and TTS-1-HD models)
                    if (speechRate && (apiData.models.tts === 'tts-1' || apiData.models.tts === 'tts-1-hd')) {
                        requestBody.speed = speechRate;
                    }
                    
                    // Call OpenAI TTS API - get uncompressed wav format
                    // This is more efficient for processing than mp3
                    const response = await fetch('https://api.openai.com/v1/audio/speech', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiData.apiKey}`
                        },
                        body: JSON.stringify(requestBody)
                    });
                    
                    if (!response.ok) {
                        await this.handleApiError(response);
                    }
                    
                    // Get audio data as ArrayBuffer
                    const audioData = await response.arrayBuffer();
                    
                    // Decode audio data
                    return await this.audioContext.decodeAudioData(audioData);
                },
                this.isRetryableError.bind(this)
            );
            
            // Track TTS character usage
            const modelName = apiData.models.tts;
            const characterCount = text.length;
            this.apiManager.trackTTSUsage(modelName, characterCount);
            
            // Cache the segment (we still need to cache since we might handle cancellation)
            this.segmentCache[cacheKey] = audioBuffer;
            
            return audioBuffer;
        } catch (error) {
            // If the error is from cancellation, propagate it
            if (error.message === 'Operation cancelled during retry') {
                throw new Error('Audio generation cancelled');
            }
            
            console.error('TTS API error:', error);
            throw new Error(`Failed to generate audio: ${error.message}`);
        }
    }
    
    // Note: WAV encoding methods have been removed as we now use MP3 encoding directly
    
    /**
     * Show audio player with generated audio
     * @param {string} audioUrl - URL of audio to play
     */
    showAudioPlayer(audioUrl) {
        if (this.audioResult && this.audioSource && audioUrl) {
            this.audioSource.src = audioUrl;
            this.audioPlayer.load();
            this.audioResult.style.display = 'block';
            this.downloadButton.disabled = false;
        }
    }
    
    /**
     * Set generating state and update UI
     * @param {boolean} isGenerating - Whether generation is in progress
     */
    setGeneratingState(isGenerating) {
        this.isGenerating = isGenerating;
        
        if (isGenerating) {
            // Update UI for generating state
            this.generateButton.disabled = true;
            this.progressContainer.style.display = 'flex';
            this.progressManager.resetProgress('audio-progress');
            this.cancelGeneration = false;
        } else {
            // Reset UI
            this.generateButton.disabled = false;
            this.progressContainer.style.display = 'none';
        }
    }
    
    /**
     * Save audio data to storage
     */
    saveAudioData() {
        const audioData = {
            audioData: this.audioData, // Base64 encoded audio data
            silenceDuration: this.silenceDuration
        };
        
        // Save to localStorage - since we're now using MP3 format,
        // the size is much smaller and more suitable for localStorage
        this.storageManager.save('audioData', audioData);
    }
    
    /**
     * Create a blob URL from the stored base64 audio data
     */
    createBlobUrlFromAudioData() {
        if (!this.audioData) {
            return;
        }
        
        try {
            // Release previous blob URL if it exists
            if (this.audioUrl) {
                URL.revokeObjectURL(this.audioUrl);
            }
            
            // Convert base64 to blob
            const base64Data = this.audioData.split(',')[1];
            const binaryString = window.atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            const blob = new Blob([bytes.buffer], { type: 'audio/mp3' });
            this.audioUrl = URL.createObjectURL(blob);
        } catch (error) {
            console.error('Error creating blob URL from audio data:', error);
            this.notifications.showError('Error loading saved audio');
            
            // Clear invalid data
            this.audioData = null;
            this.audioUrl = null;
        }
    }
    
    /**
     * Handle API error response
     * @param {Response} response - Fetch API response
     */
    async handleApiError(response) {
        const errorText = await response.text();
        let errorMsg;
        
        try {
            const errorJson = JSON.parse(errorText);
            errorMsg = errorJson.error?.message || 'API Error';
        } catch (e) {
            errorMsg = `API Error (${response.status})`;
        }
        
        if (response.status === 401) {
            throw new Error('Invalid API key. Please check your OpenAI API key.');
        } else if (response.status === 429) {
            throw new Error('API rate limit exceeded. Please wait and try again later.');
        } else {
            throw new Error(`OpenAI API Error: ${errorMsg}`);
        }
    }
    
    /**
     * Check if an error is retryable (network or server error)
     * @param {Error} error - The error to check
     * @returns {boolean} - True if the error is retryable
     */
    isRetryableError(error) {
        // Don't retry authentication errors
        if (error.message && error.message.includes('API key')) {
            return false;
        }
        
        // Don't retry rate limit errors
        if (error.message && error.message.includes('rate limit')) {
            return false;
        }
        
        // Check if it's a server error (5xx)
        const serverErrorMatch = error.message && error.message.match(/\(5\d\d\)/);
        if (serverErrorMatch) {
            return true;
        }
        
        // Check for network connectivity issues
        const networkErrorPatterns = [
            'network error',
            'failed to fetch',
            'connection',
            'timeout',
            'socket',
            'internet'
        ];
        
        const errorString = String(error).toLowerCase();
        return networkErrorPatterns.some(pattern => errorString.includes(pattern));
    }
    
    /**
     * Handle retry notification
     * @param {Object} retryInfo - Information about the retry
     */
    handleRetryNotification(retryInfo) {
        const { attempt, delay, maxRetries, error } = retryInfo;
        
        // Show notification about retry
        const delaySeconds = Math.round(delay / 100) / 10;
        this.notifications.showInfo(
            `Connection issue detected. Retrying in ${delaySeconds}s... (Attempt ${attempt}/${maxRetries})`
        );
        
        console.log(`Retry attempt ${attempt}/${maxRetries} after ${delaySeconds}s delay:`, error);
        
        // Update progress bar to indicate retry
        const progressElement = document.querySelector('#audio-progress .progress-fill');
        if (progressElement) {
            progressElement.style.backgroundColor = '#ffaa33'; // Amber color for retry state
            
            // Reset to normal color after delay
            setTimeout(function() {
                progressElement.style.backgroundColor = '';
            }, delay);
        }
    }
    
    /**
     * Check if the operation should be cancelled
     * @returns {boolean} - True if the operation should be cancelled
     */
    checkCancelStatus() {
        return this.cancelGeneration;
    }
    
    /**
     * Update button state based on content availability
     */
    updateButtonState() {
        if (!this.generateButton) {
            return;
        }
        
        // Check if we have a script
        const contentState = this.contentStateManager.getState();
        const hasScript = contentState.hasScript;
        
        // Enable/disable generate button based on script availability
        this.generateButton.disabled = !hasScript || this.isGenerating;
        
        console.log(`Audio button state updated: ${hasScript ? 'enabled' : 'disabled'}`);
    }
}

export default AudioGenerator;
