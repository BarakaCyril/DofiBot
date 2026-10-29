# Step 3: Language test (for the tester)

About an hour: a 10-minute recording, then about 45 minutes to upload it and
review the transcript with the group. Website menus change sometimes, so a
button may have a slightly different name.

## Purpose

Find out how well ElevenLabs Scribe understands our English–Kiswahili–Sheng mix
**before** the coder builds live transcription. The result decides how much the
group relies on live transcripts versus summaries.

## Part A: Get consent (before the call)

1. In the group chat, tell everyone the plan: you'll record about 10 minutes of
   a normal call to test transcription. Only the group will see the result, and
   the recording is deleted afterwards.
2. Get a clear "yes" from **everyone** who'll be on the call. Anyone who says
   no just stays off that call.

## Part B: Record the call (10 min)

Talk normally. Don't switch to clean English for the test, or the result will
tell you nothing. Mixed sentences, slang, and talking over each other are
exactly what you want to test.

### Option 1 (recommended): the Craig recording bot in Discord

- Craig records each person on a separate track, which is the same way Dofibot
  will hear the call, so the test is more realistic.
- It shows everyone that recording is on.
- Ask the accounts person to add it to the test server from https://craig.chat.
  Then:
  1. Start the call in the voice channel.
  2. Type `/join` and choose Craig (not Dofibot).
  3. Talk for 10 minutes.
  4. Type `/stop`.
- Craig sends you a download link. Download both:
  - The **single mixed file** (MP3 or similar)
  - The **separate per-speaker tracks**

### Option 2: OBS on a laptop

1. Install OBS Studio from https://obsproject.com.
2. Make sure both **Desktop Audio** and **Mic** are on.
3. Join the call and click **Start Recording**. Click **Stop Recording** after
   10 minutes.
4. The video file is fine. ElevenLabs accepts video files, and you can also
   convert it to MP3.

## Part C: Upload to ElevenLabs Scribe (10 min)

Ask the accounts person to log you in, or to do this part with you.

1. Go to https://elevenlabs.io/app and open **Speech to Text**.
2. Upload the **mixed file**.
3. Set these options:
   - **Language: Auto-detect.** Don't choose Swahili or English. Dofibot will
     use auto-detect, so the test must too.
   - **Speaker labels (diarization): on**, with the number of speakers set to
     how many people were on the call.
4. Click **Transcribe** and wait a minute or two.
5. **Extra test (Craig only):** cut a 30-second clip from one person's track
   and upload it too. You can do this in Audacity, which is free. Dofibot will
   send audio in short chunks like this, and short clips can transcribe worse
   than long ones.

This uses some ElevenLabs credits, but 10 minutes of audio is a small amount.

## Part D: Review with the group (30 min)

Share the transcript on screen in a call, or paste it in the group chat. Then
fill in this table together:

| What to check | Score 1–5 | Example of a mistake |
|---|---|---|
| English parts | | |
| Kiswahili parts | | |
| Sheng words and slang | | |
| Sentences mixing languages | | |
| People's names | | |
| Right person labelled as speaking | | |
| Short 30-second clip (if tested) | | |

**Score key:** 5 = almost perfect, 3 = you can follow it with some guessing,
1 = unreadable.

Also answer these:

- Could someone who wasn't on the call **understand what was discussed** from
  the transcript alone?
- Which Sheng words did it get wrong? List a few. The coder can use them later
  to improve accuracy.

## Part E: Decide

| Result | What it means |
|---|---|
| Mostly 4–5 | Build live transcription as planned (step 6). |
| Mostly 3 | Build it, but expect people to rely more on `/catchup` summaries than on reading the live transcript. |
| Mostly 1–2 | Live transcription won't be useful on its own. Tell the coder to make summaries the main feature, and keep the live transcript simple or optional. |

## Part F: Report and clean up

1. Send the coder the filled-in table, the decision, and the list of Sheng words
   it got wrong. You could open a GitHub issue titled "Step 3 language test
   results" on https://github.com/BarakaCyril/DofiBot.
   - **Don't post the full transcript or the recording on GitHub.** They
     contain your friends' private conversation.
2. Delete the recording from your laptop and from Craig.
3. Delete the transcript from your ElevenLabs history.
4. Tell the group it's been deleted.

## Done when

The group has agreed on one of the three decisions in Part E.
