import type { Lang } from '#/game/engine/types'
import { env } from './env'
import { META_BASE_URL } from './meta'

// Terms Muse Voice Transcribe should listen for. Kazakh words help even in English mode.
const KEYWORDS = ['Ата', 'Апа', 'қонақ', 'төр', 'бата', 'бүркіт', 'қансонар', 'боран', 'балам', 'ассалаумағалейкүм', 'жылқы']

export async function transcribe(wav: ArrayBuffer, lang: Lang): Promise<{ text: string; provider: string }> {
  if (lang === 'kk' && env.kkSttProvider === 'soniox') return { text: await sonioxTranscribe(wav), provider: 'soniox' }
  return { text: await metaTranscribe(wav, lang), provider: 'muse-voice-transcribe' }
}

async function metaTranscribe(wav: ArrayBuffer, lang: Lang) {
  const request = {
    model: env.sttModel,
    mode: 'PUSH_TO_TALK',
    audioEncoding: 'WAV',
    // Kazakh is not one of Muse Voice Transcribe's languages; biasing toward a related one (Turkish) yields Latin script,
    // so leave Kazakh unbiased and let the model detect it.
    ...(lang === 'en' ? { languageBias: ['English'] } : {}),
    keywords: KEYWORDS,
  }
  const form = new FormData()
  form.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }))
  form.append('audio', new Blob([wav], { type: 'audio/wav' }), 'speech.wav')
  const res = await fetch(`${META_BASE_URL}/asr/transcribe`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.metaKey}` },
    body: form,
  })
  if (!res.ok) throw new Error(`Muse Voice Transcribe ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const json = (await res.json()) as { transcript?: string }
  return (json.transcript ?? '').trim()
}

/** Soniox real-time STT over a server-side WebSocket, fed the whole clip and finalized. */
async function sonioxTranscribe(wav: ArrayBuffer): Promise<string> {
  const key = env.sonioxKey!
  const pcm = new Uint8Array(wav, 44)
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('wss://stt-rt.soniox.com/transcribe-websocket')
    let text = ''
    const timer = setTimeout(() => {
      ws.close()
      reject(new Error('Soniox STT timed out'))
    }, 20_000)
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          api_key: key,
          model: 'stt-rt-v5',
          audio_format: 'pcm_s16le',
          sample_rate: 24000,
          num_channels: 1,
          language_hints: ['kk'],
          context: { terms: KEYWORDS },
        }),
      )
      const chunk = 24000 * 2 * 0.25
      for (let i = 0; i < pcm.length; i += chunk) ws.send(pcm.subarray(i, i + chunk))
      ws.send(JSON.stringify({ type: 'finalize' }))
      ws.send('')
    }
    ws.onmessage = (ev) => {
      const msg = JSON.parse(String(ev.data)) as { tokens?: { text: string; is_final: boolean }[]; finished?: boolean; error_message?: string }
      if (msg.error_message) {
        clearTimeout(timer)
        reject(new Error(`Soniox STT: ${msg.error_message}`))
        return
      }
      for (const t of msg.tokens ?? []) if (t.is_final && t.text !== '<fin>' && t.text !== '<end>') text += t.text
      if (msg.finished) {
        clearTimeout(timer)
        resolve(text.trim())
      }
    }
    ws.onerror = () => {
      clearTimeout(timer)
      reject(new Error('Soniox STT connection failed'))
    }
    ws.onclose = () => {
      clearTimeout(timer)
      resolve(text.trim())
    }
  })
}
