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

async function loadConfigToService(service, cfg) {
  cfg = cfg || {};
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

attachCommonOptions(program.command('run'))
  .description('Run full pipeline (outline -> script -> audio). Flags override config; config is optional.')
  .option('-o, --out <file>', 'Output MP3 file path (Node only)')
  .action(async (opts) => {
    try {
      const service = createService();
      const fileCfg = opts.config ? await readJson(opts.config) : {};
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

      const script = await service.generateScript({
        language: merged?.podcast?.language || 'english'
      });
      console.log('\n--- SCRIPT (length) ---\n', script.length);

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
      const fileCfg = opts.config ? await readJson(opts.config) : {};
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
      const fileCfg = opts.config ? await readJson(opts.config) : {};
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
      const fileCfg = opts.config ? await readJson(opts.config) : {};
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
