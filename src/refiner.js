// Turns the raw call transcript into a cleaned, readable version with Gemini
// (Google), for someone who wasn't on the call.
// Docs: https://ai.google.dev/api/generate-content
const config = require('./config');

const API = 'https://generativelanguage.googleapis.com/v1beta/models';

const INSTRUCTIONS = `You clean up transcripts of voice calls between a group of friends in Kenya.
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
  try {
    return await requestCleanup(rawText);
  } catch (error) {
    // Try once more after 5 seconds, in case the internet connection blipped.
    console.error('Gemini clean-up failed, retrying in 5 seconds:', error.message);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return requestCleanup(rawText);
  }
}

// The answer is streamed back piece by piece, so long transcripts don't hit
// request time limits.
async function requestCleanup(rawText) {
  const response = await fetch(`${API}/${config.geminiModel}:streamGenerateContent?alt=sse`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': config.geminiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: INSTRUCTIONS }] },
      contents: [{ role: 'user', parts: [{ text: rawText }] }],
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
    throw new Error('Gemini declined to clean up this transcript');
  }
  if (!text) throw new Error('Gemini returned an empty answer');
  if (finishReason === 'MAX_TOKENS') {
    return `${text}\n[The cleaned transcript was cut off here because the call was very long.]`;
  }
  return text;
}

module.exports = { isEnabled, refineTranscript };
