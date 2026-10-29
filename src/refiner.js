// Uses Gemini (Google) to turn call transcripts into something readable for
// someone who missed the call: a cleaned-up transcript, a recap, a catch-up.
// Docs: https://ai.google.dev/api/generate-content
const config = require('./config');

const API = 'https://generativelanguage.googleapis.com/v1beta/models';

const INSTRUCTIONS = `You clean up transcripts of voice calls and meetings in Kenya, formal or casual.
The call mixes English, Kiswahili and Sheng, often in the same sentence.

The transcript was made by speech-to-text software, so expect mistakes,
especially on Sheng slang, names and places. Each line is "[mm:ss] Name: text".

Rewrite it so that someone who was NOT on the call can read it and understand
what happened:
- Keep the same language mix the speakers used. Do not translate into one language.
- Fix words that were clearly mis-transcribed when the context makes the right
  word obvious. If you can't tell what was said, write [unclear].
- If a Sheng word or phrase would confuse an outsider, add a short explanation
  in brackets after it, e.g. "tuko na mbogi (our group of friends)".
- Remove filler and false starts (um, eeh, repeated words) and crosstalk that
  adds nothing, but never drop anything of substance: plans, decisions,
  promises, questions, jokes that matter.
- Keep the speaker names and timestamps, and keep the order of the conversation.
- Never invent anything that isn't in the transcript.

Reply with only the cleaned transcript, one line per turn, in the format
"[mm:ss] Name: text". No introduction or closing remarks.`;

function isEnabled() {
  return Boolean(config.geminiKey);
}

// rawText: the transcript as posted to #transcript. Returns the cleaned text.
async function refineTranscript(rawText) {
  return askGemini(INSTRUCTIONS, rawText, 'cleaned transcript');
}

const RECAP_INSTRUCTIONS = `You summarise voice calls for people who missed them.
The call mixes English, Kiswahili and Sheng, often in the same sentence, and
the transcript was made by speech-to-text software, so expect mistakes
(especially on Sheng slang, names and places). Work out the meaning from context.

Write a short recap that someone who wasn't on the call can read in a minute.
Use the same English/Kiswahili/Sheng mix the speakers used, and briefly explain
any Sheng an outsider wouldn't understand. Use these sections, and leave out
any section that has nothing in it:

**Main topics**
- one line per topic

**Decisions and plans**
- what was agreed, with dates, times and places if mentioned

**Who promised to do what**
- Name: what they will do (and by when, if said)

**Still open**
- questions nobody answered, things still to decide

Keep it under 1,500 characters. Never invent anything that isn't in the
transcript. Reply with only the recap.`;

// A short recap of a whole call: topics, plans, who promised what.
async function summarizeCall(transcriptText) {
  return askGemini(RECAP_INSTRUCTIONS, transcriptText, 'recap');
}

const CATCHUP_INSTRUCTIONS = `Someone is in the middle of a voice call but couldn't
listen for the last few minutes. Tell them, very briefly, what they missed.
The call mixes English, Kiswahili and Sheng, and the transcript was made by
speech-to-text software, so expect mistakes; work out the meaning from context.

Reply in the same English/Kiswahili/Sheng mix the speakers used, as 2 to 6
short bullet points ("- ..."). Mention anything that involves a decision, a
plan, a question someone is waiting on, or a person by name. Keep it under
900 characters. Never invent anything. Reply with only the bullet points.`;

// A few bullet points on what was said in a short stretch of the call.
async function summarizeCatchup(transcriptText) {
  return askGemini(CATCHUP_INSTRUCTIONS, transcriptText, 'catch-up');
}

// Sends instructions plus text to Gemini and returns its answer. Tries once
// more after 5 seconds if it fails, in case the internet connection blipped.
async function askGemini(instructions, text, what) {
  try {
    return await requestGemini(instructions, text, what);
  } catch (error) {
    console.error(`Gemini ${what} failed, retrying in 5 seconds:`, error.message);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return requestGemini(instructions, text, what);
  }
}

// The answer is streamed back piece by piece, so long transcripts don't hit
// request time limits.
async function requestGemini(instructions, input, what) {
  const response = await fetch(`${API}/${config.geminiModel}:streamGenerateContent?alt=sse`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': config.geminiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: instructions }] },
      contents: [{ role: 'user', parts: [{ text: input }] }],
      generationConfig: { maxOutputTokens: 65536 },
    }),
  });
  if (!response.ok) {
    throw new Error(`Gemini request failed (${response.status}): ${await response.text()}`);
  }

  // Each streamed line looks like:
  // data: {"candidates":[{"content":{"parts":[{"text":"..."}]},"finishReason":"STOP"}]}
  let text = '';
  let finishReason = null;
  let leftover = '';
  const decoder = new TextDecoder();
  for await (const chunk of response.body) {
    const lines = (leftover + decoder.decode(chunk, { stream: true })).split('\n');
    leftover = lines.pop(); // may be an incomplete line; finish it next time
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const candidate = JSON.parse(line.slice(6)).candidates?.[0];
      for (const part of candidate?.content?.parts || []) {
        if (!part.thought) text += part.text || ''; // skip the model's private reasoning
      }
      finishReason = candidate?.finishReason || finishReason;
    }
  }

  text = text.trim();
  if (finishReason === 'SAFETY' || finishReason === 'PROHIBITED_CONTENT') {
    throw new Error(`Gemini declined to write the ${what}`);
  }
  if (!text) throw new Error('Gemini returned an empty answer');
  if (finishReason === 'MAX_TOKENS') {
    return `${text}\n[The ${what} was cut off here because the call was very long.]`;
  }
  return text;
}

module.exports = { isEnabled, refineTranscript, summarizeCall, summarizeCatchup };
