// /join: Dofibot joins the voice channel you're in.
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const {
  joinVoiceChannel,
  getVoiceConnection,
  entersState,
  VoiceConnectionStatus,
} = require('@discordjs/voice');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Dofibot joins the voice channel you are in'),

  async execute(interaction) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      await interaction.reply({
        content: 'Join a voice channel first, then use /join.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const existing = getVoiceConnection(interaction.guildId);
    if (existing && existing.joinConfig.channelId === voiceChannel.id) {
      await interaction.reply({
        content: `I'm already in ${voiceChannel}.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Joining can take a few seconds, so tell Discord we're working on it.
    await interaction.deferReply();

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: interaction.guildId,
      adapterCreator: interaction.guild.voiceAdapterCreator,
      selfDeaf: false, // must hear the call to transcribe it later
    });

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
    } catch (error) {
      connection.destroy();
      console.error('Could not join voice channel:', error.message);
      await interaction.editReply('Sorry, I could not join the voice channel. Try again in a moment.');
      return;
    }

    // If someone drags Dofibot out or the connection drops, clean up properly
    // unless it reconnects by itself within 5 seconds.
    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        connection.destroy();
      }
    });

    await interaction.editReply(
      `👋 Dofibot has joined ${voiceChannel}.\n` +
      '🎙️ Heads up: I may transcribe this call while someone is in silent mode.'
    );
  },
};
