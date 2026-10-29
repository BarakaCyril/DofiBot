// Talks to the ElevenLabs API: turns text into speech and lists voices.
const config = require('./config');

const API = 'https://api.elevenlabs.io/v1';
const headers = { 'xi-api-key': config.elevenLabsKey };

// Returns MP3 audio as a Buffer. No language is set, so ElevenLabs detects it
// (our messages mix English, Kiswahili and Sheng).
async function textToSpeech(text, voiceId) {
  const response = await fetch(
    `${API}/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
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
  cachedVoices = data.voices.map((v) => ({ id: v.voice_id, name: v.name }));
  cachedAt = Date.now();
  return cachedVoices;
}

module.exports = { textToSpeech, listVoices };
