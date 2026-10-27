import { useEffect } from 'react'
import { NPCS } from '#/content/aul-18c/npcs'
import { QUESTS, QUEST_ORDER } from '#/content/aul-18c/quests'
import { useGame } from '#/game/state/store'
import { t } from './i18n'

/** The agent's work, visible: reasoning summaries, tool calls (accepted or rejected) and timings. Toggle with `. */
export function GmLog() {
  const show = useGame((s) => s.showLog)
  const log = useGame((s) => s.gmLog)
  if (!show) return null
  return (
    <div className="pointer-events-auto absolute right-3 top-14 bottom-3 w-[26rem] overflow-y-auto rounded-xl bg-black/80 p-3 font-mono text-[11px] leading-relaxed text-stone-200 shadow-xl backdrop-blur">
      <div className="mb-2 flex justify-between text-xs text-amber-300">
        <span>Game master · Muse Spark</span>
        <span className="text-stone-500">` to hide</span>
      </div>
      {!log.length && <div className="text-stone-500">No turns yet. Talk to someone.</div>}
      {log.map((turn, i) => (
        <div key={i} className="mb-3 border-b border-stone-700 pb-2">
          <div className="text-sky-300">
            ▶ {turn.input.kind}: {turn.input.text}
          </div>
          {turn.summary.map((s, j) => (
            <div key={j} className="text-violet-300">
              💭 {s}
            </div>
          ))}
          {turn.narration && <div className="italic text-stone-400">✎ {turn.narration}</div>}
          {turn.calls.map((c, j) => (
            <div key={j} className={c.accepted ? 'text-emerald-300' : 'text-red-400 line-through decoration-red-400/50'}>
              {c.accepted ? '✓' : '✗'} {c.name} {summarizeArgs(c.args)}
              {c.why && <span className="ml-1 no-underline text-red-300">({c.why})</span>}
            </div>
          ))}
          <div className="text-stone-500">
            {turn.ms.stt != null && `stt ${turn.ms.stt}ms · `}gm {turn.ms.gm}ms{turn.ms.tts ? ` · tts ${turn.ms.tts}ms` : ''}
            {turn.usage && ` · ${turn.usage.input} in (${turn.usage.cached} cached) / ${turn.usage.output} out`}
          </div>
        </div>
      ))}
    </div>
  )
}

function summarizeArgs(json: string) {
  try {
    const { type: _type, source: _source, translationEn: _t, terms: _terms, ...rest } = JSON.parse(json) as Record<string, unknown>
    return Object.values(rest)
      .map((v) => (typeof v === 'string' && v.length > 70 ? `${v.slice(0, 70)}…` : String(v)))
      .join(' · ')
  } catch {
    return json.slice(0, 80)
  }
}

export function Journal() {
  const show = useGame((s) => s.showJournal)
  const story = useGame((s) => s.story)
  if (!show) return null
  const lang = story.lang
  return (
    <div className="pointer-events-auto absolute left-3 top-14 bottom-3 w-80 overflow-y-auto rounded-xl bg-stone-950/85 p-4 text-sm text-stone-100 shadow-xl backdrop-blur">
      <div className="mb-3 text-lg font-semibold text-amber-200">{t(lang, 'journal')}</div>
      <div className="mb-1 text-xs uppercase tracking-wide text-stone-400">{t(lang, 'standing')}</div>
      {Object.values(NPCS).map((n) => (
        <div key={n.id} className="flex justify-between">
          <span>{n.name[lang]}</span>
          <span className={story.standing[n.id] >= 0 ? 'text-emerald-300' : 'text-red-300'}>
            {story.standing[n.id] > 0 ? '+' : ''}
            {story.standing[n.id]}
          </span>
        </div>
      ))}
      <div className="mt-4 mb-1 text-xs uppercase tracking-wide text-stone-400">{t(lang, 'words')}</div>
      {!story.journal.length && <div className="text-stone-500">—</div>}
      {story.journal.map((w) => (
        <div key={w.kk} className="mb-2">
          <span className="font-semibold text-amber-200">{w.kk}</span> <span className="text-stone-400">{w.translit}</span> — {w.en}
          {w.note && <div className="text-xs text-stone-400">{w.note}</div>}
        </div>
      ))}
      <div className="mt-4 mb-1 text-xs uppercase tracking-wide text-stone-400">{t(lang, 'memories')}</div>
      {story.memories.map((m, i) => (
        <div key={i} className="mb-1 text-xs text-stone-300">
          • {m.text}
        </div>
      ))}
    </div>
  )
}

export function Toasts() {
  const toasts = useGame((s) => s.toasts)
  return (
    <div className="pointer-events-none absolute left-1/2 top-16 flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-full px-4 py-1.5 text-sm shadow-lg ${
            toast.tone === 'good' ? 'bg-emerald-800/90 text-emerald-50' : toast.tone === 'bad' ? 'bg-red-900/90 text-red-50' : 'bg-stone-800/90 text-amber-100'
          }`}
        >
          {toast.text}
        </div>
      ))}
    </div>
  )
}

export function QuestBar() {
  const story = useGame((s) => s.story)
  const lang = story.lang
  return (
    <div className="pointer-events-none absolute left-3 top-3 flex gap-2 text-xs">
      {QUEST_ORDER.map((id) => {
        const q = story.quests[id]
        return (
          <div
            key={id}
            className={`rounded-full px-3 py-1 ${
              q.status === 'active' ? 'bg-amber-600/90 text-white' : q.status === 'done' ? 'bg-emerald-900/80 text-emerald-100' : 'bg-black/40 text-stone-400'
            }`}
          >
            {q.status === 'done' ? '✓ ' : ''}
            {QUESTS[id].title[lang]}
          </div>
        )
      })}
    </div>
  )
}

/** Global keys: ` for the GM log, J for the journal. */
export function usePanelKeys() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.code === 'Backquote') useGame.getState().toggleLog()
      if (e.code === 'KeyJ') useGame.getState().toggleJournal()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])
}
