// /leave: Dofibot leaves the voice channel.
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Dofibot leaves the voice channel'),

  async execute(interaction) {
    const connection = getVoiceConnection(interaction.guildId);
    if (!connection) {
      await interaction.reply({
        content: "I'm not in a voice channel.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    connection.destroy();
    await interaction.reply('👋 Dofibot has left the call.');
  },
};
