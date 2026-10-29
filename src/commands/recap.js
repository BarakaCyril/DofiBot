// /recap: show the recap of the last finished call again (topics, plans, who
// promised what). Dofibot also posts it automatically after each call.
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const refiner = require('../refiner');
const transcriber = require('../transcriber');
const transcript = require('../transcript');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('recap')
    .setDescription('Show the recap of the last call: topics, plans, who promised what'),

  async execute(interaction) {
    const last = transcript.get(interaction.guildId);
    if (last.lines.length === 0) {
      const hint = transcriber.isRecording(interaction.guildId)
        ? ' The current call is still being recorded: use `/catchup` for a quick summary so far.'
        : '';
      await interaction.reply({
        content: `There's no finished call to recap yet.${hint}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (!refiner.isEnabled()) {
      await interaction.reply({
        content: 'Recaps need a Gemini key (`GEMINI_API_KEY` in `.env`).',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // The recap may still be being written, or may have failed: make one now.
    let recap = last.recap;
    if (!recap) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      recap = await refiner.summarizeCall(last.cleaned || transcriber.toText(last.lines));
      transcript.setRecap(interaction.guildId, recap);
      await interaction.editReply(`📋 **Call recap**\n${recap}`.slice(0, 2000));
      return;
    }
    await interaction.reply({
      content: `📋 **Call recap**\n${recap}`.slice(0, 2000),
      flags: MessageFlags.Ephemeral,
    });
  },
};
