// /myvoice: pick the voice Dofibot uses for your #silent-seat messages.
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');
const { listVoices, textToSpeech } = require('../elevenlabs');
const speaker = require('../speaker');
const voiceChoices = require('../voiceChoices');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('myvoice')
    .setDescription('Pick the voice Dofibot uses for your messages')
    .addStringOption((option) =>
      option
        .setName('voice')
        .setDescription('Start typing a voice name (leave empty to see your current voice)')
        .setAutocomplete(true)
    ),

  // Suggests voices as you type.
  async autocomplete(interaction) {
    const typed = interaction.options.getFocused().toLowerCase();
    const voices = await listVoices();
    await interaction.respond(
      voices
        .filter((v) => v.name.toLowerCase().includes(typed))
        .slice(0, 25) // Discord shows at most 25
        .map((v) => ({ name: v.name.slice(0, 100), value: v.id }))
    );
  },

  async execute(interaction) {
    const chosenId = interaction.options.getString('voice');

    if (!chosenId) {
      const current = voiceChoices.getVoice(interaction.user.id);
      await interaction.reply({
        content: current
          ? `Your voice is **${current.name}**.`
          : "You haven't picked a voice yet, so you get the default one. Use `/myvoice` and start typing a name.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const voice = (await listVoices()).find((v) => v.id === chosenId);
    if (!voice) {
      await interaction.reply({
        content: "I don't know that voice. Pick one from the list as you type.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    voiceChoices.setVoice(interaction.user.id, voice);
    await interaction.reply({
      content: `Your voice is now **${voice.name}**.`,
      flags: MessageFlags.Ephemeral,
    });

    // If Dofibot is in a call, let everyone hear the new voice.
    if (getVoiceConnection(interaction.guildId)) {
      const name = interaction.member?.displayName || interaction.user.username;
      const audio = textToSpeech(`This is ${name}'s new voice.`, voice.id);
      audio.catch((error) => console.error('Could not play voice preview:', error.message));
      speaker.enqueue(interaction.guildId, audio);
    }
  },
};
