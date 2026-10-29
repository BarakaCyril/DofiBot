// Entry point: logs the bot in to Discord, runs slash commands and speaks
// #silent-seat messages.
const { Client, Events, GatewayIntentBits, MessageFlags } = require('discord.js');
const { getVoiceConnections } = require('@discordjs/voice');
const config = require('./config');
const commands = require('./commands');
const silentSeat = require('./silentSeat');
const callWatcher = require('./callWatcher');
const sms = require('./sms');
const refiner = require('./refiner');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // must also be switched on in the Developer Portal
  ],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Dofibot is online as ${readyClient.user.tag}`);
  console.log(`SMS alerts: ${sms.isEnabled() ? 'on' : 'off'} | Transcript clean-up: ${refiner.isEnabled() ? 'on' : 'off'}`);
});

// Notices calls starting and ending (SMS alerts, auto-leave).
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  try {
    callWatcher.onVoiceStateUpdate(oldState, newState);
  } catch (error) {
    console.error('Error watching voice channels:', error);
  }
});

client.on(Events.MessageCreate, (message) => {
  silentSeat.handleMessage(message).catch((error) => {
    console.error('Error handling #silent-seat message:', error);
  });
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isAutocomplete()) {
    const command = commands.find((c) => c.data.name === interaction.commandName);
    await command?.autocomplete?.(interaction).catch((error) => {
      console.error(`Autocomplete error in /${interaction.commandName}:`, error.message);
    });
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = commands.find((c) => c.data.name === interaction.commandName);
  if (!command) {
    // Registered with Discord (npm run deploy) but not in the code that's
    // running: the bot was started before the command was added.
    await interaction.reply({
      content: `I don't know /${interaction.commandName} yet. Restart Dofibot (Ctrl+C, then npm start) to load it.`,
      flags: MessageFlags.Ephemeral,
    }).catch(() => {});
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    // Discord only waits 3 seconds for a first reply. Usually this means two
    // copies of the bot are running, or the network was slow.
    if (error.code === 10062) {
      console.error(
        `/${interaction.commandName} timed out (Discord waits 3s). ` +
        'Check only one copy of the bot is running, then try again.'
      );
      return;
    }
    console.error(`Error in /${interaction.commandName}:`, error);
    const reply = { content: 'Something went wrong.', flags: MessageFlags.Ephemeral };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
  }
});

// On Ctrl+C (or pm2 stopping the bot), leave any calls and log out properly,
// so Discord shows Dofibot offline straight away instead of after a minute.
async function shutdown() {
  console.log('Shutting down...');
  for (const connection of getVoiceConnections().values()) {
    connection.destroy();
  }
  await client.destroy();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

client.login(config.discordToken);
