// Entry point: logs the bot in to Discord.
const { Client, Events, GatewayIntentBits } = require('discord.js');
const config = require('./config');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Silent Seat is online as ${readyClient.user.tag}`);
});

client.login(config.discordToken);
