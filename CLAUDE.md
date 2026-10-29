# Dofibot: Discord call bot for a friend group

## What we're building
The bot is called **Dofibot** (`dofibot` in code and package names). The
`#silent-seat` channel keeps its name: it's a feature, not the bot's name.

A Discord bot for our friend group's voice calls. It lets people who can't talk
(for example, at work) stay part of the call:
- They type messages, and the bot speaks them aloud in the call.
- The bot records the call when asked and posts the whole transcript when stopped.
- The bot summarizes the call on demand and at the end.

We chose Discord because WhatsApp doesn't let bots join group calls.

## Language requirements
Our group mixes English, Kiswahili, and Sheng, often in the same sentence.
- Keep language detection on auto. Never lock to one language.
- Kiswahili is well supported by ElevenLabs. Sheng is not specifically supported,
  so expect transcription errors on slang. Summaries should be robust to messy transcripts.
- Summary prompts must say the call mixes English, Kiswahili, and Sheng.

## Stack
- Discord bot: discord.js + @discordjs/voice (JavaScript/Node)
- Text-to-speech: ElevenLabs API (auto language detection, Kenyan-sounding voices)
- Transcription: ElevenLabs Scribe (speech-to-text)
- Summaries and transcript clean-up: Gemini (Google Generative Language API,
  `streamGenerateContent` over plain fetch). Brian switched Anthropic → Grok → Gemini.
- Secrets: `.env` file only. Never commit keys. `.env` must be in `.gitignore`.
- Hosting: laptop during development, then a small Linux VPS with pm2.

## Features
### Core (v1)
- `/join` and `/leave`: bot enters/exits the voice channel. On join, it posts a
  notice that it only records if someone uses `/transcribe start`.
- `#silent-seat` channel: messages typed here are spoken in the call, prefixed
  with the sender's name ("Brian says…").
- `/myvoice`: each person picks their own ElevenLabs voice.
- `/clonemyvoice`: upload a recording (plus a required "it's my voice"
  confirmation) to clone your own voice. A cloned voice is usable only by its
  owner: the owner's Discord ID is stored in the voice's ElevenLabs description
  as `discord_user_id:<id>`. Clones without that tag are hidden from everyone.
  If the description also contains `dofibot_shared`, the owner has agreed that
  everyone may use it.
- Whole-call transcription (NOT live): `/transcribe start` records each
  speaker's Discord audio stream separately (gives speaker labels).
  `/transcribe stop` (or `/leave`) sends each speaker's full audio to Scribe
  once, merges everyone's speech in time order, and posts the whole
  conversation to `#transcript`. Brian chose this over live chunked
  transcription, which caused too many problems. Recording is off by default,
  to control cost.
- `/catchup <minutes>`: summarize the last N minutes.
- `/recap`: runs automatically when the call ends. Main topics, plans, and who
  promised to do what.
- Cleaned transcript (Brian's choice over a summary): after the raw transcript
  is posted, Gemini (`GEMINI_MODEL`, default `gemini-3.5-flash`, streaming, `src/refiner.js`) rewrites
  the whole conversation for an outsider, in the same English/Kiswahili/Sheng
  mix, slang glossed in brackets, mis-transcriptions fixed, `[unclear]` when
  unsure. Posted to `#transcript`; later also sent to WhatsApp.
- Call alerts (`src/callWatcher.js`): first person joins a voice channel = call
  started; empty for 60s = call ended. SMS via Africa's Talking now
  (`src/sms.js`, plain text, no emoji); WhatsApp via Africa's Talking later
  (it's a "Preview" API, needs a Meta-approved business number and templates,
  and a long transcript needs a reply-to-receive flow with a public webhook,
  so it waits for the VPS). On call end, Dofibot leaves and posts the
  transcript if it was recording.

### Privacy (required)
- `/pause` and `/resume`: anyone can stop transcription mid-call.
- Transcripts are kept in memory during the call and deleted automatically after
  the recap (retention period to be agreed by the group).

### Later (only after v1 is in daily use)
- Alerts when someone's name is mentioned or they're asked a question
- Quick reaction sounds
- Per-person settings

## Build plan
1. Roles and tools: decide who codes, tests, and handles accounts. Set up the GitHub repo.
2. Accounts: Discord test server, bot in Developer Portal, ElevenLabs API key,
   Gemini API key. Set spending limits on paid services.
3. Language test FIRST: record 10 minutes of a real call (with consent), upload to
   ElevenLabs Scribe on the web, and check how it handles our Sheng/Kiswahili mix.
4. Bot joins and leaves a voice channel.
5. Silent voice feature (`#silent-seat` → ElevenLabs → play in call), then `/myvoice`.
6. Whole-call transcription to `#transcript` (`/transcribe start` / `stop`).
7. Summaries: `/catchup` and `/recap`.
8. Privacy: `/pause`, `/resume`, automatic deletion.
9. Test with the whole group in the test server, fix top complaints, move to main server.
10. Host on a VPS with pm2.
11. Extras.

## Current status
Step 1 done (except naming the tester and accounts person).
- Done: language decided (JavaScript, discord.js + @discordjs/voice).
- Done: GitHub repo created: https://github.com/BarakaCyril/DofiBot
- Done: `.gitignore` added (excludes `.env`, `node_modules/`).
- Done: roles defined in `READMI.txt`. Brian is the coder; tester and
  accounts person still to be named.
- Done: Node project set up (`package.json`, `src/index.js`, `src/config.js`,
  `.env.example`, `README.md`). Bot logs in once `DISCORD_TOKEN` is set.
- Step 2 mostly done: Discord bot and ElevenLabs keys are in `.env`, and the
  bot logs in to the test server. Gemini key not needed until step 7.
- Step 3: guide for the tester in `docs/step3-language-test.md`. Moved: the
  group will run it after steps 4–8 are built, not before.
- Step 4 done: `/join`, `/leave`, `npm run deploy`, tested in a voice channel.
- Step 5 code written: `#silent-seat` messages spoken via ElevenLabs
  (`eleven_v3` by default, MP3 → ffmpeg-static → opusscript), `/myvoice` with
  autocomplete, choices saved in `data/voices.json` (gitignored). Committed.
- Step 6 code written (`src/transcriber.js`): while recording, Opus packets
  are kept in memory per speaker, grouped into segments (bursts of talk) with
  real start times; short pauses are padded with silence to stay in time. On
  stop: each speaker's segments → 16kHz mono MP3 via ffmpeg (0.5s gaps, real
  silences cut to save credits) → one Scribe call per speaker (`scribe_v1`,
  word timestamps, one retry) → words mapped back to call time → each burst
  kept as one line → sorted and posted as `[mm:ss] Name: text` (as a .txt
  file if long). Lines stored in `src/transcript.js` for step 7. Scribe kept
  (not Whisper/OpenAI). Tested with a simulated 2-person overlapping call;
  needs a live test. Ctrl+C while recording loses the recording.
- Step 7 note: `/catchup <minutes>` mid-call will need to transcribe the
  recording so far on demand, since there's no live transcript any more.
- Step 8 note: `/transcribe stop`/`start` already cover most of `/pause` and
  `/resume`; decide then whether separate commands are still needed.
- `/clonemyvoice` written (added during step 6 at Brian's request). Blocked
  until the accounts person gives the API key "Voices: Write"; the clone lock
  is tested against the real voice list. Cyril (Discord `creal_forreal`, ID
  1086340383388221520) gave explicit permission for everyone to use his clone
  (voice ID dBdz2HSq7conRgZ8oSO6). Its description is now
  `This is my voice discord_user_id:1086340383388221520 dofibot_shared`.
  The API key now has "Voices: Write", so `/clonemyvoice` can be tested.
- Speech fixes after group feedback: TTS now requests `opus_48000_64` (Ogg
  Opus) and plays it as `StreamType.OggOpus`, so nothing is re-encoded during
  playback. Long messages split at sentence ends (first piece ≤100 chars, then
  ≤250), generated one after another and queued in order; limit raised to
  1,000 chars (the old 400 cap was cutting messages off). People without a
  `/myvoice` pick automatically use their own clone.
- Step 7 started: transcript clean-up, SMS alerts and auto-leave written.
  Simulated join/leave tested.
  SMS tested: sandbox send accepted via the official `africastalking` library
  (sandbox messages only show in the AT simulator). The cleaned transcript is
  also texted (`sms.sendTranscript`: no timestamps, plain GSM characters,
  parts ≤690 chars + heading, max `SMS_MAX_PARTS` parts, default 3). Gemini clean-up tested on a sample: gemini-3.5-flash ~9s, good Sheng glosses.
  `/catchup` and `/recap` summaries not built yet.
- Brian's connection measured 10% packet loss and 26–434ms ping, with the same
  ElevenLabs request taking 5–34s. That causes the stutter and slow speech;
  the VPS (step 10) should fix it.
- ElevenLabs is on the Starter plan (40k characters/month, 10 voice slots). The API key can't
  read `/v1/models`; that's fine.

Rough timeline (one person coding on weekends): steps 1–5 ≈ 2 weekends,
steps 6–8 ≈ 2 weekends, testing and hosting ≈ 1 weekend. About a month to daily use.

Step 3 fallback: if Scribe badly garbles our Sheng/Kiswahili mix, lean on
summaries more than the raw transcript.

## Working notes for Claude Code
- Build one step at a time and get each working before starting the next.
- Don't start step 6 until Brian says to proceed.
- Keep the code simple enough for a hobby developer to maintain.
- Never print or log API keys.
