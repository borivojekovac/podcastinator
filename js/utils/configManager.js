// Podcastinator App - Configuration Manager
import AudioBlobStore from '../utils/idbAudio.js';

class ConfigManager {
    constructor(storageManager, contentStateManager, apiManager, fileUploader, characterManager, outlineGenerator, scriptGenerator, audioGenerator) {
        this.storageManager = storageManager;
        this.contentStateManager = contentStateManager;
        this.apiManager = apiManager;
        this.fileUploader = fileUploader;
        this.characterManager = characterManager;
        this.outlineGenerator = outlineGenerator;
        this.scriptGenerator = scriptGenerator;
        this.audioGenerator = audioGenerator;
        this.audioStore = new AudioBlobStore();
    }

    async exportConfig(sections) {
        const data = this.storageManager.load('data', {}) || {};
        const outlineData = this.storageManager.load('outlineData', {}) || {};
        const scriptData = this.storageManager.load('scriptData', {}) || {};
        const audioData = this.storageManager.load('audioData', {}) || {};

        // Try to get audio blob from IndexedDB and convert to base64
        let mp3Base64 = null;
        try {
            if (!sections || sections.audio) {
                const record = await this.audioStore.load('latest');
                if (record && record.blob) {
                    mp3Base64 = await this.blobToBase64(record.blob);
                }
            }
        } catch (e) {
            console.warn('Config export: failed to read audio blob from IndexedDB:', e);
        }

        const payload = {
            version: 1,
            savedAt: new Date().toISOString(),
            aiParameters: (!sections || sections.ai) ? {
                models: {
                    backstory: data.models?.backstory || '',
                    outline: data.models?.outline || '',
                    outlineVerify: data.models?.outlineVerify || '',
                    script: data.models?.script || '',
                    scriptVerify: data.models?.scriptVerify || '',
                    tts: data.models?.tts || ''
                }
            } : undefined,
            contents: (!sections || sections.contents) ? {
                document: data.document || null,
                podcastFocus: outlineData.podcastFocus || ''
            } : undefined,
            hostCharacter: (!sections || sections.host) && data.host ? {
                name: data.host.name || '',
                personality: data.host.personality || '',
                voice: data.host.voice || '',
                speechRate: data.host.speechRate || 1.0,
                voiceInstructions: data.host.voiceInstructions || '',
                backstory: data.host.backstory || ''
            } : undefined,
            guestCharacter: (!sections || sections.guest) && data.guest ? {
                name: data.guest.name || '',
                personality: data.guest.personality || '',
                voice: data.guest.voice || '',
                speechRate: data.guest.speechRate || 1.0,
                voiceInstructions: data.guest.voiceInstructions || '',
                backstory: data.guest.backstory || ''
            } : undefined,
            outline: (!sections || sections.outline) ? {
                targetDurationMinutes: outlineData.podcastDuration || 30,
                outlineText: outlineData.outline || ''
            } : undefined,
            script: (!sections || sections.script) ? {
                language: scriptData.language || 'english',
                scriptText: scriptData.script || ''
            } : undefined,
            audio: (!sections || sections.audio) ? {
                silenceBetweenSpeakersMs: audioData.silenceDuration || 400,
                mp3Base64: mp3Base64
            } : undefined
        };

        const json = JSON.stringify(payload, null, 2);
        const blob = new Blob([json], { type: 'application/json' });

        // Build filename based on content document name
        let filename = 'podcastinator-config.json';
        try {
            const docName = data?.document?.name;
            if (docName) {
                const base = docName.replace(/\.[^/.]+$/, '');
                filename = `podcastinator-config-${base}.json`;
            }
        } catch (e) {
            // fallback keeps default
        }

        this.triggerDownload(blob, filename);
    }

    async importConfigFile(file, sections) {
        if (!file) {
            return;
        }
        const text = await file.text();
        const json = JSON.parse(text);
        await this.applyConfig(json, sections);
    }

    async applyConfig(config, sections) {
        // Basic validation
        if (!config || typeof config !== 'object' || config.version !== 1) {
            throw new Error('Invalid configuration file.');
        }

        // 1) Models (exclude apiKey)
        if (!sections || sections.ai) {
            const data = this.storageManager.load('data', {}) || {};
            data.models = { ...(data.models || {}), ...(config.aiParameters?.models || {}) };
            this.storageManager.save('data', data);

            // Reflect models into UI selects and persist via OpenAIManager
            this.setSelectIfExists('backstory-model', data.models.backstory);
            this.setSelectIfExists('outline-model', data.models.outline);
            this.setSelectIfExists('outline-verify-model', data.models.outlineVerify);
            this.setSelectIfExists('script-model', data.models.script);
            this.setSelectIfExists('script-verify-model', data.models.scriptVerify);
            this.setSelectIfExists('tts-model', data.models.tts);
            this.setSelectIfExists('script-language', data.models.scriptLanguage || 'english');
            if (this.apiManager && typeof this.apiManager.saveAllModelSelections === 'function') {
                this.apiManager.saveAllModelSelections();
            }
        }

        // 2) Contents (document + podcastFocus)
        if ((!sections || sections.contents) && config.contents && config.contents.document) {
            const doc = config.contents.document;
            // Save to storage and FileUploader state
            const existing = this.storageManager.load('data', {}) || {};
            existing.document = doc;
            this.storageManager.save('data', existing);
            if (this.fileUploader) {
                this.fileUploader.data.document = doc;
                this.fileUploader.updateDocumentPreview();
            }
        }
        if ((!sections || sections.contents) && typeof config.contents?.podcastFocus === 'string') {
            const outlineData = this.storageManager.load('outlineData', {}) || {};
            outlineData.podcastFocus = config.contents.podcastFocus;
            this.storageManager.save('outlineData', outlineData);
            const focusEl = document.getElementById('podcast-focus');
            if (focusEl) {
                focusEl.value = config.contents.podcastFocus || '';
            }
        }

        // 3) Characters
        const existing = this.storageManager.load('data', {}) || {};
        if ((!sections || sections.host) && config.hostCharacter) {
            existing.host = {
                name: config.hostCharacter.name || '',
                personality: config.hostCharacter.personality || '',
                voice: config.hostCharacter.voice || '',
                backstory: config.hostCharacter.backstory || '',
                voiceInstructions: config.hostCharacter.voiceInstructions || '',
                voiceInstructionsPreset: existing.host?.voiceInstructionsPreset || '',
                speechRate: config.hostCharacter.speechRate || 1.0
            };
        }
        if ((!sections || sections.guest) && config.guestCharacter) {
            existing.guest = {
                name: config.guestCharacter.name || '',
                personality: config.guestCharacter.personality || '',
                voice: config.guestCharacter.voice || '',
                backstory: config.guestCharacter.backstory || '',
                voiceInstructions: config.guestCharacter.voiceInstructions || '',
                voiceInstructionsPreset: existing.guest?.voiceInstructionsPreset || '',
                speechRate: config.guestCharacter.speechRate || 1.0
            };
        }
        this.storageManager.save('data', existing);
        if (this.characterManager) {
            this.characterManager.data.host = existing.host || {};
            this.characterManager.data.guest = existing.guest || {};
            this.characterManager.populateCharacterData();
        }

        // 4) Outline
        if (!sections || sections.outline || sections.contents) {
            const outlineData = this.storageManager.load('outlineData', {}) || {};
            if (!sections || sections.outline) {
                outlineData.outline = config.outline?.outlineText || outlineData.outline || '';
                outlineData.podcastDuration = config.outline?.targetDurationMinutes || outlineData.podcastDuration || 30;
            }
            if ((!sections || sections.contents) && typeof config.contents?.podcastFocus === 'string') {
                outlineData.podcastFocus = config.contents.podcastFocus;
            }
            this.storageManager.save('outlineData', outlineData);
            const outlineEl = document.getElementById('outline-text');
            const durationEl = document.getElementById('podcast-duration');
            if (outlineEl && (!sections || sections.outline)) {
                outlineEl.value = outlineData.outline || '';
            }
            if (durationEl && outlineData.podcastDuration && (!sections || sections.outline)) {
                durationEl.value = outlineData.podcastDuration;
            }
            if (this.outlineGenerator && typeof this.outlineGenerator.handleOutlineChange === 'function' && (!sections || sections.outline)) {
                this.outlineGenerator.outlineData = outlineData.outline || '';
                this.outlineGenerator.handleOutlineChange();
            }
        }

        // 5) Script
        if (!sections || sections.script) {
            const scriptStore = this.storageManager.load('scriptData', {}) || {};
            scriptStore.script = config.script?.scriptText || '';
            if (typeof config.script?.language === 'string') {
                scriptStore.language = config.script.language || 'english';
            }
            this.storageManager.save('scriptData', scriptStore);
            const scriptEl = document.getElementById('script-text');
            if (scriptEl) {
                scriptEl.value = scriptStore.script;
            }
            // Update language select if present
            const langEl = document.getElementById('script-language');
            if (langEl && scriptStore.language) {
                langEl.value = scriptStore.language;
                const evt = new Event('change', { bubbles: true });
                langEl.dispatchEvent(evt);
            }
            if (this.scriptGenerator && typeof this.scriptGenerator.handleScriptChange === 'function') {
                this.scriptGenerator.scriptData = scriptStore.script;
                this.scriptGenerator.handleScriptChange();
            }
        }

        // 6) Audio prefs and audio blob (mp3)
        if (!sections || sections.audio) {
            const audioPrefs = {
                silenceDuration: (config.audio && typeof config.audio.silenceBetweenSpeakersMs === 'number') ? config.audio.silenceBetweenSpeakersMs : 400
            };
            this.storageManager.save('audioData', audioPrefs);
            const silenceEl = document.getElementById('silence-duration');
            if (silenceEl) {
                silenceEl.value = audioPrefs.silenceDuration;
            }

            if (config.audio && config.audio.mp3Base64) {
                try {
                    const mp3Blob = this.base64ToBlob(config.audio.mp3Base64, 'audio/mpeg');
                    await this.audioStore.save('latest', mp3Blob, { type: 'audio/mpeg' });
                    if (this.audioGenerator) {
                        if (this.audioGenerator.audioUrl) {
                            URL.revokeObjectURL(this.audioGenerator.audioUrl);
                        }
                        this.audioGenerator.audioUrl = URL.createObjectURL(mp3Blob);
                        this.audioGenerator.showAudioPlayer(this.audioGenerator.audioUrl);
                        this.contentStateManager.updateState('hasAudio', true);
                    }
                } catch (e) {
                    console.warn('Failed to restore MP3 from config:', e);
                }
            }
        }

        // 7) Update section workflow flags
        this.updateContentStateFlags();
        this.contentStateManager.updateSections();
    }

    updateContentStateFlags() {
        const data = this.storageManager.load('data', {}) || {};
        const outlineData = this.storageManager.load('outlineData', {}) || {};
        const scriptData = this.storageManager.load('scriptData', {}) || {};

        this.contentStateManager.updateState('hasApiKey', !!(data.apiKey && data.apiKey.trim()));
        this.contentStateManager.updateState('hasDocument', !!data.document);
        this.contentStateManager.updateState('hasHostCharacter', !!(data.host && data.host.name && data.host.personality && data.host.voice));
        this.contentStateManager.updateState('hasGuestCharacter', !!(data.guest && data.guest.name && data.guest.personality && data.guest.voice));
        const hasChars = this.contentStateManager.getState('hasHostCharacter') && this.contentStateManager.getState('hasGuestCharacter');
        this.contentStateManager.updateState('hasCharacters', !!hasChars);
        this.contentStateManager.updateState('hasOutline', !!(outlineData.outline && outlineData.outline.trim()));
        this.contentStateManager.updateState('hasScript', !!(scriptData.script && scriptData.script.trim()));
    }

    triggerDownload(blob, filename) {
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    async blobToBase64(blob) {
        return new Promise(function resolveBlob(resolve, reject) {
            const reader = new FileReader();
            reader.onload = function handleLoad() {
                const result = reader.result || '';
                const base64 = String(result).split(',')[1] || '';
                resolve(base64);
            };
            reader.onerror = function handleErr() {
                reject(reader.error);
            };
            reader.readAsDataURL(blob);
        });
    }

    base64ToBlob(base64, mimeType) {
        const byteChars = atob(base64);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
            byteNumbers[i] = byteChars.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType || 'application/octet-stream' });
    }

    setSelectIfExists(elementId, value) {
        const el = document.getElementById(elementId);
        if (el && value) {
            const exists = Array.from(el.options).some(function(option) {
                return option.value === value;
            });
            if (exists) {
                el.value = value;
                const changeEvent = new Event('change', { bubbles: true });
                el.dispatchEvent(changeEvent);
            }
        }
    }
}

export default ConfigManager;
