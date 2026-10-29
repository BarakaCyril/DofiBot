// Messages typed in #silent-seat are spoken in the call: "Brian says: ..."
const { getVoiceConnection } = require('@discordjs/voice');
const config = require('./config');
const { textToSpeech } = require('./elevenlabs');
const speaker = require('./speaker');
const voiceChoices = require('./voiceChoices');

// Longer messages are cut off, to keep ElevenLabs costs down.
const MAX_LENGTH = 1000;
// Long messages are spoken in pieces, so the first piece plays while the rest
// is still being generated. The first piece is short so speech starts sooner.
const FIRST_PIECE_LENGTH = 100;
const PIECE_LENGTH = 250;

function cleanText(message) {
  let text = message.cleanContent // turns @mentions into names
    .replace(/<a?:(\w+):\d+>/g, '') // custom emoji
    .replace(/https?:\/\/\S+/g, 'a link')
    .trim();
  if (text.length > MAX_LENGTH) text = text.slice(0, MAX_LENGTH) + '…';
  return text;
}

// Splits text into pieces at sentence ends.
function splitIntoPieces(text) {
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) || [text];
  const pieces = [''];
  for (const sentence of sentences) {
    const last = pieces.length - 1;
    const limit = last === 0 ? FIRST_PIECE_LENGTH : PIECE_LENGTH;
    if (pieces[last] && pieces[last].length + sentence.length > limit) pieces.push('');
    pieces[pieces.length - 1] += sentence;
  }
  return pieces.map((p) => p.trim()).filter(Boolean);
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
  const voiceId = voiceChoices.getVoiceId(message.author.id);

  // Generate the pieces one after another (each starts when the previous one
  // is ready), and queue them all now so they play in order.
  let previous = voiceId;
  const pieces = splitIntoPieces(`${name} says: ${text}`).map((piece) => {
    const audio = previous.then(async () => textToSpeech(piece, await voiceId));
    previous = audio;
    speaker.enqueue(message.guild.id, audio);
    return audio;
  });

  // React so the sender knows it worked without having to listen.
  try {
    await Promise.all(pieces);
    await message.react('🔊');
  } catch (error) {
    console.error('Could not speak message:', error.message);
    await message.react('❌').catch(() => {});
  }
}

module.exports = { handleMessage };
