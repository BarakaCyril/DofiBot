// Talks to the ElevenLabs API: turns text into speech and lists voices.
const config = require('./config');

const API = 'https://api.elevenlabs.io/v1';
const headers = { 'xi-api-key': config.elevenLabsKey };

// Returns Ogg Opus audio as a Buffer: the format Discord plays, so the bot
// doesn't have to convert it while playing (which caused stuttering).
// No language is set, so ElevenLabs detects it (we mix English, Kiswahili, Sheng).
async function textToSpeech(text, voiceId) {
  const response = await fetch(
    `${API}/text-to-speech/${voiceId}?output_format=opus_48000_64`,
    {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: config.elevenLabsModel }),
    }
  );
  if (!response.ok) {
    throw new Error(`ElevenLabs text-to-speech failed (${response.status}): ${await response.text()}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

// A cloned voice belongs to whoever's Discord ID is in its description, as
// "discord_user_id:123...". /clonemyvoice adds it; for voices cloned on the
// website, the accounts person can add it by editing the voice's description.
// If the description also says "dofibot_shared", the person agreed that
// everyone in the group may use their cloned voice.
const OWNER_TAG = /discord_user_id:(\d+)/;
const SHARED_TAG = 'dofibot_shared';

// The voices in our ElevenLabs account. Voices added from the Voice Library on
// the website show up here too. Cached for 10 minutes.
let cachedVoices = null;
let cachedAt = 0;

async function listVoices() {
  if (cachedVoices && Date.now() - cachedAt < 10 * 60 * 1000) return cachedVoices;

  const response = await fetch(`${API}/voices`, { headers });
  if (!response.ok) {
    throw new Error(`ElevenLabs voice list failed (${response.status}): ${await response.text()}`);
  }
  const data = await response.json();
  cachedVoices = data.voices.map((v) => ({
    id: v.voice_id,
    name: v.name,
    cloned: v.category === 'cloned',
    ownerId: (v.description || '').match(OWNER_TAG)?.[1] || null,
    shared: (v.description || '').includes(SHARED_TAG),
  }));
  cachedAt = Date.now();
  return cachedVoices;
}

// Anyone can use stock voices and shared clones; other cloned voices only by
// the person they belong to.
function canUseVoice(voice, userId) {
  return !voice.cloned || voice.shared || voice.ownerId === userId;
}

// Clones a voice from an audio recording. Needs the "Voices: Write" permission
// on the API key. Returns the new voice ID.
async function cloneVoice(name, audio, fileName, userId) {
  const form = new FormData();
  form.append('name', name);
  form.append('description', `Dofibot clone. discord_user_id:${userId}`);
  form.append('remove_background_noise', 'true');
  form.append('files', new Blob([audio]), fileName);

  const response = await fetch(`${API}/voices/add`, { method: 'POST', headers, body: form });
  if (!response.ok) {
    throw new Error(`ElevenLabs voice cloning failed (${response.status}): ${await response.text()}`);
  }
  cachedVoices = null; // so the new voice shows up straight away
  return (await response.json()).voice_id;
}

async function deleteVoice(voiceId) {
  const response = await fetch(`${API}/voices/${voiceId}`, { method: 'DELETE', headers });
  if (!response.ok) {
    throw new Error(`ElevenLabs voice delete failed (${response.status}): ${await response.text()}`);
  }
  cachedVoices = null;
}

// Transcribes an MP3 Buffer with Scribe. Returns the words with their start
// times in seconds: [{ text, start }]. No language is set, so Scribe detects it.
async function speechToText(mp3) {
  const form = new FormData();
  form.append('model_id', config.sttModel);
  form.append('tag_audio_events', 'false'); // skip "(laughter)" etc.
  form.append('file', new Blob([mp3], { type: 'audio/mpeg' }), 'speaker.mp3');

  const response = await fetch(`${API}/speech-to-text`, { method: 'POST', headers, body: form });
  if (!response.ok) {
    throw new Error(`ElevenLabs speech-to-text failed (${response.status}): ${await response.text()}`);
  }
  const data = await response.json();
  return (data.words || [])
    .filter((w) => w.type === 'word')
    .map((w) => ({ text: w.text, start: w.start }));
}

module.exports = {
  textToSpeech,
  listVoices,
  canUseVoice,
  cloneVoice,
  deleteVoice,
  speechToText,
};
