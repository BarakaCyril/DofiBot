# Silent Seat: Discord call bot for a friend group

## What we're building
A Discord bot for our friend group's voice calls. It lets people who can't talk
(for example, at work) stay part of the call:
- They type messages, and the bot speaks them aloud in the call.
- The bot transcribes the call live so they can read instead of listen.
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
- Summaries: Anthropic API (Claude)
- Secrets: `.env` file only. Never commit keys. `.env` must be in `.gitignore`.
- Hosting: laptop during development, then a small Linux VPS with pm2.

## Features
### Core (v1)
- `/join` and `/leave`: bot enters/exits the voice channel. On join, it posts a
  notice that it may transcribe.
- `#silent-seat` channel: messages typed here are spoken in the call, prefixed
  with the sender's name ("Brian says…").
- `/myvoice`: each person picks their own ElevenLabs voice.
- Live transcription: capture each speaker's Discord audio stream separately
  (gives speaker labels), send ~20–30 second chunks to Scribe, post to `#transcript`.
  Only run transcription while someone is in silent mode, to control cost.
- `/catchup <minutes>`: summarize the last N minutes.
- `/recap`: runs automatically when the call ends. Main topics, plans, and who
  promised to do what.

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
   Anthropic API key. Set spending limits on paid services.
3. Language test FIRST: record 10 minutes of a real call (with consent), upload to
   ElevenLabs Scribe on the web, and check how it handles our Sheng/Kiswahili mix.
4. Bot joins and leaves a voice channel.
5. Silent voice feature (`#silent-seat` → ElevenLabs → play in call), then `/myvoice`.
6. Live transcription to `#transcript`.
7. Summaries: `/catchup` and `/recap`.
8. Privacy: `/pause`, `/resume`, automatic deletion.
9. Test with the whole group in the test server, fix top complaints, move to main server.
10. Host on a VPS with pm2.
11. Extras.

## Current status
Step 1 in progress.
- Done: language decided (JavaScript, discord.js + @discordjs/voice).
- Done: GitHub repo created: https://github.com/BarakaCyril/DofiBot
- Done: `.gitignore` added (excludes `.env`, `node_modules/`).
- To do: decide who codes, who tests, who handles accounts and money.

Rough timeline (one person coding on weekends): steps 1–5 ≈ 2 weekends,
steps 6–8 ≈ 2 weekends, testing and hosting ≈ 1 weekend. About a month to daily use.

Step 3 fallback: if Scribe badly garbles our Sheng/Kiswahili mix, lean on
summaries more than the live transcript.

## Working notes for Claude Code
- Build one step at a time and get each working before starting the next.
- Keep the code simple enough for a hobby developer to maintain.
- Never print or log API keys.
