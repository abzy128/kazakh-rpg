import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { EMOTIONS, NPC_IDS } from '#/game/engine/types'
import type { Emotion, NpcId } from '#/game/engine/types'
import { GuardError, guard } from '#/server/guard'
import { synthesize, ttsAvailable } from '#/server/tts'

const Body = z.object({
  text: z.string().min(1).max(600),
  lang: z.enum(['en', 'kk']),
  npcId: z.enum(NPC_IDS as [NpcId, ...NpcId[]]),
  emotion: z.enum(EMOTIONS as [Emotion, ...Emotion[]]),
})

export const Route = createFileRoute('/api/tts')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // 501 tells the client to fall back to the browser's own speech synthesis.
        if (!ttsAvailable()) return new Response('TTS not configured', { status: 501 })
        try {
          guard('tts')
          const { text, lang, npcId, emotion } = Body.parse(await request.json())
          const upstream = await synthesize(text, lang, npcId, emotion)
          return new Response(upstream.body, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' } })
        } catch (e) {
          const status = e instanceof GuardError ? 429 : 502
          return new Response((e as Error).message, { status })
        }
      },
    },
  },
})
