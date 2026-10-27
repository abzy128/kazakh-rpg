import { useEffect, useRef, useState } from 'react'
import { NPCS } from '#/content/aul-18c/npcs'
import type { DialogueLine, Term } from '#/game/engine/types'
import { sendTurn, talkStart, talkStop } from '#/game/dialogue/controller'
import { useGame } from '#/game/state/store'
import { t } from './i18n'

const STATUS_LABEL = {
  idle: '',
  listening: 'listening',
  transcribing: 'transcribing',
  thinking: 'thinking',
  speaking: '',
} as const

/** Highlights Kazakh terms in a line and shows their transliteration and meaning on hover. */
function Highlighted({ text, terms }: { text: string; terms?: Term[] }) {
  if (!terms?.length) return <>{text}</>
  const pattern = new RegExp(`(${terms.map((t) => t.kk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'giu')
  return (
    <>
      {text.split(pattern).map((part, i) => {
        const term = terms.find((t) => t.kk.toLowerCase() === part.toLowerCase())
        return term ? (
          <span key={i} className="group relative cursor-help border-b border-dotted border-amber-300 text-amber-200">
            {part}
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-stone-900 px-2 py-1 text-xs text-stone-100 shadow group-hover:block">
              {term.translit} — {term.en}
            </span>
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      })}
    </>
  )
}

function Line({ line }: { line: DialogueLine }) {
  const lang = useGame((s) => s.story.lang)
  if (line.speaker === 'player') {
    return (
      <div className={`text-right text-sm ${line.action ? 'italic text-stone-400' : 'text-sky-200'}`}>
        {line.action ? `— ${line.text}` : line.text}
      </div>
    )
  }
  return (
    <div className="text-sm">
      <span className="font-semibold text-amber-300">{NPCS[line.speaker].name[lang]}: </span>
      <Highlighted text={line.text} terms={line.terms} />
      {line.translationEn && <div className="text-xs text-stone-400">{line.translationEn}</div>}
    </div>
  )
}

export function DialogueOverlay({ actions }: { actions?: React.ReactNode }) {
  const npcId = useGame((s) => s.story.activeNpc)
  const lang = useGame((s) => s.story.lang)
  const dialogue = useGame((s) => s.story.dialogue)
  const status = useGame((s) => s.status)
  const heard = useGame((s) => s.heard)
  const error = useGame((s) => s.error)
  const speaking = useGame((s) => s.speaking)
  const close = useGame((s) => s.closeDialogue)
  const [text, setText] = useState('')
  const [showEn, setShowEn] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [dialogue.length, status])

  // Hold V to talk while the dialogue is open (unless typing).
  useEffect(() => {
    if (!npcId) return
    const down = (e: KeyboardEvent) => {
      if (document.activeElement === inputRef.current) return
      if (e.code === 'KeyV' && !e.repeat) talkStart()
      if (e.code === 'Escape') close()
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'KeyV') talkStop()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [npcId, close])

  if (!npcId) return null
  const npc = NPCS[speaking?.npcId ?? npcId]
  const busy = status !== 'idle' && status !== 'speaking'

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const value = text.trim()
    if (!value || busy) return
    setText('')
    inputRef.current?.blur()
    sendTurn({ kind: 'text', text: value })
  }

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 flex justify-center p-4">
      <div className="flex w-full max-w-3xl gap-4 rounded-2xl border border-amber-900/40 bg-stone-950/85 p-4 text-stone-100 shadow-2xl backdrop-blur">
        <Portrait npcId={npc.id} active={status === 'speaking'} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold text-amber-200">
              {npc.name[lang]} <span className="text-xs font-normal text-stone-400">{npc.role}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-stone-400">
              {lang === 'kk' && (
                <label className="flex items-center gap-1">
                  <input type="checkbox" checked={showEn} onChange={(e) => setShowEn(e.target.checked)} /> EN
                </label>
              )}
              <button className="hover:text-stone-100" onClick={close}>
                Esc ✕
              </button>
            </div>
          </div>
          <div ref={scrollRef} className="flex max-h-48 flex-col gap-1.5 overflow-y-auto pr-1">
            {dialogue.slice(-12).map((line, i) => (
              <Line key={i} line={showEn ? line : { ...line, translationEn: undefined }} />
            ))}
            {STATUS_LABEL[status] && <div className="animate-pulse text-xs text-stone-400">{t(lang, STATUS_LABEL[status])}…</div>}
          </div>
          {heard && <div className="text-xs text-stone-500">{t(lang, 'heard')}: “{heard}”</div>}
          {error && <div className="text-xs text-red-300">{error}</div>}
          {actions}
          <form onSubmit={submit} className="flex gap-2">
            <button
              type="button"
              onPointerDown={() => talkStart()}
              onPointerUp={() => talkStop()}
              onPointerLeave={() => talkStop()}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${
                status === 'listening' ? 'bg-red-600 text-white' : 'bg-amber-700 text-amber-50 hover:bg-amber-600'
              }`}
              title="Hold to talk (or hold V)"
            >
              🎙 {t(lang, 'hold')}
            </button>
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t(lang, 'type')}
              className="min-w-0 flex-1 rounded-lg bg-stone-800 px-3 py-2 text-sm outline-none ring-amber-600 focus:ring-1"
              maxLength={500}
            />
          </form>
        </div>
      </div>
    </div>
  )
}

function Portrait({ npcId, active }: { npcId: keyof typeof NPCS; active: boolean }) {
  const npc = NPCS[npcId]
  const [failed, setFailed] = useState(false)
  return (
    <div
      className={`relative h-32 w-28 shrink-0 overflow-hidden rounded-xl border-2 transition ${
        active ? 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)]' : 'border-amber-900/50'
      }`}
      style={{ background: `linear-gradient(160deg, ${npc.look.robe}, #1c1917)` }}
    >
      {!failed ? (
        <img src={npc.portrait} alt={npc.name.en} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <div className="flex h-full items-center justify-center text-4xl font-bold text-amber-100/80">{npc.name.kk[0]}</div>
      )}
    </div>
  )
}
