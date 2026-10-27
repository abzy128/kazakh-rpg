import { useEffect, useState } from 'react'
import type { Chronicle } from '#/server/gm/chronicle'
import { chronicle, paintDay } from '#/server/gm/chronicle'
import { useGame } from '#/game/state/store'
import { speak, stopSpeaking } from '#/game/voice/speaker'

/** Evening by the fire: the chronicle agent's бата for the day and a Muse Image painting of it. */
export function Finale() {
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<Chronicle | null>(null)
  const [painting, setPainting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const lang = useGame((s) => s.story.lang)

  useEffect(() => {
    const show = () => setOpen(true)
    window.addEventListener('open-finale', show)
    return () => window.removeEventListener('open-finale', show)
  }, [])

  useEffect(() => {
    if (!open || result) return
    let cancelled = false
    ;(async () => {
      try {
        const story = useGame.getState().story
        const r = await chronicle({ data: { state: story } })
        if (cancelled) return
        setResult(r)
        paintDay({ data: { prompt: r.paintingPrompt } })
          .then((p) => !cancelled && setPainting(p.dataUrl))
          .catch(() => {})
        await speak(r.bataKk, 'kk', 'ata', 'warm')
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      }
    })()
    return () => {
      cancelled = true
      stopSpeaking()
    }
  }, [open, result])

  if (!open) return null
  return (
    <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-black/75 p-6 backdrop-blur-sm">
      <div className="flex max-h-full w-full max-w-4xl flex-col gap-4 overflow-y-auto rounded-2xl border border-amber-800/50 bg-stone-950/95 p-6 text-stone-100 shadow-2xl">
        <div className="text-2xl font-semibold text-amber-200">{lang === 'kk' ? 'Кешкі бата' : 'The evening blessing'}</div>
        {!result && !error && (
          <div className="animate-pulse text-stone-400">
            {lang === 'kk' ? 'Ата күнді еске алып отыр…' : 'Ата is thinking back over your day…'}
          </div>
        )}
        {error && <div className="text-red-300">{error}</div>}
        {result && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-3">
              <div className="whitespace-pre-line font-serif text-lg leading-relaxed text-amber-100">{result.bataKk}</div>
              <div className="whitespace-pre-line text-sm italic text-stone-400">{result.bataEn}</div>
              <div className="text-sm text-stone-300">{result.chronicleEn}</div>
              <div className="text-xs text-stone-500">Әумин.</div>
            </div>
            <div className="flex flex-col gap-2">
              {painting ? (
                <img src={painting} alt="A painting of your day" className="rounded-xl border border-amber-900/50" />
              ) : (
                <div className="flex aspect-[3/2] items-center justify-center rounded-xl border border-dashed border-stone-700 text-sm text-stone-500">
                  {lang === 'kk' ? 'Сурет салынып жатыр…' : 'Painting your day…'}
                </div>
              )}
              <details className="text-xs text-stone-500">
                <summary className="cursor-pointer">How the game master composed this</summary>
                {result.summary.map((s, i) => (
                  <div key={i} className="text-violet-300">
                    💭 {s}
                  </div>
                ))}
                {result.steps.map((s, i) => (
                  <div key={i} className="font-mono">
                    {i + 1}. {s.tool}({s.args.slice(0, 120)})
                  </div>
                ))}
              </details>
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <button
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold hover:bg-amber-600"
            onClick={() => {
              stopSpeaking()
              useGame.getState().reset()
              window.location.href = '/'
            }}
          >
            {lang === 'kk' ? 'Қайта ойнау' : 'Play again'}
          </button>
          <button className="rounded-lg bg-stone-800 px-4 py-2 text-sm hover:bg-stone-700" onClick={() => setOpen(false)}>
            {lang === 'kk' ? 'Жабу' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}
