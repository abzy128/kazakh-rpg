# Бір күн ауылда · A Day in the Aul

A voice-driven 3D role-playing game about Kazakh language and culture, built with Meta models.

You live one autumn day in an 18th-century Kazakh camp. You bring the horse herd in before a blizzard, host a traveler the storm drives to your yurt, and ride out with your grandfather's golden eagle on the first snow. You talk to everyone with your voice, in English or Kazakh. A game-master agent judges what you say and do against real customs, and the family remembers it. In the evening, the elder gives you a personal blessing (бата) and a painting of your day.

Built from scratch during the [Meta Global AI Developer Hackathon](https://cerebralvalley.ai/e/meta-ai-developer-hackathon/details) (Oct 27 – Nov 4, 2026). All code in this repo was written during the hackathon.

## How it uses Meta models

| Model | Use |
| --- | --- |
| **Muse Spark 1.3** | The game master. Each turn it takes your words or actions and acts only through tools: `npc_say`, `adjust_standing`, `remember`, `advance_quest`, `trigger_event`, `teach`, `end_conversation`. The engine checks every call against the quest graph, so the model can't skip gameplay. Reasoning summaries appear in the in-game GM log (press `` ` ``). The finale is a multi-step agent: it calls `recall` and `consult_customs` before it calls `compose_bata`. |
| **Muse Voice Transcribe** | Player speech, biased toward Kazakh cultural vocabulary such as қонақ, төр and бүркіт. |
| **Muse Image** | NPC portraits and title art at build time (`bun run gen:art`), and the end-of-day painting at runtime. |
| **Muse Code** | Part of the development. |

Not Meta:

- **[Soniox](https://soniox.com) TTS** voices the NPCs, because Meta has no text-to-speech model. It speaks Kazakh and English with the same voices. Without a key, the game falls back to the browser's speech synthesis.
- **Soniox STT** can optionally transcribe Kazakh (`KK_STT_PROVIDER=soniox`). Muse Voice Transcribe doesn't list Kazakh among its languages. It handled synthetic Kazakh reasonably, and the decision waits on tests with real speakers.

## Run it

```bash
bun install
cp .env.example .env   # add META_AI_API_KEY (and SONIOX_API_KEY for voices)
bun --bun run dev      # http://localhost:3000
```

Controls:

| Key | Action |
| --- | --- |
| WASD | Move |
| Shift | Run, or gallop when mounted |
| Drag the mouse | Look around |
| E | Talk or interact |
| F | Mount or dismount your horse |
| R | Release the eagle |
| Hold V | Speak (you can also type) |
| J | Journal |
| `` ` `` | Game-master log |
| F2 | Dev panel: jump to a quest or switch language |

`/lab` tests the voice and game-master loop without the 3D world.

## Scripts

| Command | What it does |
| --- | --- |
| `bun run test` | Engine unit tests (quest graph, effect validation) |
| `bun run eval:gm` | Replays scripted scenarios against Muse Spark and checks the tool calls: etiquette, rudeness, jailbreaks, Kazakh input with transcription errors |
| `bun run gen:art` | Generates portraits and title art with Muse Image |
| `bun run build && bun run start` | Production build, served by `server.ts` (Bun). A `Dockerfile` is included. |
| `bun run typecheck` | TypeScript |

## How it's built

- TanStack Start with React 19. The game route (`/play`) is client-only, built with React Three Fiber. Everything is procedural low-poly: terrain, grass, yurts, people, horses, fox and eagle.
- `src/game/engine` is pure and shared by client and server. It holds the story state, the effect types, and validation against the quest graph. The client owns the state (saved in localStorage), and the server is stateless.
- `src/server` holds every API key. Server functions run the game master and the finale; API routes stream TTS and accept recorded audio.
- `src/content/aul-18c` holds the era's content: NPCs, quests and `customs.md`, the knowledge base the game master grades against. A new era is a new folder.

See [docs/implementation-plan.md](docs/implementation-plan.md) for the plan and status, and [CREDITS.md](CREDITS.md) for assets.
