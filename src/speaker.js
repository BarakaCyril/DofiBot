// Plays audio in the voice call, one clip at a time, in the order messages
// arrived. Each server gets its own queue.
const { Readable } = require('node:stream');
const {
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
  AudioPlayerStatus,
  StreamType,
} = require('@discordjs/voice');

const queues = new Map(); // guildId -> { player, clips: [], busy }

function getQueue(guildId) {
  if (!queues.has(guildId)) {
    const player = createAudioPlayer();
    const queue = { player, clips: [], busy: false };
    player.on(AudioPlayerStatus.Idle, () => playNext(guildId));
    player.on('error', (error) => console.error('Audio player error:', error.message));
    queues.set(guildId, queue);
  }
  return queues.get(guildId);
}

// audio is a Promise of an Ogg Opus Buffer, so speech can be generated while the
// previous clip is still playing.
function enqueue(guildId, audio) {
  const queue = getQueue(guildId);
  queue.clips.push(audio);
  if (!queue.busy) playNext(guildId);
}

async function playNext(guildId) {
  const queue = getQueue(guildId);
  const next = queue.clips.shift();
  if (!next) {
    queue.busy = false;
    return;
  }
  queue.busy = true;

  let audio;
  try {
    audio = await next;
  } catch {
    // The message handler already reported this failure; skip to the next clip.
    return playNext(guildId);
  }

  const connection = getVoiceConnection(guildId);
  if (!connection) {
    stop(guildId);
    return;
  }
  connection.subscribe(queue.player);
  queue.player.play(createAudioResource(Readable.from(audio), { inputType: StreamType.OggOpus }));
}

// Drops anything waiting to be spoken (used when Dofibot leaves the call).
function stop(guildId) {
  const queue = queues.get(guildId);
  if (!queue) return;
  queue.clips = [];
  queue.busy = false;
  queue.player.stop(true);
}

module.exports = { enqueue, stop };
