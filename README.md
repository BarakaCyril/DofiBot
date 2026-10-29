# Dofibot

A Discord bot for our friend group's voice calls. People who can't talk (for
example, at work) can still take part:

- Type in `#silent-seat` and the bot speaks your message in the call.
- Use `/transcribe start` and `/transcribe stop`: Dofibot records the call in between, then posts the whole conversation to `#transcript`.
- The bot summarizes the call on demand (`/catchup`) and at the end (`/recap`).

Calls mix English, Kiswahili and Sheng, so language detection stays on auto.

See [CLAUDE.md](CLAUDE.md) for the full plan and current status, and
[READMI.txt](READMI.txt) for who does what. Account setup is in
[docs/step2-accounts.md](docs/step2-accounts.md), and the language test is in
[docs/step3-language-test.md](docs/step3-language-test.md).

## Running it on your laptop

1. Install [Node.js](https://nodejs.org) 22 or newer.
2. Install the dependencies:
   ```
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in the keys. Ask the accounts
   person for them privately. Never commit `.env`.
4. Register the slash commands with the test server. Run this once, and again
   whenever a command is added or changed:
   ```
   npm run deploy
   ```
5. Start the bot:
   ```
   npm start
   ```
   You should see `Dofibot is online as ...`.

## Commands

| Command | What it does |
|---|---|
| `/join` | Dofibot joins the voice channel you're in and posts a transcription notice |
| `/leave` | Dofibot leaves the voice channel |
| `/myvoice` | Pick your voice (start typing a name). Leave it empty to see your current voice |
| `/clonemyvoice` | Upload 1–2 minutes of yourself talking (and confirm it is your voice). Dofibot then speaks your messages in your own voice. Only you can use your clone |
| `/transcribe start` | Start recording the call (off by default, to save credits). Nothing is written to disk |
| `/transcribe stop` | Stop recording. Dofibot transcribes the whole conversation and posts it to `#transcript`. `/leave` does the same |

Anything typed in `#silent-seat` while Dofibot is in the call is spoken as
"*Name* says: …". Dofibot reacts 🔊 once it's spoken, or ❌ if it failed. Messages over
1,000 characters are cut off. Long messages are spoken in pieces, so the first
sentence starts playing while the rest is still being generated.

Whose voice is used: the voice you picked with `/myvoice`; if you haven't picked
one, your own cloned voice (from `/clonemyvoice`); otherwise the default voice.

To add more voices (for example Kenyan ones), the accounts person adds them to
"My Voices" from the ElevenLabs Voice Library on the website. They show up in
`/myvoice` within 10 minutes.

## After a call

When recording stops, Dofibot posts the raw transcript to `#transcript` straight
away. If `GEMINI_API_KEY` is set, Gemini (Google) then rewrites it so someone who
wasn't on the call can follow it (same English/Kiswahili/Sheng mix, slang
explained, transcription mistakes fixed) and Dofibot posts that too.

When everyone leaves the voice channel for a minute, the call counts as over:
Dofibot leaves, and if it was recording, it posts the transcript.

## SMS alerts

If the Africa's Talking settings in `.env` are filled in, Dofibot texts the
numbers in `SMS_TO` when a call starts (first person joins) and ends.
Dofibot doesn't need to be in the call for this. After a call, it also texts the
cleaned-up transcript (without timestamps), in parts of up to 760 characters.
To keep costs down it sends at most `SMS_MAX_PARTS` parts (default 3) per
person; the rest is in Discord. WhatsApp is planned for later.

## Project layout

```
src/
  index.js            starts the bot and runs commands
  config.js           reads .env and checks required keys are set
  deploy-commands.js  registers slash commands with Discord
  elevenlabs.js       text-to-speech and voice list from ElevenLabs
  speaker.js          plays audio in the call, one clip at a time
  silentSeat.js       speaks messages typed in #silent-seat
  voiceChoices.js     remembers each person's /myvoice pick (data/voices.json)
  transcriber.js      records each speaker, transcribes on stop with Scribe, posts to #transcript
  transcript.js       the current call's transcript, in memory only
  refiner.js          cleans up the transcript with Gemini (Google API)
  callWatcher.js      notices calls starting/ending: SMS alerts, auto-leave
  sms.js              sends SMS through Africa's Talking
  commands/
    index.js          list of all commands
    join.js           /join
    leave.js          /leave
    clonemyvoice.js   /clonemyvoice
    myvoice.js        /myvoice
    transcribe.js     /transcribe start, /transcribe stop
```
