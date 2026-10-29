# Step 2: Accounts and keys (for the accounts & money person)

About 45 minutes. Websites change their menus sometimes, so a button may have a
slightly different name.

## Part A: Discord test server (about 5 min)

1. In Discord, click **+** in the left sidebar, choose **Create My Own**, and
   name the server something like "Dofibot Test".
2. Create these channels:
   - A text channel called `#silent-seat`
   - A text channel called `#transcript`
   - A voice channel called "Call"
3. Turn on Developer Mode: **User Settings → Advanced → Developer Mode**.
4. Right-click the server icon and choose **Copy Server ID**. Save it: this is
   the `DISCORD_GUILD_ID`.

## Part B: The bot in the Discord Developer Portal (about 10 min)

1. Go to https://discord.com/developers/applications and click
   **New Application**. Name it "Dofibot".
2. On **General Information**, copy the **Application ID**. This is the
   `DISCORD_CLIENT_ID`.
3. Go to the **Bot** tab:
   - Click **Reset Token**, then copy the token. **It is shown only once.**
     This is the `DISCORD_TOKEN`, and it's a secret.
   - Turn **Public Bot** off, so only you can add the bot to servers.
   - Under Privileged Gateway Intents, turn **Message Content Intent** on. The
     bot needs it to read what people type in `#silent-seat`.
4. Go to **OAuth2 → URL Generator**:
   - Under Scopes, tick `bot` and `applications.commands`.
   - Under Bot Permissions, tick View Channels, Send Messages, Read Message
     History, Embed Links, Connect, and Speak.
   - Open the generated link at the bottom, choose the test server, and click
     **Authorize**.
5. Check that the bot now appears (offline) in the test server's member list.

## Part C: ElevenLabs (about 10 min)

1. Sign up at https://elevenlabs.io.
2. **Choose a plan.** The free plan is fine for a first try, but it has limits
   on API use and on library voices (for example, Kenyan-accented ones). The
   cheapest paid plan (Starter) is the safe choice for daily use. Check the
   current prices on their pricing page.
3. **Leave usage-based billing (overage) off.** Then the bot stops when the
   monthly credits run out, instead of charging you more. This is your
   spending limit.
4. Go to **Developers → API Keys** (sometimes under your profile → API Keys)
   and create a key named "dofibot":
   - If it lets you restrict the key, allow only **Text to Speech**,
     **Speech to Text**, and **Voices (read and write)**. Write is needed for
     `/clonemyvoice`.
   - If it lets you set a credit limit on the key, set one.
5. Copy the key. This is the `ELEVENLABS_API_KEY`.

## Part D: Grok (xAI) for transcript clean-up (about 10 min)

1. Sign up at https://console.x.ai.
2. Under **Billing**, add a payment method and buy a small amount of prepaid
   credit, for example $5–10. Clean-ups are cheap, so this will last a while.
3. If there's a spending limit setting, set a **monthly limit** of around $10
   and leave auto top-up off.
4. Under **API Keys**, create a key named "dofibot" and copy it. This is
   the `XAI_API_KEY`.

## Part E: Hand the keys to the coder (5 min)

Send these to the coder **privately**:

| Name | Secret? |
|---|---|
| `DISCORD_TOKEN` | **Yes** |
| `ELEVENLABS_API_KEY` | **Yes** |
| `XAI_API_KEY` | **Yes** |
| `DISCORD_CLIENT_ID` | No |
| `DISCORD_GUILD_ID` | No |

- Good ways to send them: in person, a password manager's share feature (for
  example, a Bitwarden Send link that expires), or a direct message you delete
  afterwards.
- **Never** post them in the WhatsApp group, a Discord channel, GitHub, or a
  screenshot.
- If a key ever leaks, create a new one straight away and delete the old one.
  For the Discord token, that means clicking Reset Token again.

## Part F: Ongoing money jobs

- Check the ElevenLabs and xAI (Grok) usage pages once a month.
- Agree with the group how costs are split.
- Keep a short note of which plan each service is on and when it renews.

## Done when

The coder puts the keys in `.env` (copied from `.env.example`) and runs
`npm start`. If it prints `Dofibot is online as …`, step 2 is done.
