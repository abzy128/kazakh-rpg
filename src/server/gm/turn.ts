import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { NpcId, StoryState } from '#/game/engine/types'
import { NPC_IDS } from '#/game/engine/types'
import { guard } from '../guard'
import { runTurn } from './run'

const npcId = z.enum(NPC_IDS as [NpcId, ...NpcId[]])

const TurnRequest = z.object({
  npcId,
  present: z.array(npcId).max(3),
  input: z.object({ kind: z.enum(['speech', 'text', 'action']), text: z.string().min(1).max(500) }),
  // The client owns the story state; the server only needs it to build the prompt and validate effects.
  state: z.custom<StoryState>((v) => {
    const s = v as StoryState
    return (
      !!s &&
      (s.lang === 'en' || s.lang === 'kk') &&
      Array.isArray(s.memories) &&
      s.memories.length <= 60 &&
      Array.isArray(s.dialogue) &&
      s.dialogue.length <= 60 &&
      JSON.stringify(s).length < 60_000
    )
  }, 'invalid state'),
})

export const gmTurn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => TurnRequest.parse(data))
  .handler(async ({ data }) => {
    guard('gm')
    if (!data.present.includes(data.npcId)) data.present.push(data.npcId)
    return runTurn(data.state, data.npcId, data.present, data.input)
  })
