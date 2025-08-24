# Podcastinator Service Interface

This document explains how to use the UI-agnostic interface class `PodcastinatorService` to drive the full Podcastinator workflow programmatically.

File: `js/core/PodcastinatorService.js`

- Reuses existing browser modules under the hood (`OpenAIManager`, `OutlineGenerator`, `ScriptGenerator`, `AudioGenerator`).
- Avoids UI initialization; works with local storage persistence via `StorageManager` by default.
- Node/CLI support is available using headless adapters (see `cli/` and `cli/readme.md`).

## Installation & Setup

- Ensure project runs locally (browser) with:

```bash
npm start
# open http://localhost:8080
```

- The service can be imported from other modules or used directly in browser console.

```js
import PodcastinatorService from '../js/core/PodcastinatorService.js';
```

## Concepts

- **Storage**: Uses `localStorage` via `StorageManager`. All data is persisted with keys like `Podcastinator-data`, `Podcastinator-outlineData`, etc.
- **State**: Mirrors `ContentStateManager` flags to indicate workflow readiness (`hasApiKey`, `hasDocument`, `hasOutline`, `hasScript`, `hasAudio`).
- **Environment**:
  - Browser: Full outline and script generation; audio generation uses Web Audio + in-browser MP3 encoding (`lamejs`).
  - Node/CLI: Uses headless adapters and server-side audio generation (OpenAI TTS mp3 per segment, concatenated, returned as a Buffer and typically written to disk by the CLI).

## API Surface

### Configuration

- `async setApiKey(apiKey: string): Promise<void>`
- `getApiKey(): string`
- `async setModels(models: Partial<{ outline, outlineVerify, script, scriptVerify, backstory, tts }>): Promise<void>`
- `getModels(): { outline?, outlineVerify?, script?, scriptVerify?, backstory?, tts? }`
- `getConfig(): { apiKey: string, models: object, podcast: { duration: number, focus: string, language: string, silenceMs: number } }`
- `async loadConfig(config: { apiKey?: string, models?: object, podcast?: { duration?: number, focus?: string, language?: string, silenceMs?: number } }): Promise<void>`

### Inputs

- `async loadDocumentFromText(text: string): Promise<void>`
- `getDocument(): { content: string, name?: string, type?: string, size?: number, timestamp?: string }`
- `async setCharacters({ host, guest }): Promise<void>`
- `getCharacters(): { host: object, guest: object }`

### Generation

- `async generateOutline({ duration?, focus? } = {}): Promise<string>`
  - Returns final outline text and persists to `outlineData.outline`.
- `async generateScript({ language? } = {}): Promise<string>`
  - Returns final script text and persists to `scriptData.script`.
- `async generateAudio({ silenceMs?, outputPath? } = {}): Promise<{ hasAudio: boolean, mime: string, silenceMs: number, buffer?: Buffer, path?: string }>`
  - Browser: Generates MP3 in IndexedDB and exposes a blob URL internally; this method returns metadata via `getAudioMeta()`.
  - Node: Generates mp3 per segment via OpenAI and concatenates buffers; returns a single `buffer` (CLI writes it to `-o` path if provided).

### Generated Content Getters

- `getOutline(): string`
- `getScript(): string`
- `getAudioMeta(): { hasAudio: boolean, mime: 'audio/mpeg', silenceMs: number }`
- `getState(): { hasApiKey, hasDocument, hasHostCharacter, hasGuestCharacter, hasOutline, hasScript, hasAudio }`

## Usage Examples

### Browser (Console or App Code)

```js
import PodcastinatorService from '../js/core/PodcastinatorService.js';

const svc = new PodcastinatorService();

await svc.setApiKey('sk-...');
await svc.setModels({ outline: 'gpt-4o-mini', script: 'gpt-4o-mini', tts: 'tts-1' });

await svc.loadDocumentFromText('Your source text or markdown...');
await svc.setCharacters({
  host: { name: 'Alice', voice: 'alloy' },
  guest: { name: 'Bob', voice: 'verse' }
});

const outline = await svc.generateOutline({ duration: 30, focus: '' });
console.log('Outline:\n', outline);

const script = await svc.generateScript({ language: 'english' });
console.log('Script length:', script.length);

const audio = await svc.generateAudio({ silenceMs: 400 });
console.log('Audio meta:', audio, 'State:', svc.getState());
```

### Loading/Saving Config

```js
await svc.loadConfig({
  apiKey: 'sk-...',
  models: {
    outline: 'gpt-4o-mini',
    outlineVerify: 'gpt-4o-mini',
    script: 'gpt-4o-mini',
    scriptVerify: 'gpt-4o-mini',
    backstory: 'gpt-4o-mini',
    tts: 'tts-1'
  },
  podcast: {
    duration: 30,
    focus: '',
    language: 'english',
    silenceMs: 400
  }
});

console.log(svc.getConfig());
```

## Data Persistence Keys

- `Podcastinator-data`: `{ apiKey, models, document, host, guest }`
- `Podcastinator-outlineData`: `{ outline, podcastDuration, podcastFocus }`
- `Podcastinator-scriptData`: `{ script, language }`
- `Podcastinator-audioData`: `{ silenceDuration }`
- `Podcastinator-contentState`: boolean flags stored by `ContentStateManager`

## Requirements & Preconditions

- `setApiKey()` and `setCharacters()` must be called before generation.
- `loadDocumentFromText()` must be called before outline generation.
- `generateOutline()` must be completed before `generateScript()`.
- `generateScript()` must be completed before `generateAudio()`.

## Environment Considerations

- Browser only:
  - `generateAudio()` relies on Web Audio API and `lamejs` (via `js/lib/lame.min.js` in `index.html`).
  - Audio is saved to IndexedDB and referenced by an object URL exposed in the UI.
- Node/CLI:
  - Uses headless storage and content state; no DOM/Web Audio.
  - Requests `mp3` from OpenAI per segment and concatenates the results.
  - Current limitation: configured `silenceMs` is not inserted between mp3 segments in Node path. If needed, we can add explicit silence insertion (see CLI readme for roadmap).

## Error Messages & Troubleshooting

- "API key not set" → call `setApiKey()` or `loadConfig()`.
- "Document not loaded" → call `loadDocumentFromText()`.
- "Characters not set" → call `setCharacters()` with `host` and `guest`.
- "Outline not available" → run `generateOutline()` first.
- "Audio not saved" → ensure you pass an output path in the CLI (`-o podcast.mp3`) or write the returned `buffer` yourself.

## Extensibility Notes

- The constructor accepts optional adapters: `storage`, `contentState`, `notifications`, `progress`.
- Node path is implemented; CLI injects headless adapters to avoid DOM usage.

## Related Files

- `js/core/PodcastinatorService.js`
- `js/api/openaiManager.js`
- `js/content/outlineGenerator.js`
- `js/content/scriptGenerator.js`
- `js/content/audioGenerator.js`
- `js/content/contentStateManager.js`
- `js/ui/sectionManager.js`
- `cli/index.js` (Commander-based CLI)
- `cli/adapters/*.js` (headless adapters)

---

For CLI usage and options, see `cli/readme.md`.
