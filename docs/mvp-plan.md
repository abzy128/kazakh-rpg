# MVP plan

Working notes for the Meta Global AI Developer Hackathon build (Oct 27 – Nov 4, 2026, Indie track).

## Concept

A three.js game where you live in a 15–18th century rural Kazakh settlement (aul). You ride horses, hunt and do everyday activities, and talk to NPCs by voice. A game-master agent remembers your choices and answers, and adapts what NPCs say and ask.

The pitch is a game with state, scenes and consequences, not a Q&A tutor. Organizers explicitly reject "simple AI for Education chatbots".

### Eras

MVP: 15–18th century rural settlement only.

Stretch goals, if time allows: Saka, Altyn Orda (Golden Horde), Kazakh eli (Kazakh Khanate), under the Russian Empire, USSR, modern Kazakhstan. Build the world and agent setup so a new era is mostly new data and assets, not new code. The demo can tease the other eras.

## Languages

English and Kazakh. English makes the game playable and reviewable by judges; Kazakh is the point of the project.

## Voice

| Need | English | Kazakh |
| --- | --- | --- |
| Speech → text | Muse Voice Transcribe | Try Muse Voice Transcribe first; fall back to Soniox STT if quality isn't good enough |
| Text → speech | Soniox | Soniox |

Meta has no TTS model, so Soniox fills a real gap. List it in the README as the one non-Meta piece and say why.

Keeping Muse Voice Transcribe in the loop matters for the "Use of Meta AI tooling" score (25%), which rewards using several Meta models.

## Meta models

- **Muse Spark** — game master agent and NPC dialogue.
- **Muse Voice Transcribe** — player speech to text (see above).
- **Muse Image** — textures, NPC portraits, scene art (Best Creative Build bonus).
- **Muse Code** — part of the coding work (see Tooling).
- Optional: Muse Spark Open via Baseten/Modal for the Best Open Weight Models bonus.

## Tech

- TanStack Start (this repo) hosts the app. The game is a client-only route built with React Three Fiber (three.js).
- Server functions call Muse and Soniox so API keys never reach the browser.
- Simple, arcade-style horse riding. No real physics.

## MVP scope

The risk is scope: an open world with riding and hunting is a lot for one person in 8 days, and a walking simulator won't win on its own. What makes the project stand out is the voice NPCs that react to your past choices. So:

1. **A small aul you can walk around.** A few yurts, a herd, steppe terrain. Mount a horse and ride.
2. **Three or four activities, each ending in a conversation:**
   - herding horses back before a storm
   - a hunt with a berkut (golden eagle) alongside an elder
   - hosting a guest in your yurt, using qonaqzhai (guest hospitality) customs
   - maybe: a small aitys, or a dispute brought to a biy (judge)
3. **A game-master agent** with tools (scene state, memory of the player's choices, scoring) that changes what NPCs say and ask. This is the angle for the Best Agentic Use-Case bonus, and what makes it a game rather than a tutor.

## Assets

- Models: CC0 low-poly packs (Quaternius, Kenney, Poly Pizza).
- Textures, portraits, 2D art: Muse Image.
- Nothing without clear rights. The rules require that the submission doesn't violate anyone's IP; that includes music, images and cultural content sources.

## Tooling and rules

From the [Official Rules](https://cerebralvalley.ai/e/meta-ai-developer-hackathon/details):

- Participants build with Meta AI products (Muse Spark, Glimmer, SAM 3 and others on the event page).
- The submission must be the participant's original work and solely owned by them. Third-party technical assistance is allowed as long as the components stay the participant's own work. Open source is allowed if licenses are followed and the submission builds on it.
- Nothing restricts which coding agents you use. Using Muse Code for real chunks of work and documenting it helps the Meta tooling score. Other agents (e.g. Claude Code) are fine alongside it.
- The $150 Meta Model API credits are valid for a 10-day development window.

Muse Code billing: authenticate with an API key (`META_API_KEY` or `muse auth set`) so usage is pay-as-you-go and draws from the Model API balance. Contributor mode (`MUSE_CONTRIBUTOR_MODE`) is 10–20× cheaper but lets Meta train on what you send; fine for this public repo, not for players' voice data. Use separate keys for Muse Code and the game backend to track spend.
