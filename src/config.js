// Loads settings from .env and stops early if something required is missing.
// Never log the values themselves: they are secrets.
require('dotenv').config({ quiet: true });

const required = ['DISCORD_TOKEN'];
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
  anthropicKey: process.env.ANTHROPIC_API_KEY,
};
