// /catchup <minutes>: a quick summary of what was said in the last few
// minutes, for someone who couldn't listen. Only the person who asks sees it.
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const refiner = require('../refiner');
const transcriber = require('../transcriber');
const transcript = require('../transcript');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('catchup')
    .setDescription('Get a quick summary of the last few minutes of the call')
    .addIntegerOption((option) =>
      option
        .setName('minutes')
        .setDescription('How many minutes to catch up on (default 10)')
        .setMinValue(1)
        .setMaxValue(120)
    ),

  async execute(interaction) {
    const minutes = interaction.options.getInteger('minutes') || 10;

    if (!refiner.isEnabled()) {
      await interaction.reply({
        content: 'Catch-up needs a Gemini key (`GEMINI_API_KEY` in `.env`).',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Transcribing and summarising takes a little while.
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // During a recording: transcribe the last few minutes now.
    // Otherwise: use the end of the last finished call's transcript.
    let text = await transcriber.transcribeRecent(interaction.guild, minutes);
    let source = `the last ${minutes} min`;
    if (text === null) {
      const lines = transcript.get(interaction.guildId).lines;
      if (lines.length === 0) {
        await interaction.editReply(
          "There's nothing to catch up on. I only know what was said while `/transcribe start` was on."
        );
        return;
      }
      const end = lines[lines.length - 1].time;
      text = transcriber.toText(lines.filter((line) => line.time >= end - minutes * 60));
      source = `the last ${minutes} min of the previous call`;
    }

    if (!text) {
      await interaction.editReply(`Nobody said anything I could pick up in ${source}.`);
      return;
    }

    const summary = await refiner.summarizeCatchup(text);
    await interaction.editReply(`⏪ **Catch-up: ${source}**\n${summary}`.slice(0, 2000));
  },
};
