# Podcastinator CLI

Command-line interface for Podcastinator using the UI-agnostic `PodcastinatorService`. Reuses existing generation code; no duplicated logic.

- Entry point: `cli/index.js`
- Adapters: `cli/adapters/*.js`
- Requires Node 18+ (global `fetch` and WHATWG timers). For older Node, pass `--experimental-fetch` via debugger config.

## Install

From `podcastor/cli/`:

```bash
npm install
```

## Configuration file and flags

You can pass everything via flags, use a JSON config file, or combine both.

- Flags always override values loaded from `--config`.
- You may omit `-c/--config` entirely if you provide all inputs through flags.

Example: `examples/cli-config.json`

```json
{
  "apiKey": "sk-...",
  "models": {
    "outline": "gpt-4o-mini",
    "outlineVerify": "gpt-4o-mini",
    "script": "gpt-4o-mini",
    "scriptVerify": "gpt-4o-mini",
    "backstory": "gpt-4o-mini",
    "tts": "tts-1"
  },
  "podcast": {
    "duration": 30,
    "focus": "",
    "language": "english",
    "silenceMs": 400
  },
  "document": {
    "path": "examples/your-source.txt"
  },
  "characters": {
    "host": { "name": "Host", "voice": "alloy" },
    "guest": { "name": "Guest", "voice": "verse" }
  }
}
```

Notes:
- You can embed the document as `document.content` instead of `document.path`.
- Voices must be valid for the TTS model in use.

### All flags (available on every command)

- Config file
  - `-c, --config <file>`
- API key
  - `--api-key <key>`
- Models
  - `--model-outline <name>`
  - `--model-outline-verify <name>`
  - `--model-script <name>`
  - `--model-script-verify <name>`
  - `--model-backstory <name>`
  - `--model-tts <name>`
- Podcast preferences
  - `--duration <minutes>`
  - `--focus <text>`
  - `--language <lang>`
  - `--silence-ms <ms>`
- Document input
  - `--doc-path <file>` Read text from file
  - `--doc-content <string>` Inline content
  - `--doc-stdin` Read content from STDIN
- Characters
  - `--host-name <s>`
  - `--host-voice <s>`
  - `--host-speech-rate <n>`
  - `--host-voice-instructions <s>`
  - `--guest-name <s>`
  - `--guest-voice <s>`
  - `--guest-speech-rate <n>`
  - `--guest-voice-instructions <s>`

## Commands

All commands require `-c, --config` pointing to a config JSON file.

- `run` — Full pipeline: outline → script → audio
- `outline` — Outline only
- `script` — Script only (requires outline)
- `audio` — Audio only (requires script)

### run

```bash
node ./index.js run -c ../examples/cli-config.json -o podcast.mp3
```

- Reads config, loads document and characters.
- Generates outline, then script, then audio.
- `-o, --out <file>`: output MP3 path (default: `./podcast.mp3`).

Override everything from flags (no config file):

```bash
node ./index.js run \
  --api-key sk-... \
  --model-outline gpt-4o-mini --model-script gpt-4o-mini --model-tts tts-1 \
  --duration 30 --language english \
  --host-name Alice --host-voice alloy \
  --guest-name Bob --guest-voice verse \
  --doc-path ../examples/your-source.txt \
  -o ../podcast.mp3
```

### outline

```bash
node ./index.js outline -c ../examples/cli-config.json
```

- Prints the outline to stdout.

Using STDIN for the document and flags only:

```bash
type ../examples/your-source.txt | node ./index.js outline --doc-stdin --api-key sk-... --model-outline gpt-4o-mini
```

### script

```bash
node ./index.js script -c ../examples/cli-config.json
```

- Prints the script to stdout.

With overrides for language and models:

```bash
node ./index.js script -c ../examples/cli-config.json \
  --language english --model-script gpt-4o-mini --model-script-verify gpt-4o-mini
```

### audio

```bash
node ./index.js audio -c ../examples/cli-config.json -o podcast.mp3
```

- Writes MP3 to the given output path (default: `podcast.mp3`).

Override only TTS model and voices from flags:

```bash
node ./index.js audio -c ../examples/cli-config.json \
  --model-tts tts-1 --host-voice alloy --guest-voice verse -o podcast.mp3
```

## How it works

- The CLI creates a `PodcastinatorService` with headless adapters:
  - `HeadlessStorage` — in-memory store (no files written unless you write the audio buffer).
  - `HeadlessContentState` — minimal state flags (no DOM/sections).
  - `HeadlessNotifications`, `HeadlessProgress` — console/no-op.
- The service calls into the same generators used in the browser.
- Node audio path:
  - Requests `mp3` from OpenAI TTS per parsed script segment.
  - Concatenates buffers into a single MP3 (supported by most players).

## Limitations / Roadmap

- Silence insertion in Node path: `silenceMs` is respected in browser via MP3 encoder, but in Node we currently concatenate segment MP3s without inserted silence. Options:
  - Prepend/append mp3 silence frames of the requested duration.
  - Request WAV from API and encode to MP3 while inserting silence (adds dependency).
- Voice instructions/speech rate: parity with browser path can be added if needed.

## Debugging

Two VS Code launch configs are provided in `.vscode/launch.json`:

- CLI: run full pipeline — runs `run -c ... -o podcast.mp3`
- CLI: outline only — runs `outline -c ...`

On older Node, the configs enable `--experimental-fetch`.

## Troubleshooting

- API key errors: ensure `apiKey` is correct and starts with `sk-`.
- Document errors: provide `document.path` or `document.content`.
- TTS errors: ensure TTS model and voice are valid. Check network access.
- Output not written: ensure `-o` is provided or capture `buffer` yourself.

## Related

- Service: `../js/core/PodcastinatorService.js`
- Headless adapters: `./adapters/*.js`
- VS Code configs: `../.vscode/launch.json`
