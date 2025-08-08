// Podcastinator App - MP3 Encoder Utility

/**
 * Utility class for MP3 encoding using lamejs
 */
class Mp3Encoder {
    /**
     * Create a new MP3 encoder
     * @param {number} sampleRate - Sample rate of the audio (e.g., 44100)
     * @param {number} channels - Number of audio channels (1 for mono, 2 for stereo)
     * @param {number} bitRate - Encoding bit rate in kbps (e.g., 128)
     */
    constructor(sampleRate = 24000, channels = 1, bitRate = 128) {
        this.sampleRate = sampleRate;
        this.channels = channels;
        this.bitRate = bitRate;
        
        // Check if lamejs is available
        if (typeof lamejs === 'undefined') {
            throw new Error('lamejs library not loaded. Make sure lame.all.js is included.');
        }
        
        // Create the MP3 encoder
        this.encoder = new lamejs.Mp3Encoder(channels, sampleRate, bitRate);
        
        // Buffer for storing MP3 data
        this.mp3Data = [];
        
        // Sample block size (multiple of 576 for better encoder efficiency)
        this.sampleBlockSize = 1152;
    }
    
    /**
     * Convert AudioBuffer to Int16Array for MP3 encoding
     * @param {AudioBuffer} audioBuffer - Web Audio API AudioBuffer
     * @returns {Int16Array} - Audio data as Int16Array
     */
    audioBufferToInt16Array(audioBuffer) {
        const numChannels = audioBuffer.numberOfChannels;
        const length = audioBuffer.length;
        
        // Create output array (mono or stereo)
        let outputArray;
        
        if (this.channels === 1) {
            // Mono - mix all channels if needed
            outputArray = new Int16Array(length);
            
            // Get channel data
            const channelData = audioBuffer.getChannelData(0);
            
            // Convert float32 samples to int16
            for (let i = 0; i < length; i++) {
                // Clamp to [-1.0, 1.0]
                const sample = Math.max(-1.0, Math.min(1.0, channelData[i]));
                // Convert to int16 [-32768, 32767]
                outputArray[i] = Math.round(sample * 32767);
            }
            
        } else {
            // Stereo - return separate left and right channels
            const leftArray = new Int16Array(length);
            const rightArray = new Int16Array(length);
            
            // Get channel data
            const leftChannel = audioBuffer.getChannelData(0);
            const rightChannel = numChannels > 1 ? audioBuffer.getChannelData(1) : leftChannel;
            
            // Convert float32 samples to int16
            for (let i = 0; i < length; i++) {
                // Clamp to [-1.0, 1.0]
                const leftSample = Math.max(-1.0, Math.min(1.0, leftChannel[i]));
                const rightSample = Math.max(-1.0, Math.min(1.0, rightChannel[i]));
                
                // Convert to int16 [-32768, 32767]
                leftArray[i] = Math.round(leftSample * 32767);
                rightArray[i] = Math.round(rightSample * 32767);
            }
            
            return {left: leftArray, right: rightArray};
        }
        
        return outputArray;
    }
    
    /**
     * Encode audio buffer to MP3
     * @param {AudioBuffer} audioBuffer - Web Audio API AudioBuffer
     */
    encodeAudioBuffer(audioBuffer) {
        if (this.channels === 1) {
            // Mono encoding
            const samples = this.audioBufferToInt16Array(audioBuffer);
            this.encodeMonoBuffer(samples);
        } else {
            // Stereo encoding
            const {left, right} = this.audioBufferToInt16Array(audioBuffer);
            this.encodeStereoBuffer(left, right);
        }
    }
    
    /**
     * Encode mono buffer to MP3
     * @param {Int16Array} samples - Audio samples as Int16Array
     */
    encodeMonoBuffer(samples) {
        // Process samples in chunks
        for (let i = 0; i < samples.length; i += this.sampleBlockSize) {
            // Extract a chunk of samples
            const sampleChunk = samples.subarray(i, Math.min(i + this.sampleBlockSize, samples.length));
            
            // Encode the chunk
            const mp3buf = this.encoder.encodeBuffer(sampleChunk);
            
            // Add to MP3 data if we got something
            if (mp3buf && mp3buf.length > 0) {
                this.mp3Data.push(mp3buf);
            }
        }
    }
    
    /**
     * Encode stereo buffer to MP3
     * @param {Int16Array} left - Left channel samples as Int16Array
     * @param {Int16Array} right - Right channel samples as Int16Array
     */
    encodeStereoBuffer(left, right) {
        const sampleLength = Math.min(left.length, right.length);
        
        // Process samples in chunks
        for (let i = 0; i < sampleLength; i += this.sampleBlockSize) {
            // Extract chunks for left and right channels
            const leftChunk = left.subarray(i, Math.min(i + this.sampleBlockSize, left.length));
            const rightChunk = right.subarray(i, Math.min(i + this.sampleBlockSize, right.length));
            
            // Encode the chunk
            const mp3buf = this.encoder.encodeBuffer(leftChunk, rightChunk);
            
            // Add to MP3 data if we got something
            if (mp3buf && mp3buf.length > 0) {
                this.mp3Data.push(mp3buf);
            }
        }
    }
    
    /**
     * Generate silence and encode it to MP3
     * @param {number} durationSec - Duration of silence in seconds
     */
    encodeSilence(durationSec) {
        // Calculate number of samples for silence
        const numSamples = Math.ceil(durationSec * this.sampleRate);
        
        if (this.channels === 1) {
            // Mono silence
            const silenceSamples = new Int16Array(numSamples);
            // silenceSamples is initialized with zeros, so no need to fill
            this.encodeMonoBuffer(silenceSamples);
        } else {
            // Stereo silence
            const leftSilence = new Int16Array(numSamples);
            const rightSilence = new Int16Array(numSamples);
            this.encodeStereoBuffer(leftSilence, rightSilence);
        }
    }
    
    /**
     * Finish MP3 encoding and get the resulting MP3 data
     * @returns {Blob} - MP3 data as a Blob
     */
    finish() {
        // Flush the encoder to get the last frames
        const mp3buf = this.encoder.flush();
        
        if (mp3buf && mp3buf.length > 0) {
            this.mp3Data.push(mp3buf);
        }
        
        // Create a Blob from all MP3 data chunks
        return new Blob(this.mp3Data, {type: 'audio/mp3'});
    }
    
    /**
     * Reset encoder state, clearing any existing MP3 data
     */
    reset() {
        this.mp3Data = [];
    }
}

export default Mp3Encoder;
