import { gmTurn } from '#/server/gm/turn'
import type { NpcId, StoryState, TurnInput } from '#/game/engine/types'
import { useGame } from '#/game/state/store'
import { startRecording, stopRecording } from '#/game/voice/recorder'
import { speak, stopSpeaking } from '#/game/voice/speaker'

export function presentNpcs(story: StoryState): NpcId[] {
  const guestHere = story.quests.qonaq.status === 'active' || story.quests.qonaq.status === 'done'
  return guestHere && story.quests.qansonar.status !== 'active' ? ['ata', 'apa', 'guest'] : ['ata', 'apa']
}

let busy = false

/** One full turn: player input → game master → effects → spoken lines. */
export async function sendTurn(input: TurnInput, sttMs?: number) {
  const g = useGame.getState()
  const npcId = g.story.activeNpc
  if (!npcId || busy) return
  busy = true
  stopSpeaking()
  const state = g.story
  g.addPlayerLine(input.text, input.kind === 'action')
  g.setStatus('thinking')
  g.setError('')
  try {
    const result = await gmTurn({ data: { npcId, present: presentNpcs(state), input, state } })
    const log = { ...result.log, ms: { ...result.log.ms, stt: sttMs } }
    useGame.getState().apply(result.effects)
    let firstTts: number | undefined
    for (const effect of result.effects) {
      if (effect.type !== 'say') continue
      const lang = useGame.getState().story.lang
      useGame.getState().setSpeaking({ npcId: effect.npcId, text: effect.text, translationEn: effect.translationEn, terms: effect.terms })
      useGame.getState().setStatus('speaking')
      const ms = await speak(effect.text, lang, effect.npcId, effect.emotion)
      firstTts ??= ms
    }
    useGame.getState().pushLog({ ...log, ms: { ...log.ms, tts: firstTts } })
  } catch (e) {
    useGame.getState().setError(friendly(e))
  } finally {
    busy = false
    useGame.getState().setStatus('idle')
  }
}

export async function talkStart() {
  const g = useGame.getState()
  if (busy || g.status === 'listening') return
  stopSpeaking()
  try {
    await startRecording()
    g.setStatus('listening')
    g.setHeard('')
  } catch {
    g.setError('Microphone unavailable. You can type instead.')
  }
}

export async function talkStop() {
  const g = useGame.getState()
  if (g.status !== 'listening') return
  const wav = stopRecording()
  if (!wav) {
    g.setStatus('idle')
    return
  }
  g.setStatus('transcribing')
  const started = performance.now()
  try {
    const res = await fetch(`/api/transcribe?lang=${g.story.lang}`, {
      method: 'POST',
      headers: { 'Content-Type': 'audio/wav' },
      body: wav,
    })
    const json = (await res.json()) as { text?: string; error?: string }
    if (!res.ok) throw new Error(json.error ?? `transcription failed (${res.status})`)
    const text = (json.text ?? '').trim()
    useGame.getState().setHeard(text)
    if (!text) {
      useGame.getState().setStatus('idle')
      useGame.getState().setError("Didn't catch that. Try again, or type.")
      return
    }
    await sendTurn({ kind: 'speech', text }, Math.round(performance.now() - started))
  } catch (e) {
    useGame.getState().setStatus('idle')
    useGame.getState().setError(friendly(e))
  }
}

function friendly(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e)
  if (/429|Too many|limit|paused/i.test(msg)) return msg
  return `Something went wrong (${msg.slice(0, 120)}). Try again or type.`
}
