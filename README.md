# Dofibot

A Discord bot for our friend group's voice calls. People who can't talk (for
example, at work) can still take part:

- Type in `#silent-seat` and the bot speaks your message in the call.
- The bot transcribes the call live into `#transcript`.
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

Anything typed in `#silent-seat` while Dofibot is in the call is spoken as
"*Name* says: …". Dofibot reacts 🔊 once it's spoken, or ❌ if it failed.

To add more voices (for example Kenyan ones), the accounts person adds them to
"My Voices" from the ElevenLabs Voice Library on the website. They show up in
`/myvoice` within 10 minutes.

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
  commands/
    index.js          list of all commands
    join.js           /join
    leave.js          /leave
    myvoice.js        /myvoice
```
