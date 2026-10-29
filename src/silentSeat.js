// Messages typed in #silent-seat are spoken in the call: "Brian says: ..."
const { getVoiceConnection } = require('@discordjs/voice');
const config = require('./config');
const { textToSpeech } = require('./elevenlabs');
const speaker = require('./speaker');
const voiceChoices = require('./voiceChoices');

// Longer messages are cut off, to keep ElevenLabs costs down.
const MAX_LENGTH = 400;

function cleanText(message) {
  let text = message.cleanContent // turns @mentions into names
    .replace(/<a?:(\w+):\d+>/g, '') // custom emoji
    .replace(/https?:\/\/\S+/g, 'a link')
    .trim();
  if (text.length > MAX_LENGTH) text = text.slice(0, MAX_LENGTH) + '…';
  return text;
}

async function handleMessage(message) {
  if (message.author.bot || !message.guild) return;
  if (message.channel.name !== config.silentSeatChannel) return;

  const text = cleanText(message);
  if (!text) return;

  if (!getVoiceConnection(message.guild.id)) {
    await message.reply("I'm not in a call. Join a voice channel and use /join first.");
    return;
  }

  const name = message.member?.displayName || message.author.username;
  const audio = textToSpeech(`${name} says: ${text}`, voiceChoices.getVoiceId(message.author.id));
  speaker.enqueue(message.guild.id, audio);

  // React so the sender knows it worked without having to listen.
  try {
    await audio;
    await message.react('🔊');
  } catch (error) {
    console.error('Could not speak message:', error.message);
    await message.react('❌').catch(() => {});
  }
}

module.exports = { handleMessage };
