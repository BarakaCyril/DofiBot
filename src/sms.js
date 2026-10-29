// Sends SMS alerts through Africa's Talking. Keep messages plain text (no
// emoji): emoji make an SMS cost more and fit only 70 characters.
// Docs: https://developers.africastalking.com/docs/sms/sending
const config = require('./config');

function isEnabled() {
  return Boolean(config.atUsername && config.atApiKey && config.smsTo.length > 0);
}

async function sendSms(message) {
  if (!isEnabled()) return;

  const sandbox = config.atUsername === 'sandbox';
  const url = sandbox
    ? 'https://api.sandbox.africastalking.com/version1/messaging'
    : 'https://api.africastalking.com/version1/messaging';

  const body = new URLSearchParams({
    username: config.atUsername,
    to: config.smsTo.join(','),
    message,
  });
  if (config.atSenderId) body.append('from', config.atSenderId);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        apiKey: config.atApiKey,
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    const result = await response.text();
    if (!response.ok) throw new Error(`${response.status}: ${result}`);
    console.log('SMS sent:', message);
  } catch (error) {
    // An SMS failing should never break the bot.
    console.error('Could not send SMS:', error.message);
  }
}

module.exports = { isEnabled, sendSms };
