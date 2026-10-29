// Sends SMS alerts through Africa's Talking, using their official library.
// Keep messages plain text (no emoji): emoji make an SMS cost more and fit
// only 70 characters.
// Docs: https://developers.africastalking.com/docs/sms/sending
const config = require('./config');

function isEnabled() {
  return Boolean(config.atUsername && config.atApiKey && config.smsTo.length > 0);
}

// Username "sandbox" uses the free test sandbox; any other username is live.
const africastalking = isEnabled()
  ? require('africastalking')({ apiKey: config.atApiKey, username: config.atUsername })
  : null;

async function sendSms(message) {
  if (!africastalking) return;

  const options = { to: config.smsTo, message };
  if (config.atSenderId) options.from = config.atSenderId;

  try {
    const result = await africastalking.SMS.send(options);
    // Each number gets its own status, e.g. "Success" or "InsufficientBalance".
    const failed = result.SMSMessageData.Recipients.filter((r) => r.status !== 'Success');
    if (failed.length > 0) {
      console.error('Some SMS were not sent:', failed.map((r) => `${r.number}: ${r.status}`).join(', '));
    } else {
      console.log('SMS sent:', message);
    }
  } catch (error) {
    // An SMS failing should never break the bot.
    console.error('Could not send SMS:', error.message || error);
  }
}

// Each SMS part is at most this long, so with its heading it fits in 5 SMS
// pages (765 characters), which phones join back into one message.
const PART_LENGTH = 690;

// Sends the cleaned transcript as numbered SMS parts. To keep costs down it
// stops after config.smsMaxParts parts and points to Discord for the rest.
async function sendTranscript(cleaned) {
  if (!africastalking) return;

  const text = toPlainSms(
    cleaned
      .split('\n')
      .map((line) => line.replace(/^\[[\d:]+\]\s*/, '')) // timestamps cost characters
      .join('\n')
  );
  const parts = splitIntoParts(text);
  const sending = parts.slice(0, config.smsMaxParts);
  if (parts.length > sending.length) {
    sending[sending.length - 1] += '\n...(the rest is in Discord #transcript)';
  }

  for (let i = 0; i < sending.length; i++) {
    const label = sending.length > 1 ? ` (${i + 1}/${sending.length})` : '';
    await sendSms(`Dofibot call transcript${label}:\n${sending[i]}`);
  }
}

// Splits text into parts no longer than PART_LENGTH, keeping whole lines
// together where possible.
function splitIntoParts(text) {
  const parts = [''];
  for (const line of text.split('\n')) {
    for (const piece of wrap(line)) {
      if (parts[parts.length - 1].length + 1 + piece.length > PART_LENGTH) parts.push('');
      const last = parts.length - 1;
      parts[last] += (parts[last] ? '\n' : '') + piece;
    }
  }
  return parts.filter(Boolean);
}

// Breaks a single line that's longer than a whole part at spaces.
function wrap(line) {
  const pieces = [];
  let rest = line;
  while (rest.length > PART_LENGTH) {
    let cut = rest.lastIndexOf(' ', PART_LENGTH);
    if (cut <= 0) cut = PART_LENGTH;
    pieces.push(rest.slice(0, cut));
    rest = rest.slice(cut).trimStart();
  }
  pieces.push(rest);
  return pieces;
}

// Swaps characters that would force an SMS into the expensive 70-character
// format (curly quotes, long dashes, emoji) for plain ones.
function toPlainSms(text) {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[^\x0A\x20-\x7E£¥èéùìòÇØøÅåÄÖÑÜ§¿äöñüà]/g, '');
}

module.exports = { isEnabled, sendSms, sendTranscript };
