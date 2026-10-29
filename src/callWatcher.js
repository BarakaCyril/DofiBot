// Watches the voice channels to notice when a call starts (first person joins)
// and ends (everyone has left). It sends SMS alerts, and when a call ends
// while Dofibot is in it, Dofibot leaves and posts the transcript if it was
// recording. Dofibot doesn't need to be in the call to notice it starting.
const { getVoiceConnection } = require('@discordjs/voice');
const config = require('./config');
const sms = require('./sms');
const speaker = require('./speaker');
const transcriber = require('./transcriber');

// Wait this long after the last person leaves before calling the call over,
// so someone whose connection drops for a moment doesn't end it.
const END_AFTER_MS = config.callEndDelaySeconds * 1000;

const calls = new Map(); // voice channel ID -> { startedAt, endTimer }

function humansIn(channel) {
  return channel ? channel.members.filter((m) => !m.user.bot).size : 0;
}

function onVoiceStateUpdate(oldState, newState) {
  if (newState.member?.user.bot) return; // ignore Dofibot itself
  if (oldState.channelId === newState.channelId) return; // muted/unmuted, not moved

  if (newState.channel) personJoined(newState.channel, newState.member);
  if (oldState.channel) personLeft(oldState.channel);
}

// When Dofibot starts, people may already be in a call. Keep track of those
// calls (without a "started" text) so the "ended" text still goes out.
function trackOngoingCalls(client) {
  for (const guild of client.guilds.cache.values()) {
    for (const channel of guild.channels.cache.filter((c) => c.isVoiceBased()).values()) {
      if (humansIn(channel) > 0) {
        calls.set(channel.id, { startedAt: Date.now(), endTimer: null });
        console.log(`Call already going on in "${channel.name}" when Dofibot started; will text when it ends.`);
      }
    }
  }
}

function personJoined(channel, member) {
  const call = calls.get(channel.id);
  if (call) {
    if (call.endTimer) console.log(`Someone rejoined "${channel.name}" in time; same call.`);
    clearTimeout(call.endTimer); // back before the call was ended: same call
    call.endTimer = null;
    return;
  }

  calls.set(channel.id, { startedAt: Date.now(), endTimer: null });
  if (humansIn(channel) !== 1) return; // joined a call we somehow missed; no "started" text

  const name = member?.displayName || 'Someone';
  console.log(`Call started in "${channel.name}" by ${name}.`);
  sms.sendSms(`Dofibot: ${name} started a call in "${channel.name}" on Discord (${channel.guild.name}).`);
}

function personLeft(channel) {
  const call = calls.get(channel.id);
  if (!call || humansIn(channel) > 0 || call.endTimer) return;

  console.log(`Everyone left "${channel.name}"; ending the call in ${END_AFTER_MS / 1000}s unless someone rejoins.`);
  call.endTimer = setTimeout(() => endCall(channel, call), END_AFTER_MS);
}

async function endCall(channel, call) {
  calls.delete(channel.id);
  const minutes = Math.max(1, Math.round((Date.now() - call.startedAt - END_AFTER_MS) / 60000));
  console.log(`Call in "${channel.name}" ended (about ${minutes} min).`);
  sms.sendSms(`Dofibot: The call in "${channel.name}" on Discord has ended (about ${minutes} min).`);

  // If Dofibot was left alone in this call, it leaves and posts the transcript.
  const connection = getVoiceConnection(channel.guild.id);
  if (connection && connection.joinConfig.channelId === channel.id) {
    await transcriber.stop(channel.guild);
    speaker.stop(channel.guild.id);
    connection.destroy();
  }
}

module.exports = { onVoiceStateUpdate, trackOngoingCalls };
