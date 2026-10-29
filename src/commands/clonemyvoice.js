// /clonemyvoice: upload a recording of yourself and Dofibot will speak your
// #silent-seat messages in your own voice. Only you can use your cloned voice.
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');
const { listVoices, cloneVoice, deleteVoice, textToSpeech } = require('../elevenlabs');
const speaker = require('../speaker');
const voiceChoices = require('../voiceChoices');

const MAX_FILE_MB = 10;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clonemyvoice')
    .setDescription('Make Dofibot speak your messages in your own voice')
    .addAttachmentOption((option) =>
      option
        .setName('recording')
        .setDescription('1–2 minutes of you talking normally, in a quiet place (mp3, m4a, wav, ogg)')
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName('its_my_voice')
        .setDescription('I confirm this recording is my own voice and I agree to it being cloned')
        .setRequired(true)
    ),

  async execute(interaction) {
    const recording = interaction.options.getAttachment('recording');
    const confirmed = interaction.options.getBoolean('its_my_voice');
    const userId = interaction.user.id;
    const name = interaction.member?.displayName || interaction.user.username;

    if (!confirmed) {
      await interaction.reply({
        content: 'You can only clone your own voice, with your agreement. Set `its_my_voice` to True if this is you.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (!recording.contentType?.startsWith('audio/') && !recording.contentType?.startsWith('video/')) {
      await interaction.reply({
        content: 'That file is not audio. Upload a voice recording (mp3, m4a, wav or ogg).',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (recording.size > MAX_FILE_MB * 1024 * 1024) {
      await interaction.reply({
        content: `That file is too big. Keep it under ${MAX_FILE_MB} MB (1–2 minutes is plenty).`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Cloning takes a few seconds. The reply is private: only you see it.
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const download = await fetch(recording.url);
    if (!download.ok) throw new Error(`Could not download the recording (${download.status})`);
    const audio = Buffer.from(await download.arrayBuffer());

    // If you cloned before, the old clone is replaced (frees up a voice slot).
    const oldClones = (await listVoices()).filter((v) => v.cloned && v.ownerId === userId);

    let voiceId;
    try {
      voiceId = await cloneVoice(`${name} (Dofibot)`, audio, recording.name, userId);
    } catch (error) {
      console.error('Voice cloning failed:', error.message);
      const hint = error.message.includes('voices_write')
        ? ' The ElevenLabs API key needs the "Voices: Write" permission; ask the accounts person.'
        : '';
      await interaction.editReply(`Sorry, cloning your voice failed.${hint}`);
      return;
    }

    for (const old of oldClones) {
      await deleteVoice(old.id).catch((error) => console.error('Could not delete old clone:', error.message));
    }

    voiceChoices.setVoice(userId, { id: voiceId, name: `${name} (Dofibot)` });
    await interaction.editReply(
      'Done! Your messages in #silent-seat will now be spoken in your own voice. ' +
      'Only you can use it. To switch back to a stock voice, use `/myvoice`.'
    );

    // If Dofibot is in a call, let everyone hear it.
    if (getVoiceConnection(interaction.guildId)) {
      const preview = textToSpeech(`Hi, this is ${name}'s Dofibot voice.`, voiceId);
      preview.catch((error) => console.error('Could not play voice preview:', error.message));
      speaker.enqueue(interaction.guildId, preview);
    }
  },
};
