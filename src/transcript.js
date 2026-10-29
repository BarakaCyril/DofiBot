// The latest call transcript, kept in memory only.
// Summaries (step 7) read from here; it's deleted after the recap (step 8).
const transcripts = new Map(); // guildId -> [{ name, time, text }]

function set(guildId, lines) {
  transcripts.set(guildId, lines);
}

function get(guildId) {
  return transcripts.get(guildId) || [];
}

function clear(guildId) {
  transcripts.delete(guildId);
}

module.exports = { set, get, clear };
