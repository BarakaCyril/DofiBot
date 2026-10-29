// The latest call transcript, kept in memory only.
// It's deleted after the recap (step 8).
const transcripts = new Map(); // guildId -> { lines: [{ name, time, text }], cleaned, recap }

function set(guildId, lines) {
  transcripts.set(guildId, { lines, cleaned: null, recap: null });
}

// The cleaned-up version from Gemini, once it's ready.
function setCleaned(guildId, cleaned) {
  const entry = transcripts.get(guildId);
  if (entry) entry.cleaned = cleaned;
}

// The short recap from Gemini, once it's ready.
function setRecap(guildId, recap) {
  const entry = transcripts.get(guildId);
  if (entry) entry.recap = recap;
}

function get(guildId) {
  return transcripts.get(guildId) || { lines: [], cleaned: null, recap: null };
}

function clear(guildId) {
  transcripts.delete(guildId);
}

module.exports = { set, setCleaned, setRecap, get, clear };
