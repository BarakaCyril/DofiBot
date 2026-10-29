// Loads settings from .env and stops early if something required is missing.
// Never log the values themselves: they are secrets.
require('dotenv').config({ quiet: true });

const required = ['DISCORD_TOKEN', 'ELEVENLABS_API_KEY'];
const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(`Missing in .env: ${missing.join(', ')}`);
  console.error('Copy .env.example to .env and fill it in.');
  process.exit(1);
}

module.exports = {
  discordToken: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  guildId: process.env.DISCORD_GUILD_ID,
  elevenLabsKey: process.env.ELEVENLABS_API_KEY,
  // eleven_v3 supports Kiswahili; eleven_flash_v2_5 is faster but English-first.
  elevenLabsModel: process.env.ELEVENLABS_MODEL || 'eleven_v3',
  // Voice used for anyone who hasn't picked one with /myvoice.
  defaultVoiceId: process.env.ELEVENLABS_DEFAULT_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb', // George
  // Scribe model for transcription. scribe_v1 was faster than scribe_v2 in testing.
  sttModel: process.env.ELEVENLABS_STT_MODEL || 'scribe_v1',
  silentSeatChannel: process.env.SILENT_SEAT_CHANNEL || 'silent-seat',
  transcriptChannel: process.env.TRANSCRIPT_CHANNEL || 'transcript',
  anthropicKey: process.env.ANTHROPIC_API_KEY,
};
