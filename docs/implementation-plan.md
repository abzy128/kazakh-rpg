# Implementation plan (MVP)

How to build the MVP in [mvp-plan.md](mvp-plan.md) before the deadline. Written Oct 27, 2026.

## Status (Oct 27, night)

**Built and tested:**

- The whole day can be played: Боран, Қонақ, Қансонар and the Бата finale. The day-by-day items through Nov 1 are in place in a first version.
- **Game master:** works with all seven tools, quest-graph validation and the GM log. `bun run eval:gm` passes 7 of 7 scenarios. Engine tests pass.
- **Voice:** Muse Voice Transcribe push-to-talk works. Soniox TTS is wired in and falls back to browser speech until `SONIOX_API_KEY` is set.
- **Finale:** the chronicle agent and the Muse Image painting work.
- **Art:** Muse Image portraits and title art.
- **Production:** `server.ts` and a `Dockerfile`; no keys in the client bundle.
- A headless end-to-end run (talk to Ата, agree to herd, seat the guest at the төр) passes with no errors.

**Different from the plan:**

- All 3D models are procedural, not glTF. That's license-free and fast to iterate.
- Portraits keep their painted backgrounds; the SAM cutouts aren't done.

**Still to do, in order:**

1. Get a Soniox key and cast the voices; the names in `npcs.ts` are placeholders.
2. Run the Kazakh STT test with real speech.
3. Have a native speaker review `customs.md` and the Kazakh UI strings.
4. Deploy, add billing, then playtest.
5. Latency pass: streaming, then the realtime STT proxy.
6. Ambient audio.
7. Optionally swap in rigged glTF animals and characters, and add SAM cutouts.
8. Demo video and submission.

## Verified so far

Tested against the live APIs with `META_AI_API_KEY` from `.env`, and from the docs:

- **Meta Model API** is OpenAI-compatible at `https://api.meta.ai/v1` (Responses, Chat Completions, Anthropic Messages). The key can use `muse-spark-1.3`, `muse-spark-1.2`, `muse-wonder-1.0`, `muse-image-1.0`, `muse-voice-transcribe-1.0`, `sam-3.1` and the Contributor variants.
- **Muse Spark 1.3 works as the game master.** One Responses API call with function tools at `reasoning: {effort: "minimal", summary: "auto"}` took 3.6 s. In it, Ata scolded the player for seating the guest by the door and asking his business before feeding him, and called `adjust_standing(-1)`. The response also carried a one-line reasoning summary and a short narration message. `effort: "low"` took 6.3 s, too slow for every turn. A plain NPC reply with no tools takes ~1.9 s, and its Kazakh is fluent.
- **`tool_choice` only accepts `"auto"`**, so the model can't be forced to call `npc_say`. Handle a turn without it by using the message text as the line, or retry once. `reasoning_effort: "none"` isn't supported.
- **Muse Voice Transcribe doesn't list Kazakh** among its 25 languages. A synthetic Kazakh clip (macOS voice "Aru") came back in Cyrillic, with errors on Kazakh vowels: "…таңертең бүркітпен… бола ма?" became "…тәңертең біркітпен… болама?". With `languageBias: ["Turkish"]` the output switched to Latin script, so don't bias toward Turkish. Expect real speech to do worse than synthetic.
- **Transcription latency.** The file endpoint (`POST /v1/asr/transcribe`, WAV) took 2.0–3.0 s for a 4 s clip. The realtime WebSocket returned the final text 0.3 s after `endStream`, but its handshake took 2 s. It also takes the API key in its first frame and has no short-lived tokens, so the browser has to go through a server proxy.
- **Muse Image** costs $0.01 per image. `size` only sets the aspect ratio and `background` is ignored, so it can't produce transparency. SAM 3.1 can cut portraits out instead.
- **Soniox** (from the docs; there's no key yet):
  - TTS model `tts-rt-v2` speaks Kazakh (`kk`, Cyrillic only) with the same voices as English.
  - It takes English audio tags such as `[warm]`, `[stern]` and `[chuckles]`, and pronounces Cyrillic Kazakh words correctly inside English text.
  - REST endpoint `POST https://tts-rt.soniox.com/tts`: 100 requests/min, 3 concurrent, about $0.70 per hour of audio.
  - STT model `stt-rt-v5` supports Kazakh.
- **TanStack Start 1.169:**
  - Server functions take `.validator()`, and a route opts out of SSR with `ssr: false`.
  - API routes use `server.handlers`.
  - `vite build` emits `dist/client` plus a fetch handler at `dist/server/server.js` that needs a host.
- **Muse Code** reads `AGENTS.md`, `CLAUDE.md`, `.agents/AGENTS.md` or `.claude/CLAUDE.md`, taking the first it finds in each directory. Today that means both agents read `.claude/CLAUDE.md`.
- **Assets.** Quaternius's site moved to its own license (QAL v1.0, Aug 28, 2026), which forbids redistributing the files, even though its pack pages still say CC0. Older copies on Poly Pizza and OpenGameArt are labelled CC0.

**Deadline:** due Nov 4, 9:00 PM ET, which is Nov 5, 07:00 in Kazakhstan. Judging runs Nov 4–8, so the live demo must keep working, and keep being paid for, through then.

**Rubric:** Impact 30%, Meta AI tooling 25%, Technical depth 20%, Demo 25%. Demo covers whether it works, whether it holds up live, and the quality of the video.

## Decisions

These are the defaults; change any of them.

| Topic | Default | Why |
| --- | --- | --- |
| Setting | An 18th-century aul at its autumn camp, on the day of the first snow | All three quests fit one day: a blizzard (боран) threatens the herd and drives a traveler to your yurt, and the fresh snow opens eagle-hunting season (қансонар). You need to check it for anachronisms. |
| Game master | One Muse Spark 1.3 agent voices every NPC through tools. It uses the Responses API with `store: false` and `effort: "minimal"` per turn. | One source of truth for dialogue and consequences, and the reasoning summaries feed the on-screen GM log. |
| Model mode | Standard, not Contributor | Contributor mode lets Meta train on what players say. |
| State | Owned by the client (zustand, saved to localStorage). The server is stateless. | No database, easy deploy |
| English STT | Muse Voice Transcribe | Meta tooling score |
| Kazakh STT | Decide on day 1: record 10 real phrases and compare Muse Voice Transcribe with Soniox | Muse isn't built for Kazakh, but Muse Spark may cope with its errors. |
| TTS | Soniox `tts-rt-v2` behind a server route | Meta has no TTS. |
| Hosting | One long-lived Bun container (Railway or Fly) | It streams, can proxy the realtime STT socket, and in-memory rate limits just work. Cloudflare Workers is the alternative. |
| Look | Stylized low-poly 3D. Muse Image portraits, ornaments and textures carry the cultural detail. | Modelling period dress in 3D would eat the schedule. |

## Architecture

```text
Browser (React 19 + R3F)                          Server (TanStack Start; API keys stay here)
/play (ssr: false)                                gmTurn()          Muse Spark 1.3 + tools -> effects
  world: terrain, yurts, herd, weather  ───────▶  /api/transcribe   Muse Voice Transcribe | Soniox STT
  player + horse controller                       /api/tts          Soniox TTS -> audio stream
  NPCs, dialogue overlay, GM log        ◀───────  chronicle()       Muse Spark (bata) + Muse Image (painting)
  voice: mic -> 24 kHz PCM -> WAV                 guard             per-IP/session limits, kill switch
  store: game state (localStorage)
Build time: scripts/gen-art.ts   Muse Image -> SAM 3.1 cutouts -> public/generated/
```

Production uses a small `server.ts` with `Bun.serve`. It serves `dist/client` statically and passes everything else to the Start fetch handler. The realtime STT proxy will live there later.

```text
src/routes/           index.tsx (title, language, mic check) · play.tsx · lab.tsx (dev-only test bench)
                      api/transcribe.ts · api/tts.ts
src/server/           env · meta (OpenAI SDK, baseURL api.meta.ai) · soniox · stt · tts · guard
                      gm/prompt · gm/tools · gm/turn · gm/chronicle
src/game/engine/      pure, shared by client and server: types, applyEffects, quest-graph checks (bun test)
src/game/             state/ world/ actors/ controls/ dialogue/ voice/
src/content/aul-18c/  npcs · quests · voices · customs.md   (an era is data; a new era is a new folder)
scripts/              gen-art.ts · eval-gm.ts
public/               models/ audio/ generated/            CREDITS.md
```

## Game master

Every player input is a turn: speech, typed text, or an action such as "seated the guest by the door".

1. The server builds the prompt and makes one Muse Spark call.
2. It validates the tool calls against the quest graph.
3. It returns **effects**, which the client applies with the same pure engine.

| Tool (strict schema) | Effect |
| --- | --- |
| `npc_say(npc_id, text, emotion, translation_en, terms[])` | The spoken line. `emotion` becomes a Soniox tag. In English mode, Kazakh words stay in Cyrillic so TTS pronounces them; `terms` holds transliteration and meaning for the subtitles. |
| `adjust_standing(npc_id, ±1/±2, reason)` | A respect toast, e.g. "Ата approves: the guest sits at the төр" |
| `remember(text, importance)` | Adds to the memory log that later turns and the finale draw on |
| `advance_quest(quest_id, to_step)` | Rejected unless the quest graph allows it |
| `trigger_event(event)` | Only events whitelisted for the current step (guest arrives, storm begins, fox appears) |
| `teach(kk, translit, en, note)` | A word or custom card in the journal |
| `end_conversation(reason)` | The NPC closes the dialogue. |

**Prompt order.** Stable parts go first so prompt caching applies: rules, then `customs.md`, NPC personas and quest graphs. The changing parts follow: scene and quest state, memories, the dialogue so far, and the input, marked "speech transcript, may contain errors".

**Two speeds.**

- **Per turn:** one call at `effort: "minimal"`, with no tool results sent back.
- **Off the critical path:** multi-step runs at `effort: "medium"` with read tools (`recall(topic)`, `consult_customs(topic)`). These handle the finale, and, if there's time, a director between quests that tailors the next one to earlier choices.

**GM log.** An overlay, toggled with `` ` ``, shows each turn's reasoning summary, narration, tool calls, rejected effects and timings. It's the clearest way to show judges the agent working, so build it on day 1.

**Guard rails.**

- Validate every tool call, drop unknown events and clamp standing.
- Cap player input at 500 characters.
- Off-topic or "ignore your instructions" input gets an in-character answer.
- `scripts/eval-gm.ts` replays about 10 scripted scenarios and checks the tool calls: good etiquette, a rude player, Kazakh with transcription errors, and a jailbreak attempt.

## Voice

1. **Record.** Hold `V` or the mic button to talk; typing always works too. Capture mono 24 kHz audio with an AudioWorklet and write the WAV in the browser.
2. **Transcribe.** `POST /api/transcribe?lang=en|kk` goes to Muse Voice Transcribe in `PUSH_TO_TALK` mode.
   - In English mode, set `languageBias: ["English"]`.
   - Pass `keywords`: NPC names plus the scene's Kazakh terms.
   - Use Soniox for Kazakh instead if the day-1 test says so.
   - Show "heard: …" so the player can see what was understood.
3. **Decide.** `gmTurn` returns effects.
4. **Speak.** `POST /api/tts` calls Soniox with the NPC's voice and an emotion tag added on the server, and returns `audio/mpeg`. A client queue makes sure only one NPC speaks at a time.

To hide the wait, the NPC plays a listening or thinking animation and a pre-rendered "Хм…".

| Step | MVP | After the latency pass (Nov 2) |
| --- | --- | --- |
| Transcribe | 2–3 s (file upload) | ~0.3 s: realtime socket through the server, opened on key-down to hide the 2 s handshake |
| Game master | ~3.6 s | First sentence in ~1.5 s: stream the call and start TTS on the first full sentence of `npc_say.text` |
| TTS | ~1 s (estimate) | Play while the audio streams |
| **Total** | **~6–7 s** | **~2.5–3.5 s** |

## The day

**NPCs** (the names are yours to choose):

- **Ата**, the elder and eagle hunter, gives the quests and the final blessing.
- **Апа** runs the household and whispers hospitality hints when you hesitate.
- **The traveler**, caught by the storm, tests your hospitality and brings news.

Each one has a persona card, a Soniox voice and a Muse Image portrait.

**`customs.md`** is the knowledge base the GM grades against, and the main defence against invented customs. Write it yourself, in your own words:

- greeting
- helping the guest dismount
- the төр
- washing hands
- қонақасы
- serving the head (бас тарту)
- not asking a guest's business before the meal
- seeing the guest off
- weather signs
- berkut lore

| Quest | Play | The GM judges and teaches | Outcome |
| --- | --- | --- | --- |
| **Боран** (storm) | Ride out and push about 10 horses into the corral before the blizzard; the weather worsens on a timer | Weather signs, care of the herd | Ата reacts to how many you saved and how |
| **Қонақ** (guest) | The traveler arrives in the storm. Greet him, take his horse and bring him in. Inside, choose his seat, serve the meal, talk, and see him off. | Each custom above, from speech *and* actions | His warmth and his news depend on how you hosted him |
| **Қансонар** (hunt) | Ride out with Ата on the fresh snow. Approach the fox at a walk from downwind, then unhood and release the eagle | бүркіт, томаға, sharing the catch | A catch or a lesson |
| **Бата** (finale) | Evening by the fire | The chronicle agent looks back over your memories and writes a personal blessing in Kazakh with an English translation | The blessing is spoken aloud, with a Muse Image painting of your day |

Build Қонақ first, because it's the AI showcase; then Боран, then Қансонар. A dev menu jumps to any quest.

**English mode:** NPCs speak English mixed with Kazakh words. The Kazakh words are highlighted with transliteration and meaning, and `teach` collects them in the journal.

**Қазақша mode:** everything is in Kazakh, with an optional English subtitle line taken from `translation_en`.

Pick a UI font that covers ә ғ қ ң ө ұ ү һ і.

## World and assets

- **Terrain:** a ~400 m heightfield driven by a single `heightAt(x, z)` function and flattened around the aul. The same function places every actor, so there's no physics engine; yurts and props use circle colliders.
- **Sky and weather:** drei `Sky`, fog and lights. `weather` moves from clear to wind to storm, blending fog, light, snow particles and wind audio as it goes.
- **Yurt:** built procedurally: a wall cylinder, a domed roof, the шаңырақ ring and a carved door, all with Muse Image textures. The interior is a separate set you fade into, with the кереге lattice, roof poles, light through the шаңырақ and carpets. The төр and the seat by the door are clickable cushions.
- **Player:** a third-person controller. Press `E` to mount your horse; riding has walk and gallop speeds and a wider camera.
- **Herd:** steering behaviors (cohesion, separation, wander, flee from the rider) plus a counter at the corral gate.
- **Hunt:** a fox that flees, wind direction shown by the grass, and a scripted eagle flight curve.

**Assets.** Use CC0 unless noted. Record each one in `CREDITS.md` and keep the license file from every zip.

- **Animals:** the Quaternius "Animated Animal Pack" from Poly Pizza: glTF, CC0. The horse has Idle, Walk, Gallop and Eating; the fox and wolf share its rig. Sheep come from the Quaternius farm pack on Poly Pizza. Use these mirrors, not fresh quaternius.com downloads.
- **People:** Quaternius Universal Animation Library 1 and 2 (OpenGameArt mirrors), which include Sitting_Idle, Sitting_Talking and Idle_Talking, plus Universal Base Characters. If retargeting fights back, fall back to Kenney Mini Characters. No CC0 riding pose exists, so riders use Sitting_Idle.
- **Eagle:** no CC0 animated eagle exists. Check whether Quaternius Animal Pack Vol.2 (OpenGameArt) has a flap animation. Otherwise use Sherkiz's "Hawk Lp Rigged" (CC BY 3.0, credit required) or a procedural flapping bird.
- **Audio:** Freesound CC0 for wind, hooves, whinny, fire and the eagle cry. Avoid the Sonniss bundles: their license forbids redistributing the files.
- **Generated art:** `scripts/gen-art.ts` makes NPC portraits as one anchor image followed by a series referencing it, plus ornament textures (қошқар мүйіз), carpets, felt and title art. SAM 3.1 masks and `sharp` turn the portraits into transparent PNGs. The output is committed to `public/generated/`.

## Schedule

The line after each day is the check that the day is done.

**Tue Oct 27 (tonight): setup**

- [ ] Add `three @react-three/fiber @react-three/drei zustand openai zod`, and `test` (`bun test`) and `typecheck` scripts.
- [ ] Write `src/server/env.ts` and `meta.ts`. Keys stay server-only: never prefix them with `VITE_`, and import them only from server functions and routes.
- [ ] Create a Soniox account and put `SONIOX_API_KEY` in `.env`.
- [ ] Add project conventions to `.claude/CLAUDE.md`, which both agents read.
- [ ] The $150 Meta credits cover a 10-day window that may end before judging does. Check the expiry and add billing.

**Wed Oct 28: voice and GM slice, no 3D**

- [ ] Build `/lab`: push-to-talk, transcribe, `gmTurn`, TTS and playback, with a text box and the GM log.
- [ ] GM v0: the prompt, `customs.md` v0 (hospitality), Ата and the traveler, and the tools `npc_say`, `adjust_standing`, `remember`, `advance_quest` and `teach`.
- [ ] Kazakh STT test: record 10 phrases and compare Muse (no bias, then with keywords) against Soniox `kk`, checking each time whether Muse Spark still understood. Pick a provider.
- [ ] List the Soniox voices and cast the NPCs. Try the emotion tags in `kk` and in `en`.
- [ ] Deploy the bare app with `server.ts` to get the public URL. Thursday at the latest.

Done when a 5-turn voice conversation with Ата works in English and in Kazakh, with each step's latency logged.

**Thu Oct 29: world**

- [ ] Terrain, sky, fog and lights; 5 procedural yurts, a corral and a fire pit.
- [ ] Player controller and camera; the horse model; mounting and riding.

Done when you can walk the aul, mount up and gallop across the steppe at 60 fps on your laptop.

**Fri Oct 30: NPCs in the world, then Қонақ**

- [ ] NPC component (model, idle and talk animations, name tag), proximity prompt, and the dialogue overlay: portrait, subtitles with highlighted terms, mic, typing and "heard".
- [ ] A dialogue state machine (idle → listening → transcribing → thinking → speaking) on top of the day-1 pipeline.
- [ ] Quest engine, with effects going into the store, and the journal.
- [ ] Қонақ end to end, including the yurt interior and the seat and serving actions.

Done when Қонақ can be finished by voice in both languages and at least 3 customs are visibly judged.

**Sat Oct 31: Боран**

- [ ] Herd AI, corral counter, storm visuals and audio, timer, Ата's briefing and the conversation afterwards.

Done when herding stays fun for 2–3 minutes and the conversation afterwards mentions specifics.

**Sun Nov 1: Қансонар and Бата**

- [ ] The hunt: ride out with Ата, fox AI, approach, release, catch.
- [ ] The finale: chronicle agent, spoken blessing, painting and journal summary.

Done when the whole day plays in 10–12 minutes and the ending cites at least 3 of the player's choices.

**Mon Nov 2: art and latency**

- [ ] `gen-art.ts` (portraits, textures, SAM cutouts), ambient audio, Kazakh UI strings.
- [ ] Latency pass: stream the GM call and speak each sentence as it completes. Then the realtime STT proxy, if there's time.

Done when the median voice turn is 4 s or less.

**Tue Nov 3: hardening and playtests**

- [ ] Production deploy.
- [ ] Guards: per-IP and per-session turn limits, audio capped at 15 s, and a `DEMO_PAUSED` kill switch.
- [ ] Fallbacks so the day can always be finished:
  - If TTS fails, show subtitles only.
  - If STT fails, fall back to typing.
  - If the GM fails, play a canned line for the current quest step.
- [ ] Run `eval-gm.ts` and fix the prompts.
- [ ] Playtest with a native speaker (language and customs) and a non-speaker (clarity).

Done when a stranger finishes the day on the public URL without help.

**Wed Nov 4: ship**

- [ ] Feature freeze at noon.
- [ ] Demo video, 2–3 minutes:
  1. A hook on the steppe.
  2. A conversation in English.
  3. The same NPC in Kazakh.
  4. A hospitality mistake, with the GM log reacting.
  5. The storm.
  6. The blessing and the painting.
  7. An end card listing the Meta models.
- [ ] README: impact, a table of Meta models, the architecture, the non-Meta pieces and why, how to run it, credits, and notes on what Muse Code built.
- [ ] Submit on the evening of Nov 4, local time. The hard cutoff is 07:00 Nov 5.

**Cut line.** If Sunday slips, the hunt becomes a short cutscene followed by a conversation. Cut grass and polish before any of these, which are never cut:

- the voice loop
- typing
- the GM log
- Kazakh mode
- the finale
- the deploy

**Stretch, in order:**

1. Realtime STT. Its `ENDPOINTING` mode could remove push-to-talk altogether.
2. A director agent between quests.
3. A pronunciation coach: you repeat a word Ата teaches and `muse-spark-1.2` listens to the audio. 1.2 rather than 1.3, which the docs say is weaker on audio input.
4. A child NPC who quizzes you on what you learned.
5. Teaser cards for other eras (Saka, Altyn Orda…) with Muse Image art.
6. Muse Spark Open on Baseten for background villager chatter, aimed at the open-weights bonus.

## Meta models (for the README)

| Model | Use |
| --- | --- |
| Muse Spark 1.3 | Game master: tool calls every turn, reasoning summaries in the GM log, bilingual NPCs, the chronicle and the blessing |
| Muse Voice Transcribe | Player speech, biased toward Kazakh cultural vocabulary. Kazakh itself too, if the day-1 test passes. |
| Muse Image | Portraits, ornaments and textures at build time; the end-of-day painting at runtime |
| SAM 3.1 | Cuts generated portraits into transparent sprites, which Muse Image can't do |
| Muse Code | Part of the build. Note which features it wrote as you go (for example the yurt, herd AI or art pipeline). |

**Non-Meta:**

- Soniox TTS, because Meta has no TTS.
- Soniox STT for Kazakh, if needed, because Muse Voice Transcribe doesn't support Kazakh.

## Budget

- One GM turn costs about $0.002–0.008: roughly 5k input tokens, mostly cached, plus about 450 output.
- A full playthrough comes to about $0.20–0.40 including TTS, STT and the painting.
- Build-time art costs about $1.
- 300 playthroughs by judges and visitors would cost $60–120. Keep billing on, and set a daily cap in `guard`.

## Risks

| Risk | Mitigation |
| --- | --- |
| Turn latency | Thinking animations and filler now; streaming on Nov 2 |
| Kazakh STT quality | The day-1 test, with Soniox as the fallback |
| 3D scope | Stylized art, the dialogue loop first, and the cut line |
| The GM invents customs or anachronisms | `customs.md`, tool validation, `eval-gm.ts`, and a native-speaker playtest |
| Asset licenses | CC0 mirrors and `CREDITS.md` |
| Credits run out during judging | Billing and a daily cap |
| Microphone and autoplay rules | HTTPS everywhere; unlock audio on the Play click |
