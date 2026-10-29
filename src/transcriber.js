// Records the call between /transcribe start and /transcribe stop, then
// transcribes the whole conversation in one go and posts it to #transcript.
//
// How it works:
// - Discord gives us each speaker's audio separately, so we know who said what.
// - While recording, we keep each person's audio packets in memory, grouped
//   into "segments" (one per burst of talking) with the time each started.
// - On stop, each person's segments are joined into one MP3 (silences between
//   segments cut out, to save credits) and sent to ElevenLabs Scribe once.
// - Scribe returns every word with a timestamp. We map those back to real call
//   time, merge everyone's words in order, and post the conversation.
const { spawn } = require('node:child_process');
const { EndBehaviorType } = require('@discordjs/voice');
const { AttachmentBuilder } = require('discord.js');
const OpusScript = require('opusscript');
const ffmpegPath = require('ffmpeg-static');
const config = require('./config');
const { speechToText } = require('./elevenlabs');
const transcript = require('./transcript');
const refiner = require('./refiner');

const FRAME_MS = 20; // each Discord audio packet is 20ms
const GAP_SECONDS = 0.5; // silence placed between segments in the MP3
const NEW_LINE_AFTER_SECONDS = 3; // start a new transcript line after a pause this long

const recordings = new Map(); // guildId -> { startedAt, speakers: Map(userId -> [segments]) }

function isRecording(guildId) {
  return recordings.has(guildId);
}

function start(guildId) {
  recordings.set(guildId, { startedAt: Date.now(), speakers: new Map() });
}

// Listens to a voice connection. Call once after joining. Audio is only kept
// while a recording is running.
function listen(connection, guild) {
  connection.receiver.speaking.on('start', (userId) => {
    const recording = recordings.get(guild.id);
    if (!recording) return;
    if (connection.receiver.subscriptions.has(userId)) return; // already listening

    if (!recording.speakers.has(userId)) recording.speakers.set(userId, []);
    const segment = { startMs: Date.now() - recording.startedAt, packets: [] };
    recording.speakers.get(userId).push(segment);

    const opus = connection.receiver.subscribe(userId, {
      end: { behavior: EndBehaviorType.AfterSilence, duration: 1000 },
    });
    opus.on('data', (packet) => {
      // Discord sends nothing during short pauses. Fill them with silence
      // (null) so the audio stays in step with real time.
      const elapsed = Date.now() - recording.startedAt - segment.startMs;
      const missing = Math.floor((elapsed - segment.packets.length * FRAME_MS) / FRAME_MS) - 5;
      for (let i = 0; i < missing; i++) segment.packets.push(null);
      segment.packets.push(packet);
    });
    opus.on('error', (error) => console.error('Voice receive error:', error.message));
  });
}

// Stops recording, transcribes everything, and posts it. Returns the number
// of minutes recorded, or null if nothing was recording.
async function stop(guild) {
  const recording = recordings.get(guild.id);
  if (!recording) return null;
  recordings.delete(guild.id);
  const minutes = Math.max(1, Math.round((Date.now() - recording.startedAt) / 60000));

  const channel = guild.channels.cache.find(
    (c) => c.name === config.transcriptChannel && c.isTextBased()
  );
  if (!channel) {
    console.error(`No #${config.transcriptChannel} channel found to post the transcript.`);
    return minutes;
  }

  // Runs in the background so /transcribe stop can reply straight away.
  processRecording(recording, guild)
    .then((lines) => postTranscript(channel, recording.startedAt, lines))
    .catch(async (error) => {
      console.error('Transcription failed:', error);
      await channel.send(`❌ Sorry, transcribing the call failed: ${error.message}`).catch(() => {});
    });
  return minutes;
}

// Transcribes each speaker, then puts everyone's lines in call order. Each
// burst of talking stays together as one line, so people talking over each
// other doesn't jumble their words.
async function processRecording(recording, guild) {
  const bursts = [];

  for (const [userId, segments] of recording.speakers) {
    const member = guild.members.cache.get(userId)
      || await guild.members.fetch(userId).catch(() => null);
    const name = member?.displayName || 'Someone';

    const { mp3, segmentTimes } = await encodeSpeaker(segments);
    if (!mp3) continue;

    const bySegment = new Map(); // segment -> burst
    for (const word of await withRetry(() => speechToText(mp3))) {
      // Find which segment the word is in, and convert to real call time.
      const seg = segmentTimes.findLast((s) => s.mp3Start <= word.start) || segmentTimes[0];
      const time = seg.realStart + (word.start - seg.mp3Start);
      if (!bySegment.has(seg)) bySegment.set(seg, { name, time, endTime: time, words: [] });
      const burst = bySegment.get(seg);
      burst.words.push(word.text);
      burst.endTime = time;
    }
    bursts.push(...bySegment.values());
  }

  bursts.sort((a, b) => a.time - b.time);
  const lines = [];
  for (const burst of bursts) {
    const text = burst.words.join(' ');
    const last = lines[lines.length - 1];
    // Same person continuing after a short pause: keep it on one line.
    if (last && last.name === burst.name && burst.time - last.endTime < NEW_LINE_AFTER_SECONDS) {
      last.text += ' ' + text;
      last.endTime = burst.endTime;
    } else {
      lines.push({ name: burst.name, time: burst.time, endTime: burst.endTime, text });
    }
  }
  return lines.map(({ name, time, text }) => ({ name, time, text }));
}

// Joins one speaker's segments into an MP3 (16kHz mono, plenty for speech).
// Also returns where each segment starts in the MP3 and in the real call.
async function encodeSpeaker(segments) {
  const decoder = new OpusScript(48000, 2, OpusScript.Application.AUDIO);
  const silentFrame = Buffer.alloc(3840); // 20ms of 48kHz stereo silence
  const gap = Buffer.alloc(GAP_SECONDS * 16000 * 2);
  const parts = [];
  const segmentTimes = [];
  let mp3Seconds = 0;
  let spoken = 0;

  for (const segment of segments) {
    if (parts.length > 0) {
      parts.push(gap);
      mp3Seconds += GAP_SECONDS;
    }
    segmentTimes.push({ mp3Start: mp3Seconds, realStart: segment.startMs / 1000 });
    for (const packet of segment.packets) {
      let pcm = silentFrame;
      if (packet) {
        try {
          pcm = decoder.decode(packet);
          spoken++;
        } catch {
          // A damaged packet: use silence instead.
        }
      }
      parts.push(toMono16k(pcm));
      mp3Seconds += FRAME_MS / 1000;
    }
  }
  decoder.delete();

  if (spoken < 50) return { mp3: null, segmentTimes }; // under 1 second of speech
  return { mp3: await pcmToMp3(Buffer.concat(parts)), segmentTimes };
}

// 48kHz stereo -> 16kHz mono: each output sample averages 3 frames x 2 channels.
function toMono16k(stereo) {
  const samples = Math.floor(stereo.length / 12);
  const mono = Buffer.alloc(samples * 2);
  for (let i = 0; i < samples; i++) {
    let sum = 0;
    for (let j = 0; j < 6; j++) sum += stereo.readInt16LE(i * 12 + j * 2);
    mono.writeInt16LE(Math.round(sum / 6), i * 2);
  }
  return mono;
}

function pcmToMp3(pcm) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegPath, [
      '-loglevel', 'error',
      '-f', 's16le', '-ar', '16000', '-ac', '1', '-i', 'pipe:0',
      '-b:a', '48k', '-f', 'mp3', 'pipe:1',
    ]);
    const out = [];
    ffmpeg.stdout.on('data', (data) => out.push(data));
    ffmpeg.on('error', reject);
    ffmpeg.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(out));
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
    ffmpeg.stdin.end(pcm);
  });
}

// Tries once more after 5 seconds, in case the internet connection blipped.
async function withRetry(task) {
  try {
    return await task();
  } catch (error) {
    console.error('Failed, retrying in 5 seconds:', error.message);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return task();
  }
}

// Posts the raw transcript straight away, then a cleaned-up version from
// Gemini (if a Gemini key is set), which takes a little longer.
async function postTranscript(channel, startedAt, lines) {
  transcript.set(channel.guild.id, lines);

  const startUnix = Math.floor(startedAt / 1000);
  const header = `📝 **Call transcript** (recording started <t:${startUnix}:t>)`;
  if (lines.length === 0) {
    await channel.send(`${header}\nNobody said anything I could transcribe.`);
    return;
  }

  const text = lines
    .map((line) => `[${clock(line.time)}] ${line.name}: ${line.text}`)
    .join('\n');
  await postText(channel, header, text, 'transcript.txt');

  if (!refiner.isEnabled()) return;
  const working = await channel.send('✨ Cleaning up the transcript so it reads well. This takes a minute…');
  try {
    const cleaned = await refiner.refineTranscript(text);
    transcript.setCleaned(channel.guild.id, cleaned);
    await postText(channel, `✨ **Cleaned-up transcript** (recording started <t:${startUnix}:t>)`, cleaned, 'cleaned-transcript.txt');
  } catch (error) {
    console.error('Cleaning up the transcript failed:', error);
    await channel.send(`❌ Sorry, cleaning up the transcript failed: ${error.message}`).catch(() => {});
  }
  await working.delete().catch(() => {});
}

// Short text goes in as Discord messages; long text as a .txt file.
async function postText(channel, header, text, fileName) {
  if (text.length <= 3 * 1900) {
    // Split into Discord-sized messages on line breaks.
    const messages = [header];
    for (const line of text.split('\n')) {
      if (messages[messages.length - 1].length + line.length + 1 > 1900) messages.push('');
      messages[messages.length - 1] += '\n' + line;
    }
    for (const content of messages) {
      await channel.send({ content, allowedMentions: { parse: [] } });
    }
  } else {
    await channel.send({
      content: `${header}\nIt's long, so here it is as a file.`,
      files: [new AttachmentBuilder(Buffer.from(text, 'utf8'), { name: fileName })],
    });
  }
}

// Seconds since the start -> "mm:ss" (or "h:mm:ss").
function clock(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(s / 60) % 60).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return s >= 3600 ? `${Math.floor(s / 3600)}:${mm}:${ss}` : `${mm}:${ss}`;
}

module.exports = { listen, start, stop, isRecording };
