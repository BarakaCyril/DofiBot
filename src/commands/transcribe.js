// /transcribe start and /transcribe stop: record the call, then transcribe the
// whole conversation into #transcript when it's stopped.
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');
const config = require('../config');
const transcriber = require('../transcriber');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('transcribe')
    .setDescription('Record the call, then transcribe it when stopped')
    .addSubcommand((sub) =>
      sub.setName('start').setDescription('Start recording the call for a transcript')
    )
    .addSubcommand((sub) =>
      sub.setName('stop').setDescription(`Stop recording and post the transcript to #${config.transcriptChannel}`)
    ),

  async execute(interaction) {
    const name = interaction.member?.displayName || interaction.user.username;
    const guildId = interaction.guildId;

    // Replies are public so everyone knows when recording starts and stops.
    if (interaction.options.getSubcommand() === 'start') {
      if (!getVoiceConnection(guildId)) {
        await interaction.reply({
          content: "I'm not in a call. Use /join first.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      if (transcriber.isRecording(guildId)) {
        await interaction.reply({ content: "I'm already recording.", flags: MessageFlags.Ephemeral });
        return;
      }
      transcriber.start(guildId);
      await interaction.reply(
        `🔴 ${name} started recording the call. When someone uses \`/transcribe stop\`, ` +
        `I'll post the whole conversation to #${config.transcriptChannel}.`
      );
    } else {
      const minutes = await transcriber.stop(interaction.guild);
      if (minutes === null) {
        await interaction.reply({ content: "I'm not recording.", flags: MessageFlags.Ephemeral });
        return;
      }
      await interaction.reply(
        `⏹️ ${name} stopped recording (${minutes} min). Transcribing now; ` +
        `the transcript will appear in #${config.transcriptChannel} shortly.`
      );
    }
  },
};
