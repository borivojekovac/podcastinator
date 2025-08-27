#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import url from 'url';

import PodcastinatorService from '../js/core/PodcastinatorService.js';
import HeadlessStorage from './adapters/HeadlessStorage.js';
import HeadlessNotifications from './adapters/HeadlessNotifications.js';
import HeadlessProgress from './adapters/HeadlessProgress.js';
import HeadlessContentState from './adapters/HeadlessContentState.js';

const program = new Command();
program
  .name('podcastinator')
  .description('CLI to generate outline, script, and audio using Podcastinator service')
  .version('0.1.0');

function createService() {
  const storage = new HeadlessStorage();
  const notifications = new HeadlessNotifications();
  const progress = new HeadlessProgress();
  const contentState = new HeadlessContentState();
  const service = new PodcastinatorService({ storage, notifications, progress, contentState });
  return service;
}

async function readJson(filePath) {
  const data = await fs.readFile(filePath, 'utf8');
  return JSON.parse(data);
}

function normalizeConfig(input) {
  const cfg = { ...(input || {}) };

  // Map aiParameters.models -> models
  if (!cfg.models && cfg.aiParameters && cfg.aiParameters.models) {
    cfg.models = { ...cfg.aiParameters.models };
  }

  // Map contents.document -> document
  if (!cfg.document && cfg.contents && cfg.contents.document) {
    const doc = cfg.contents.document;
    if (typeof doc === 'string') {
      cfg.document = { content: doc };
    } else if (doc && typeof doc.content === 'string') {
      cfg.document = { content: doc.content };
    } else if (doc && typeof doc.path === 'string') {
      cfg.document = { path: doc.path };
    }
  }

  // Map podcast prefs
  if (!cfg.podcast) {
    cfg.podcast = {};
  }
  if (cfg.outline && typeof cfg.outline.targetDurationMinutes === 'number') {
    cfg.podcast.duration = cfg.outline.targetDurationMinutes;
  }
  if (cfg.script && typeof cfg.script.language === 'string') {
    cfg.podcast.language = cfg.script.language;
  }
  if (cfg.audio && typeof cfg.audio.silenceBetweenSpeakersMs === 'number') {
    cfg.podcast.silenceMs = cfg.audio.silenceBetweenSpeakersMs;
  }
  if (cfg.contents && typeof cfg.contents.podcastFocus === 'string') {
    cfg.podcast.focus = cfg.contents.podcastFocus;
  }

  // Map hostCharacter/guestCharacter -> characters
  if (!cfg.characters && (cfg.hostCharacter || cfg.guestCharacter)) {
    cfg.characters = {};
    if (cfg.hostCharacter) {
      cfg.characters.host = {
        name: cfg.hostCharacter.name,
        voice: cfg.hostCharacter.voice,
        speechRate: cfg.hostCharacter.speechRate,
        voiceInstructions: cfg.hostCharacter.voiceInstructions,
        backstory: cfg.hostCharacter.backstory
      };
    }
    if (cfg.guestCharacter) {
      cfg.characters.guest = {
        name: cfg.guestCharacter.name,
        voice: cfg.guestCharacter.voice,
        speechRate: cfg.guestCharacter.speechRate,
        voiceInstructions: cfg.guestCharacter.voiceInstructions,
        backstory: cfg.guestCharacter.backstory
      };
    }
  }

  return cfg;
}

async function loadConfigToService(service, cfg) {
  cfg = cfg || {};
  // Fallback to environment variable if apiKey not provided
  if (!cfg.apiKey && process.env && process.env.OPENAI_API_KEY) {
    cfg.apiKey = process.env.OPENAI_API_KEY;
  }
  // API & Models & podcast prefs
  await service.loadConfig({
    apiKey: cfg.apiKey,
    models: cfg.models || {},
    podcast: cfg.podcast || {}
  });

  // Document
  if (cfg.document) {
    if (cfg.document.content) {
      await service.loadDocumentFromText(cfg.document.content);
    } else if (cfg.document.path) {
      const abs = path.resolve(cfg.document.path);
      const content = await fs.readFile(abs, 'utf8');
      await service.loadDocumentFromText(content);
    }
  }

  // Characters
  if (cfg.characters) {
    await service.setCharacters({
      host: cfg.characters.host || {},
      guest: cfg.characters.guest || {}
    });
  }
}

function attachCommonOptions(cmd) {
  return cmd
    // Config file
    .option('-c, --config <file>', 'Path to config JSON (optional, flags override)')
    // API key
    .option('--api-key <key>', 'OpenAI API key')
    // Models
    .option('--model-outline <name>', 'Model for outline')
    .option('--model-outline-verify <name>', 'Model for outline verification')
    .option('--model-script <name>', 'Model for script')
    .option('--model-script-verify <name>', 'Model for script verification')
    .option('--model-backstory <name>', 'Model for backstory')
    .option('--model-tts <name>', 'Model for TTS')
    // Podcast prefs
    .option('--duration <minutes>', 'Podcast duration in minutes', (v) => parseInt(v, 10))
    .option('--focus <text>', 'Podcast focus/topic')
    .option('--language <lang>', 'Script language (e.g., english)')
    .option('--silence-ms <ms>', 'Silence between segments in ms (Node path concat currently ignores)', (v) => parseInt(v, 10))
    // Document
    .option('--doc-path <file>', 'Path to document text file')
    .option('--doc-content <string>', 'Inline document content')
    .option('--doc-stdin', 'Read document content from STDIN')
    // Characters
    .option('--host-name <s>', 'Host name')
    .option('--host-voice <s>', 'Host TTS voice id')
    .option('--host-speech-rate <n>', 'Host speech rate (number)', (v) => parseFloat(v))
    .option('--host-voice-instructions <s>', 'Host voice instructions (gpt-4o-mini-tts)')
    .option('--guest-name <s>', 'Guest name')
    .option('--guest-voice <s>', 'Guest TTS voice id')
    .option('--guest-speech-rate <n>', 'Guest speech rate (number)', (v) => parseFloat(v))
    .option('--guest-voice-instructions <s>', 'Guest voice instructions (gpt-4o-mini-tts)');
}

async function buildConfigFromOptions(opts) {
  const cfg = {};
  if (opts.apiKey) {
    cfg.apiKey = opts.apiKey;
  }
  // Models
  const models = {};
  if (opts.modelOutline) models.outline = opts.modelOutline;
  if (opts.modelOutlineVerify) models.outlineVerify = opts.modelOutlineVerify;
  if (opts.modelScript) models.script = opts.modelScript;
  if (opts.modelScriptVerify) models.scriptVerify = opts.modelScriptVerify;
  if (opts.modelBackstory) models.backstory = opts.modelBackstory;
  if (opts.modelTts) models.tts = opts.modelTts;
  if (Object.keys(models).length) cfg.models = models;

  // Podcast prefs
  const podcast = {};
  if (opts.duration !== undefined) podcast.duration = opts.duration;
  if (opts.focus !== undefined) podcast.focus = opts.focus;
  if (opts.language !== undefined) podcast.language = opts.language;
  if (opts.silenceMs !== undefined) podcast.silenceMs = opts.silenceMs;
  if (Object.keys(podcast).length) cfg.podcast = podcast;

  // Document
  if (opts.docContent) {
    cfg.document = { content: opts.docContent };
  } else if (opts.docPath) {
    cfg.document = { path: opts.docPath };
  } else if (opts.docStdin) {
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    cfg.document = { content: Buffer.concat(chunks.map((c) => Buffer.isBuffer(c) ? c : Buffer.from(c))).toString('utf8') };
  }

  // Characters
  const host = {};
  if (opts.hostName) host.name = opts.hostName;
  if (opts.hostVoice) host.voice = opts.hostVoice;
  if (opts.hostSpeechRate !== undefined) host.speechRate = opts.hostSpeechRate;
  if (opts.hostVoiceInstructions !== undefined) host.voiceInstructions = opts.hostVoiceInstructions;

  const guest = {};
  if (opts.guestName) guest.name = opts.guestName;
  if (opts.guestVoice) guest.voice = opts.guestVoice;
  if (opts.guestSpeechRate !== undefined) guest.speechRate = opts.guestSpeechRate;
  if (opts.guestVoiceInstructions !== undefined) guest.voiceInstructions = opts.guestVoiceInstructions;

  if (Object.keys(host).length || Object.keys(guest).length) {
    cfg.characters = { host, guest };
  }

  return cfg;
}

function buildUiExportPayloadFromService(service) {
  const storage = service.storage;
  const data = storage.load('data', {}) || {};
  const outlineData = storage.load('outlineData', {}) || {};
  const scriptData = storage.load('scriptData', {}) || {};
  const audioData = storage.load('audioData', {}) || {};

  const payload = {
    version: 1,
    savedAt: new Date().toISOString(),
    aiParameters: {
      models: {
        backstory: data.models?.backstory || '',
        outline: data.models?.outline || '',
        outlineVerify: data.models?.outlineVerify || '',
        script: data.models?.script || '',
        scriptVerify: data.models?.scriptVerify || '',
        tts: data.models?.tts || ''
      }
    },
    contents: {
      document: data.document || null,
      podcastFocus: outlineData.podcastFocus || ''
    },
    hostCharacter: data.host ? {
      name: data.host.name || '',
      personality: data.host.personality || '',
      voice: data.host.voice || '',
      speechRate: data.host.speechRate || 1.0,
      voiceInstructions: data.host.voiceInstructions || '',
      backstory: data.host.backstory || ''
    } : undefined,
    guestCharacter: data.guest ? {
      name: data.guest.name || '',
      personality: data.guest.personality || '',
      voice: data.guest.voice || '',
      speechRate: data.guest.speechRate || 1.0,
      voiceInstructions: data.guest.voiceInstructions || '',
      backstory: data.guest.backstory || ''
    } : undefined,
    outline: {
      targetDurationMinutes: outlineData.podcastDuration || 30,
      outlineText: outlineData.outline || ''
    },
    script: {
      language: scriptData.language || 'english',
      scriptText: scriptData.script || ''
    },
    audio: {
      silenceBetweenSpeakersMs: audioData.silenceDuration || 400,
      mp3Base64: null
    }
  };

  return payload;
}

attachCommonOptions(program.command('run'))
  .description('Run full pipeline (outline -> script -> audio). Flags override config; config is optional.')
  .option('-o, --out <file>', 'Output MP3 file path (Node only)')
  .option('--outline-out <file>', 'Output outline text file path')
  .option('--script-out <file>', 'Output script text file path')
  .option('--config-out <file>', 'Output UI-format config JSON file path')
  .action(async (opts) => {
    try {
      const service = createService();
      const fileCfg = opts.config ? normalizeConfig(await readJson(opts.config)) : {};
      const flagCfg = await buildConfigFromOptions(opts);
      const merged = { ...fileCfg };
      // Deep merge for models/podcast/characters/document
      if (flagCfg.apiKey) merged.apiKey = flagCfg.apiKey;
      if (flagCfg.models) merged.models = { ...(fileCfg.models || {}), ...flagCfg.models };
      if (flagCfg.podcast) merged.podcast = { ...(fileCfg.podcast || {}), ...flagCfg.podcast };
      if (flagCfg.document) merged.document = flagCfg.document;
      if (flagCfg.characters) merged.characters = { ...(fileCfg.characters || {}), ...flagCfg.characters };
      await loadConfigToService(service, merged);

      const outline = await service.generateOutline({
        duration: merged?.podcast?.duration,
        focus: merged?.podcast?.focus
      });
      console.log('\n--- OUTLINE ---\n');
      console.log(outline);

      if (opts.outlineOut) {
        const outlinePath = path.resolve(opts.outlineOut);
        await fs.writeFile(outlinePath, outline, 'utf8');
        console.log(`\nSaved outline to ${outlinePath}`);
      }

      const script = await service.generateScript({
        language: merged?.podcast?.language || 'english'
      });
      console.log('\n--- SCRIPT (length) ---\n', script.length);

      if (opts.scriptOut) {
        const scriptPath = path.resolve(opts.scriptOut);
        await fs.writeFile(scriptPath, script, 'utf8');
        console.log(`\nSaved script to ${scriptPath}`);
      }

      const audioResult = await service.generateAudio({
        silenceMs: merged?.podcast?.silenceMs,
        outputPath: opts.out || ''
      });

      if (audioResult?.buffer && opts.out) {
        const absOut = path.resolve(opts.out);
        await fs.writeFile(absOut, audioResult.buffer);
        console.log(`\nSaved MP3 to ${absOut}`);
      } else if (audioResult?.buffer) {
        const cwd = process.cwd();
        const outPath = path.join(cwd, 'podcast.mp3');
        await fs.writeFile(outPath, audioResult.buffer);
        console.log(`\nSaved MP3 to ${outPath}`);
      } else {
        console.log('\nAudio generated (browser path).');
      }

      if (opts.configOut) {
        const payload = buildUiExportPayloadFromService(service);
        const cfgOutPath = path.resolve(opts.configOut);
        await fs.writeFile(cfgOutPath, JSON.stringify(payload, null, 2), 'utf8');
        console.log(`\nSaved UI config to ${cfgOutPath}`);
      }
    } catch (err) {
      console.error('Error:', err.message || err);
      process.exitCode = 1;
    }
  });

attachCommonOptions(program.command('outline'))
  .description('Generate outline. Flags override config; config is optional.')
  .action(async (opts) => {
    try {
      const service = createService();
      const fileCfg = opts.config ? normalizeConfig(await readJson(opts.config)) : {};
      const flagCfg = await buildConfigFromOptions(opts);
      const merged = { ...fileCfg };
      if (flagCfg.apiKey) merged.apiKey = flagCfg.apiKey;
      if (flagCfg.models) merged.models = { ...(fileCfg.models || {}), ...flagCfg.models };
      if (flagCfg.podcast) merged.podcast = { ...(fileCfg.podcast || {}), ...flagCfg.podcast };
      if (flagCfg.document) merged.document = flagCfg.document;
      if (flagCfg.characters) merged.characters = { ...(fileCfg.characters || {}), ...flagCfg.characters };
      await loadConfigToService(service, merged);
      const outline = await service.generateOutline({
        duration: merged?.podcast?.duration,
        focus: merged?.podcast?.focus
      });
      console.log(outline);
    } catch (err) {
      console.error('Error:', err.message || err);
      process.exitCode = 1;
    }
  });

attachCommonOptions(program.command('script'))
  .description('Generate script (requires outline). Flags override config; config is optional.')
  .action(async (opts) => {
    try {
      const service = createService();
      const fileCfg = opts.config ? normalizeConfig(await readJson(opts.config)) : {};
      const flagCfg = await buildConfigFromOptions(opts);
      const merged = { ...fileCfg };
      if (flagCfg.apiKey) merged.apiKey = flagCfg.apiKey;
      if (flagCfg.models) merged.models = { ...(fileCfg.models || {}), ...flagCfg.models };
      if (flagCfg.podcast) merged.podcast = { ...(fileCfg.podcast || {}), ...flagCfg.podcast };
      if (flagCfg.document) merged.document = flagCfg.document;
      if (flagCfg.characters) merged.characters = { ...(fileCfg.characters || {}), ...flagCfg.characters };
      await loadConfigToService(service, merged);
      const script = await service.generateScript({ language: merged?.podcast?.language || 'english' });
      console.log(script);
    } catch (err) {
      console.error('Error:', err.message || err);
      process.exitCode = 1;
    }
  });

attachCommonOptions(program.command('audio'))
  .description('Generate audio (requires script). Flags override config; config is optional.')
  .option('-o, --out <file>', 'Output MP3 file path (Node only)')
  .action(async (opts) => {
    try {
      const service = createService();
      const fileCfg = opts.config ? normalizeConfig(await readJson(opts.config)) : {};
      const flagCfg = await buildConfigFromOptions(opts);
      const merged = { ...fileCfg };
      if (flagCfg.apiKey) merged.apiKey = flagCfg.apiKey;
      if (flagCfg.models) merged.models = { ...(fileCfg.models || {}), ...flagCfg.models };
      if (flagCfg.podcast) merged.podcast = { ...(fileCfg.podcast || {}), ...flagCfg.podcast };
      if (flagCfg.document) merged.document = flagCfg.document;
      if (flagCfg.characters) merged.characters = { ...(fileCfg.characters || {}), ...flagCfg.characters };
      await loadConfigToService(service, merged);
      const audioResult = await service.generateAudio({ silenceMs: merged?.podcast?.silenceMs, outputPath: opts.out || '' });
      if (audioResult?.buffer) {
        const absOut = path.resolve(opts.out || 'podcast.mp3');
        await fs.writeFile(absOut, audioResult.buffer);
        console.log(`Saved MP3 to ${absOut}`);
      } else {
        console.log('Audio generated (browser path).');
      }
    } catch (err) {
      console.error('Error:', err.message || err);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);
