// Podcastinator Core Service - UI-agnostic interface to full app functionality
// NOTE: Step 1 focuses on exposing a clean programmatic surface and surfacing UI/Web API couplings.

import StorageManager from '../utils/storage.js';
import OpenAIManager from '../api/openaiManager.js';
import OutlineGenerator from '../content/outlineGenerator.js';
import ScriptGenerator from '../content/scriptGenerator.js';
import AudioGenerator from '../content/audioGenerator.js';
import ContentStateManager from '../content/contentStateManager.js';
import SectionManager from '../ui/sectionManager.js';

/**
 * PodcastinatorService provides a UI-agnostic facade over the app's functionality.
 * In browser, it can reuse existing managers through storage. In Node (step 2),
 * we will inject headless adapters for storage, notifications and progress.
 */
class PodcastinatorService {
    constructor(options = {}) {
        // Adapters (can be swapped in step 2 for Node CLI)
        this.storage = options.storage || new StorageManager();

        // Minimal section manager required by ContentStateManager
        // In headless scenarios this will not manipulate DOM; we keep it only to satisfy constructor.
        this.sectionManager = options.sectionManager || new SectionManager(this.storage);
        this.contentState = options.contentState || new ContentStateManager(this.storage, this.sectionManager);

        // Do NOT call .init() on UI-bound classes here; we keep headless by default in step 1
        this.api = new OpenAIManager(this.storage, this.contentState);

        // Generators (not initialized with UI)
        this.outline = new OutlineGenerator(this.storage, this.contentState, this.api);
        this.script = new ScriptGenerator(this.storage, this.contentState, this.api);
        this.audio = new AudioGenerator(this.storage, this.contentState, this.api);

        // Optional headless adapters for notifications/progress
        if (options.notifications) {
            this.api.notifications = options.notifications;
            this.outline.notifications = options.notifications;
            this.script.notifications = options.notifications;
            this.audio.notifications = options.notifications;
        }
        if (options.progress) {
            this.outline.progressManager = options.progress;
            this.script.progressManager = options.progress;
            this.audio.progressManager = options.progress;
        }
    }

    // ---------- Configuration ----------

    async setApiKey(apiKey) {
        const existing = this.storage.load('data', {}) || {};
        existing.apiKey = apiKey || '';
        this.storage.save('data', existing);
        this._updateStateFlag('hasApiKey', !!apiKey);
    }

    getApiKey() {
        const data = this.storage.load('data', {}) || {};
        return data.apiKey || '';
    }

    async setModels(models = {}) {
        const existing = this.storage.load('data', {}) || {};
        existing.models = {
            ...(existing.models || {}),
            ...models
        };
        this.storage.save('data', existing);
    }

    getModels() {
        const data = this.storage.load('data', {}) || {};
        return data.models || {};
    }

    getConfig() {
        const data = this.storage.load('data', {}) || {};
        const outlineData = this.storage.load('outlineData', {}) || {};
        const scriptData = this.storage.load('scriptData', {}) || {};
        const audioData = this.storage.load('audioData', {}) || {};
        return {
            apiKey: data.apiKey || '',
            models: data.models || {},
            podcast: {
                duration: outlineData.podcastDuration || 30,
                focus: outlineData.podcastFocus || '',
                language: scriptData.language || 'english',
                silenceMs: audioData.silenceDuration || 500
            }
        };
    }

    async loadConfig(config = {}) {
        if (!config || typeof config !== 'object') {
            return;
        }
        if (config.apiKey !== undefined || config.models !== undefined) {
            const existing = this.storage.load('data', {}) || {};
            if (config.apiKey !== undefined) {
                existing.apiKey = config.apiKey || '';
            }
            if (config.models) {
                existing.models = { ...(existing.models || {}), ...config.models };
            }
            this.storage.save('data', existing);
            this._updateStateFlag('hasApiKey', !!existing.apiKey);

            // Keep OpenAIManager in-memory data in sync for headless/CLI path
            // so getApiData() returns the latest values without relying on DOM init.
            if (this.api && this.api.data) {
                this.api.data.apiKey = existing.apiKey || '';
                this.api.data.models = existing.models || {};
            }
        }
        if (config.podcast) {
            const outlineData = this.storage.load('outlineData', {}) || {};
            const scriptData = this.storage.load('scriptData', {}) || {};
            const audioData = this.storage.load('audioData', {}) || {};
            if (config.podcast.duration !== undefined) {
                outlineData.podcastDuration = config.podcast.duration;
            }
            if (config.podcast.focus !== undefined) {
                outlineData.podcastFocus = config.podcast.focus;
            }
            if (config.podcast.language !== undefined) {
                scriptData.language = config.podcast.language;
            }
            if (config.podcast.silenceMs !== undefined) {
                audioData.silenceDuration = config.podcast.silenceMs;
            }
            this.storage.save('outlineData', outlineData);
            this.storage.save('scriptData', scriptData);
            this.storage.save('audioData', audioData);

            // Keep in-memory generators in sync for headless/CLI path
            if (this.outline) {
                if (outlineData.podcastDuration !== undefined) {
                    this.outline.podcastDuration = outlineData.podcastDuration;
                }
                if (outlineData.podcastFocus !== undefined) {
                    this.outline.podcastFocus = outlineData.podcastFocus;
                }
            }
        }
    }

    // ---------- Inputs ----------

    async loadDocumentFromText(text) {
        const now = new Date().toISOString();
        const data = this.storage.load('data', {}) || {};
        data.document = {
            name: 'document.txt',
            type: 'text/plain',
            size: (text || '').length,
            content: text || '',
            timestamp: now
        };
        this.storage.save('data', data);
        this._updateStateFlag('hasDocument', !!(text && text.trim()));
    }

    getDocument() {
        const data = this.storage.load('data', {}) || {};
        return data.document ? { ...data.document } : { content: '' };
    }

    async setCharacters({ host = {}, guest = {} } = {}) {
        const data = this.storage.load('data', {}) || {};
        if (host && Object.keys(host).length) {
            data.host = host;
            this._updateStateFlag('hasHostCharacter', true);
        }
        if (guest && Object.keys(guest).length) {
            data.guest = guest;
            this._updateStateFlag('hasGuestCharacter', true);
        }
        this.storage.save('data', data);
    }

    getCharacters() {
        const data = this.storage.load('data', {}) || {};
        return {
            host: data.host || {},
            guest: data.guest || {}
        };
    }

    // ---------- Generation ----------

    async generateOutline({ duration, focus } = {}) {
        // Persist desired settings first
        const outlineData = this.storage.load('outlineData', {}) || {};
        if (duration !== undefined) {
            outlineData.podcastDuration = duration;
        }
        if (focus !== undefined) {
            outlineData.podcastFocus = focus;
        }
        this.storage.save('outlineData', outlineData);

        // Sync in-memory generator settings for headless path
        if (this.outline) {
            if (outlineData.podcastDuration !== undefined) {
                this.outline.podcastDuration = outlineData.podcastDuration;
            }
            if (outlineData.podcastFocus !== undefined) {
                this.outline.podcastFocus = outlineData.podcastFocus;
            }
        }

        // Surface coupling: OutlineGenerator expects DOM for notifications/progress; we are not calling init().
        // However, its core API (generateOutline) can run if storage and api data are present.
        const data = this.storage.load('data', {}) || {};
        if (!data.apiKey) {
            throw new Error('API key not set. Call setApiKey() first.');
        }
        if (!data.document || !data.document.content) {
            throw new Error('Document not loaded. Call loadDocumentFromText() first.');
        }
        if (!data.host || !data.guest) {
            throw new Error('Characters not set. Call setCharacters() first.');
        }

        // Delegate to OutlineGenerator core method
        const apiData = this.api.getApiData();
        await this.outline.generateOutline({ content: data.document.content }, data, apiData);

        const saved = this.storage.load('outlineData', {}) || {};
        this._updateStateFlag('hasOutline', !!(saved.outline && saved.outline.trim()));
        return saved.outline || '';
    }

    async generateScript({ language } = {}) {
        // Persist language preference
        const scriptData = this.storage.load('scriptData', {}) || {};
        if (language) {
            scriptData.language = language;
            this.storage.save('scriptData', scriptData);
        }

        const data = this.storage.load('data', {}) || {};
        const outlineData = this.storage.load('outlineData', {}) || {};
        if (!data.apiKey) {
            throw new Error('API key not set. Call setApiKey() first.');
        }
        if (!outlineData.outline) {
            throw new Error('Outline not available. Call generateOutline() first.');
        }
        if (!data.host || !data.guest) {
            throw new Error('Characters not set. Call setCharacters() first.');
        }

        const sections = this.script.parseOutlineSections(outlineData.outline);
        const apiData = this.api.getApiData();
        await this.script.generateFullScript(sections, { host: data.host, guest: data.guest }, apiData);

        const saved = this.storage.load('scriptData', {}) || {};
        this._updateStateFlag('hasScript', !!(saved.script && saved.script.trim()));
        return saved.script || '';
    }

    async generateAudio({ silenceMs, outputPath } = {}) {
        // Persist silence preference
        const audioData = this.storage.load('audioData', {}) || {};
        if (silenceMs !== undefined) {
            audioData.silenceDuration = silenceMs;
            this.storage.save('audioData', audioData);
        }

        const data = this.storage.load('data', {}) || {};
        const scriptData = this.storage.load('scriptData', {}) || {};
        if (!data.apiKey) {
            throw new Error('API key not set. Call setApiKey() first.');
        }
        if (!scriptData.script) {
            throw new Error('Script not available. Call generateScript() first.');
        }
        if (!data.host || !data.guest) {
            throw new Error('Characters not set. Call setCharacters() first.');
        }

        const segments = this.audio.parseScriptSegments(scriptData.script);

        const apiData = this.api.getApiData();

        // Node path: no window global
        if (typeof window === 'undefined') {
            // Generate MP3 per segment and concatenate buffers (experimental, widely supported by players)
            const buffers = [];
            for (let i = 0; i < segments.length; i++) {
                const segment = segments[i];
                const isHost = segment.speaker === 'HOST';
                const voice = isHost ? (data.host.voice || '') : (data.guest.voice || '');
                const language = (this.storage.load('scriptData', {}) || {}).language || 'english';
                const body = {
                    model: apiData.models.tts,
                    voice: voice,
                    input: segment.text,
                    response_format: 'mp3',
                    language: language
                };
                const res = await fetch('https://api.openai.com/v1/audio/speech', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiData.apiKey}`
                    },
                    body: JSON.stringify(body)
                });
                if (!res.ok) {
                    const errTxt = await res.text();
                    throw new Error(`TTS failed (${res.status}): ${errTxt}`);
                }
                const ab = await res.arrayBuffer();
                buffers.push(Buffer.from(ab));
            }

            // Naive concat of MP3 frames
            const combined = Buffer.concat(buffers);

            // If outputPath provided, write file (caller responsibility in CLI); otherwise return buffer
            this._updateStateFlag('hasAudio', combined.length > 0);
            return { hasAudio: combined.length > 0, mime: 'audio/mpeg', silenceMs: silenceMs || (this.storage.load('audioData', {}) || {}).silenceDuration || 500, buffer: combined, path: outputPath || '' };
        }

        // Browser path: use existing AudioGenerator pipeline (requires Web Audio APIs in browser).
        await this.audio.initAudioContext();
        await this.audio.generatePodcastAudio(segments, { host: data.host, guest: data.guest }, apiData);
        const result = this.getAudioMeta();
        this._updateStateFlag('hasAudio', !!result.hasAudio);
        return result;
    }

    // ---------- Generated Content Getters ----------

    getOutline() {
        const outlineData = this.storage.load('outlineData', {}) || {};
        return outlineData.outline || '';
    }

    getScript() {
        const scriptData = this.storage.load('scriptData', {}) || {};
        return scriptData.script || '';
    }

    getAudioMeta() {
        // In browser, AudioGenerator stores Blob in IndexedDB and generates object URL tracked internally.
        // We can’t access the Blob directly here without refactoring; expose best-effort flags.
        const state = this.contentState.getState();
        const audioPrefs = this.storage.load('audioData', {}) || {};
        return {
            hasAudio: !!state.hasAudio,
            mime: 'audio/mpeg',
            silenceMs: audioPrefs.silenceDuration || 500
        };
    }

    // ---------- State ----------

    getState() {
        return this.contentState.getState();
    }

    // ---------- Helpers ----------

    _updateStateFlag(key, value) {
        // ContentStateManager persists state and emits events in browser; safe to call without UI listeners
        this.contentState.updateState(key, !!value);
    }
}

export default PodcastinatorService;
