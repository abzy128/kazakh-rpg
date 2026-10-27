import { createFileRoute } from '@tanstack/react-router'
import { NPCS } from '#/content/aul-18c/npcs'
import { NPC_IDS } from '#/game/engine/types'
import { useGame } from '#/game/state/store'
import { DialogueOverlay } from '#/game/ui/Dialogue'
import { YurtActions } from '#/game/ui/YurtActions'

// Test bench for the voice + game master loop without the 3D world. Open the GM log with the button.
export const Route = createFileRoute('/lab')({ ssr: false, component: Lab })

function Lab() {
  const story = useGame((s) => s.story)
  const log = useGame((s) => s.gmLog)
  const g = useGame.getState()
  return (
    <div className="min-h-screen bg-stone-950 p-6 text-stone-100">
      <h1 className="text-2xl font-bold text-amber-200">Lab</h1>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        {NPC_IDS.map((id) => (
          <button key={id} className="rounded bg-stone-800 px-3 py-1 hover:bg-stone-700" onClick={() => g.openDialogue(id)}>
            talk: {NPCS[id].name.en}
          </button>
        ))}
        <button className="rounded bg-stone-800 px-3 py-1" onClick={() => g.setLang(story.lang === 'en' ? 'kk' : 'en')}>
          lang: {story.lang}
        </button>
        <button className="rounded bg-stone-800 px-3 py-1" onClick={() => g.reset()}>
          reset
        </button>
      </div>
      <pre className="mt-4 max-h-64 overflow-auto rounded bg-black/50 p-3 text-xs">
        {JSON.stringify({ quests: story.quests, standing: story.standing, scene: story.scene, weather: story.weather, journal: story.journal.map((j) => j.kk) }, null, 1)}
      </pre>
      <div className="mt-4 space-y-2 text-xs">
        {log.map((turn, i) => (
          <pre key={i} className="whitespace-pre-wrap rounded bg-black/40 p-2">
            {JSON.stringify(turn, null, 1)}
          </pre>
        ))}
      </div>
      <DialogueOverlay actions={<YurtActions />} />
    </div>
  )
}
