// Remembers which ElevenLabs voice each person picked with /myvoice.
// Saved in data/voices.json so choices survive a restart.
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');

const FILE = path.join(__dirname, '..', 'data', 'voices.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return {};
  }
}

function getVoice(userId) {
  return load()[userId] || null; // { id, name } or null
}

function getVoiceId(userId) {
  return getVoice(userId)?.id || config.defaultVoiceId;
}

function setVoice(userId, voice) {
  const all = load();
  all[userId] = { id: voice.id, name: voice.name };
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(all, null, 2));
}

module.exports = { getVoice, getVoiceId, setVoice };
