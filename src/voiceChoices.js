// Remembers which ElevenLabs voice each person picked with /myvoice.
// Saved in data/voices.json so choices survive a restart.
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');
const { listVoices, canUseVoice } = require('./elevenlabs');

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

// The voice to speak this person's messages in:
// 1. the voice they picked with /myvoice (if it still exists and they may use it),
// 2. otherwise their own cloned voice, if they have one,
// 3. otherwise the default voice.
async function getVoiceId(userId) {
  const voices = await listVoices();
  const saved = getVoice(userId);
  const picked = saved && voices.find((v) => v.id === saved.id);
  if (picked && canUseVoice(picked, userId)) return picked.id;

  const ownClone = voices.find((v) => v.cloned && v.ownerId === userId);
  return ownClone ? ownClone.id : config.defaultVoiceId;
}

function setVoice(userId, voice) {
  const all = load();
  all[userId] = { id: voice.id, name: voice.name };
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(all, null, 2));
}

module.exports = { getVoice, getVoiceId, setVoice };
