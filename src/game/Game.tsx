import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useState } from 'react'
import { QUEST_ORDER } from '#/content/aul-18c/quests'
import { initialState } from '#/game/engine/engine'
import type { QuestId } from '#/game/engine/types'
import { useGame } from '#/game/state/store'
import { DialogueOverlay } from '#/game/ui/Dialogue'
import { Finale } from '#/game/ui/Finale'
import { Hud } from '#/game/ui/Hud'
import { GmLog, Journal, QuestBar, Toasts, usePanelKeys } from '#/game/ui/Panels'
import { YurtActions } from '#/game/ui/YurtActions'
import { GuestArrival, Herd, Hunt, Interactions, Npcs, Player, interactions } from '#/game/world/Actors'
import { Environment } from '#/game/world/Environment'
import { YurtInterior } from '#/game/world/YurtInterior'
import { sim } from '#/game/world/sim'

export default function Game() {
  const story = useGame((s) => s.story)
  usePanelKeys()
  useInput()

  // Dev-only handle for debugging and headless tests.
  useEffect(() => {
    if (import.meta.env.DEV) Object.assign(window, { __game: { sim, useGame } })
  }, [])

  // Inside the yurt the conversation with the guest is always open.
  useEffect(() => {
    if (story.scene === 'yurt' && !story.activeNpc) useGame.getState().openDialogue('guest')
    if (story.scene === 'aul' && story.quests.qonaq.status === 'done' && story.activeNpc === 'guest') useGame.getState().closeDialogue()
  }, [story.scene, story.activeNpc, story.quests.qonaq.status])

  // Safety net: world events the game master should trigger, enforced if it didn't.
  useEffect(() => {
    const g = useGame.getState()
    const { boran, qansonar } = story.quests
    if (boran.status === 'active' && boran.step === 'herding' && story.weather !== 'storm') g.trigger('storm_begins')
    if (boran.status === 'done' && story.weather === 'storm') g.trigger('storm_ends')
    if (qansonar.status === 'done' && story.phase !== 'evening') g.trigger('night_falls')
  }, [story.quests, story.weather, story.phase])

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      <Canvas shadows camera={{ fov: 60, near: 0.1, far: 900 }} dpr={[1, 1.75]}>
        <Suspense fallback={null}>
          {story.scene === 'yurt' ? (
            <YurtInterior />
          ) : (
            <>
              <Environment weather={story.weather} phase={story.phase} />
              <Player />
              <Npcs />
              <GuestArrival />
              <Herd />
              <Hunt />
              <Interactions />
            </>
          )}
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute inset-0">
        <QuestBar />
        <Hud />
        <Toasts />
        <Journal />
        <GmLog />
        <DialogueOverlay actions={<YurtActions />} />
        <Finale />
        <DevPanel />
      </div>
    </div>
  )
}

/** Movement keys go to the simulation; E/F/R run the current interaction. Mouse drag turns the camera. */
function useInput() {
  useEffect(() => {
    const typing = (e: Event) => (e.target as HTMLElement)?.tagName === 'INPUT'
    const down = (e: KeyboardEvent) => {
      if (typing(e)) return
      sim.keys.add(e.code)
      if (e.repeat || useGame.getState().story.activeNpc) return
      const key = e.code === 'KeyE' ? 'E' : e.code === 'KeyF' ? 'F' : e.code === 'KeyR' ? 'R' : null
      if (key) interactions.list.find((i) => i.key === key)?.act()
    }
    const up = (e: KeyboardEvent) => sim.keys.delete(e.code)
    const blur = () => sim.keys.clear()
    let dragging = false
    const pdown = (e: PointerEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'CANVAS') dragging = true
    }
    const pup = () => (dragging = false)
    const pmove = (e: PointerEvent) => {
      if (dragging) sim.cameraYaw -= e.movementX * 0.005
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    window.addEventListener('pointerdown', pdown)
    window.addEventListener('pointerup', pup)
    window.addEventListener('pointermove', pmove)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      window.removeEventListener('pointerdown', pdown)
      window.removeEventListener('pointerup', pup)
      window.removeEventListener('pointermove', pmove)
    }
  }, [])
}

/** Jump to any quest for testing and demo recording. Toggle with F2. */
function DevPanel() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const down = (e: KeyboardEvent) => e.code === 'F2' && setOpen((o) => !o)
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])
  if (!open) return null

  const jump = (target: QuestId | 'finale') => {
    const lang = useGame.getState().story.lang
    const s = initialState(lang)
    const idx = target === 'finale' ? QUEST_ORDER.length : QUEST_ORDER.indexOf(target)
    QUEST_ORDER.forEach((id, i) => {
      s.quests[id] = { ...s.quests[id], status: i < idx ? 'done' : i === idx ? 'active' : 'locked', step: i < idx ? 'done' : s.quests[id].step }
    })
    s.quests.boran.flags = idx > 0 ? { horses_saved: 9, horses_total: 10 } : {}
    s.phase = target === 'boran' ? 'morning' : target === 'qonaq' ? 'midday' : target === 'qansonar' ? 'afternoon' : 'evening'
    s.weather = target === 'boran' ? 'wind' : target === 'finale' ? 'clear' : 'snowfall'
    sim.herd = []
    sim.fox = null
    sim.eagle = null
    sim.guest = { x: 0, z: 70, heading: Math.PI, speed: 0, arrived: false }
    Object.assign(sim.player, { x: 4, z: 6, mounted: false, speed: 0 })
    useGame.setState({ story: s, gmLog: [] })
  }

  return (
    <div className="pointer-events-auto absolute bottom-3 right-3 flex flex-col gap-1 rounded-lg bg-black/80 p-2 text-xs text-stone-200">
      <div className="text-amber-300">Dev (F2)</div>
      {(['boran', 'qonaq', 'qansonar', 'finale'] as const).map((q) => (
        <button key={q} className="rounded bg-stone-700 px-2 py-1 hover:bg-stone-600" onClick={() => jump(q)}>
          → {q}
        </button>
      ))}
      <button
        className="rounded bg-stone-700 px-2 py-1 hover:bg-stone-600"
        onClick={() => {
          const { story, setLang } = useGame.getState()
          setLang(story.lang === 'en' ? 'kk' : 'en')
        }}
      >
        toggle language
      </button>
    </div>
  )
}
