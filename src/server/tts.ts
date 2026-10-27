import { NPCS } from '#/content/aul-18c/npcs'
import type { Emotion, Lang, NpcId } from '#/game/engine/types'
import { env } from './env'

const TAG: Record<Emotion, string> = {
  warm: '[warm]',
  stern: '[stern]',
  amused: '[chuckles]',
  worried: '[nervous]',
  calm: '[calm]',
  excited: '[excited]',
  sad: '[sad]',
}

export function ttsAvailable() {
  return !!env.sonioxKey
}

/** Soniox REST TTS. Returns the upstream response so the audio streams through to the browser. */
export async function synthesize(text: string, lang: Lang, npcId: NpcId, emotion: Emotion) {
  const res = await fetch('https://tts-rt.soniox.com/tts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.sonioxKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'tts-rt-v2',
      language: lang,
      voice: NPCS[npcId].voice,
      audio_format: 'mp3',
      // Audio tags must be English even in Kazakh text.
      text: `${TAG[emotion]} ${text}`,
    }),
  })
  if (!res.ok || !res.body) throw new Error(`Soniox TTS ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return res
}
