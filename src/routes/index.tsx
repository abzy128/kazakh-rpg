import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { Lang } from '#/game/engine/types'
import { useGame } from '#/game/state/store'
import { unlockAudio } from '#/game/voice/recorder'

export const Route = createFileRoute('/')({ component: Title })

function Title() {
  const navigate = useNavigate()
  const [hasSave, setHasSave] = useState(false)
  const [lang, setLang] = useState<Lang>('en')

  useEffect(() => {
    const story = useGame.getState().story
    setLang(story.lang)
    setHasSave(story.dialogue.length > 0 || story.quests.boran.status !== 'active' || story.quests.boran.step !== 'intro')
  }, [])

  const start = async (fresh: boolean) => {
    await unlockAudio().catch(() => {})
    if (fresh) useGame.getState().reset(lang)
    else useGame.getState().setLang(lang)
    navigate({ to: '/play' })
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-8 bg-stone-950 bg-cover bg-center p-6 text-stone-100"
      style={{ backgroundImage: 'linear-gradient(rgba(20,16,12,0.35), rgba(20,16,12,0.92)), url(/generated/title.webp)' }}
    >
      <div className="text-center">
        <div className="text-sm uppercase tracking-[0.3em] text-amber-400/80">Қазақ даласы · XVIII ғасыр</div>
        <h1 className="mt-3 text-5xl font-bold text-amber-100">Бір күн ауылда</h1>
        <p className="mt-2 text-xl text-stone-300">A Day in the Aul</p>
        <p className="mx-auto mt-4 max-w-xl text-stone-400">
          Live one autumn day in an 18th-century Kazakh camp. Bring in the herd before the blizzard, host a traveler the way your
          grandparents would, and ride out with the eagle on the first snow. Talk to everyone with your voice — they remember what
          you do.
        </p>
      </div>

      <div className="flex gap-3">
        {(
          [
            ['en', 'English', 'NPCs speak English with Kazakh words'],
            ['kk', 'Қазақша', 'Бәрі қазақ тілінде, ағылшынша аудармасымен'],
          ] as const
        ).map(([id, label, hint]) => (
          <button
            key={id}
            onClick={() => setLang(id)}
            className={`w-64 rounded-xl border p-4 text-left transition ${
              lang === id ? 'border-amber-400 bg-amber-900/40' : 'border-stone-700 bg-stone-900/50 hover:border-stone-500'
            }`}
          >
            <div className="text-lg font-semibold">{label}</div>
            <div className="text-xs text-stone-400">{hint}</div>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        {hasSave && (
          <button onClick={() => start(false)} className="rounded-xl bg-stone-700 px-6 py-3 font-semibold hover:bg-stone-600">
            {lang === 'kk' ? 'Жалғастыру' : 'Continue'}
          </button>
        )}
        <button onClick={() => start(true)} className="rounded-xl bg-amber-700 px-8 py-3 font-semibold hover:bg-amber-600">
          {lang === 'kk' ? 'Жаңа ойын' : hasSave ? 'New day' : 'Play'}
        </button>
      </div>

      <div className="max-w-xl text-center text-xs text-stone-500">
        Hold <kbd className="rounded bg-stone-800 px-1">V</kbd> to talk (or type). Best with headphones and a microphone. Built with
        Meta Muse Spark, Muse Voice Transcribe and Muse Image.
      </div>
    </div>
  )
}
