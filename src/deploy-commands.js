// Registers Dofibot's slash commands with Discord for the test server.
// Run it once, and again whenever you add or change a command:
//   npm run deploy
const { REST, Routes } = require('discord.js');
const config = require('./config');
const commands = require('./commands');

if (!config.clientId || !config.guildId) {
  console.error('Set DISCORD_CLIENT_ID and DISCORD_GUILD_ID in .env first.');
  process.exit(1);
}

const rest = new REST().setToken(config.discordToken);
const body = commands.map((c) => c.data.toJSON());

rest
  .put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body })
  .then(() => console.log(`Registered ${body.length} commands: ${body.map((c) => '/' + c.name).join(', ')}`))
  .catch((error) => {
    console.error('Could not register commands:', error.message);
    process.exit(1);
  });
