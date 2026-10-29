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

module.exports = { isEnabled, sendSms };
