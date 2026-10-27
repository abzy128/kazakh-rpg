import { NPCS } from '#/content/aul-18c/npcs'
import type { Emotion, Lang, NpcId } from '#/game/engine/types'

// Plays NPC lines one at a time: Soniox via /api/tts, or the browser's speech synthesis when that is not configured.

let serverTts: boolean | null = null
let current: HTMLAudioElement | null = null

export async function speak(text: string, lang: Lang, npcId: NpcId, emotion: Emotion): Promise<number> {
  const started = performance.now()
  if (serverTts !== false) {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang, npcId, emotion }),
      })
      if (res.status === 501) serverTts = false
      else if (res.ok) {
        serverTts = true
        const url = URL.createObjectURL(await res.blob())
        const ttsMs = Math.round(performance.now() - started)
        await play(url)
        URL.revokeObjectURL(url)
        return ttsMs
      }
    } catch {
      // Fall through to browser speech.
    }
  }
  await browserSpeak(text, lang, npcId)
  return 0
}

export function stopSpeaking() {
  current?.pause()
  current = null
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
}

function play(url: string) {
  return new Promise<void>((resolve) => {
    const audio = new Audio(url)
    current = audio
    audio.onended = audio.onerror = audio.onpause = () => resolve()
    audio.play().catch(() => resolve())
  })
}

function browserSpeak(text: string, lang: Lang, npcId: NpcId) {
  return new Promise<void>((resolve) => {
    if (typeof speechSynthesis === 'undefined') return resolve()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang === 'kk' ? 'kk-KZ' : 'en-US'
    const voices = speechSynthesis.getVoices()
    const voice = voices.find((v) => v.lang.replace('_', '-').startsWith(lang === 'kk' ? 'kk' : 'en'))
    if (voice) u.voice = voice
    u.pitch = NPCS[npcId].pitch
    u.rate = 0.95
    u.onend = u.onerror = () => resolve()
    // Rough guard in case the browser never fires onend.
    setTimeout(resolve, 1500 + text.length * 90)
    speechSynthesis.speak(u)
  })
}
