import { createFileRoute } from '@tanstack/react-router'
import { GuardError, guard } from '#/server/guard'
import { transcribe } from '#/server/stt'

const MAX_BYTES = 24000 * 2 * 15 + 44 // 15 s of 24 kHz mono 16-bit audio

export const Route = createFileRoute('/api/transcribe')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          guard('stt')
          const lang = new URL(request.url).searchParams.get('lang') === 'kk' ? 'kk' : 'en'
          const wav = await request.arrayBuffer()
          if (wav.byteLength < 1000) return Response.json({ text: '', provider: 'none', ms: 0 })
          if (wav.byteLength > MAX_BYTES) return Response.json({ error: 'Recording too long (15 s max).' }, { status: 413 })
          const started = performance.now()
          const result = await transcribe(wav, lang)
          return Response.json({ ...result, ms: Math.round(performance.now() - started) })
        } catch (e) {
          const status = e instanceof GuardError ? 429 : 502
          return Response.json({ error: (e as Error).message }, { status })
        }
      },
    },
  },
})
