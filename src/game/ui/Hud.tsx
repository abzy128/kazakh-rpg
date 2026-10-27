import { useEffect, useState } from 'react'
import { activeQuest } from '#/game/engine/engine'
import { useGame } from '#/game/state/store'
import { interactions } from '#/game/world/Actors'
import type { Interaction } from '#/game/world/Actors'
import { CORRAL, FIRE, NPC_SPOTS, WIND } from '#/game/world/layout'
import { sim } from '#/game/world/sim'
import { t } from './i18n'

interface Objective {
  text: string
  x?: number
  z?: number
}

function objective(): Objective {
  const { story } = useGame.getState()
  const kk = story.lang === 'kk'
  const quest = activeQuest(story)
  const ata = NPC_SPOTS.ata
  if (!quest) return { text: kk ? 'Кешкі бата үшін от басына бар' : 'Go to the fire for the evening blessing', x: FIRE.x, z: FIRE.z }
  const step = story.quests[quest].step
  if (quest === 'boran') {
    if (step === 'herding') {
      const loose = sim.herd.filter((h) => !h.penned)
      const penned = sim.herd.length - loose.length
      if (!loose.length) return { text: '' }
      const cx = loose.reduce((s, h) => s + h.x, 0) / loose.length
      const cz = loose.reduce((s, h) => s + h.z, 0) / loose.length
      const near = Math.hypot(cx - sim.player.x, cz - sim.player.z) < 30
      const left = Math.max(0, Math.ceil(sim.herdDuration - sim.herdTimer))
      return {
        text: `${t(story.lang, 'horsesPenned')}: ${penned}/${sim.herd.length} · ${t(story.lang, 'stormIn')} ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}${
          sim.player.mounted ? '' : kk ? ' · Атқа мін (F)' : ' · Mount your horse (F)'
        }`,
        x: near ? CORRAL.x : cx,
        z: near ? CORRAL.z : cz,
      }
    }
    return { text: kk ? 'Атамен сөйлес' : 'Talk to Ата', x: ata.x, z: ata.z }
  }
  if (quest === 'qonaq') {
    if (story.scene === 'yurt') return { text: '' }
    if (step === 'arrival' || step === 'greeted')
      return { text: kk ? 'Қонақты қарсы ал' : 'Welcome the guest', x: NPC_SPOTS.guest.x, z: NPC_SPOTS.guest.z }
    return { text: kk ? 'Қонақты үйге кіргіз' : 'Bring the guest into the yurt', x: 0, z: -10 }
  }
  if (step === 'tracking') {
    const f = sim.fox
    return {
      text: kk ? 'Түлкіні жел жақтан емес, ақырын аңду' : 'Stalk the fox: at a walk, wind in your face',
      x: f ? f.x : -150,
      z: f ? f.z : -160,
    }
  }
  const at = sim.companion.active ? sim.companion : ata
  return { text: kk ? 'Атамен сөйлес' : 'Talk to Ата', x: at.x, z: at.z }
}

/** Interaction prompts, the current objective with a direction arrow, and the wind. */
export function Hud() {
  const [list, setList] = useState<Interaction[]>([])
  const [obj, setObj] = useState<Objective & { angle?: number; dist?: number }>({ text: '' })
  const lang = useGame((s) => s.story.lang)
  const scene = useGame((s) => s.story.scene)
  const dialogueOpen = useGame((s) => !!s.story.activeNpc)

  useEffect(() => {
    const id = setInterval(() => {
      setList([...interactions.list])
      const o = objective()
      if (o.x != null && o.z != null) {
        const dx = o.x - sim.player.x
        const dz = o.z - sim.player.z
        const world = Math.atan2(dx, dz)
        setObj({ ...o, angle: world - (sim.player.heading + sim.cameraYaw), dist: Math.hypot(dx, dz) })
      } else setObj(o)
    }, 150)
    return () => clearInterval(id)
  }, [])

  if (scene !== 'aul') return null
  const windAngle = Math.atan2(WIND.x, WIND.z) - (sim.player.heading + sim.cameraYaw)

  return (
    <>
      {obj.text && (
        <div className="pointer-events-none absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/55 px-4 py-1.5 text-sm text-stone-100">
          {obj.angle != null && obj.dist != null && obj.dist > 6 && (
            <span className="inline-block text-amber-300" style={{ transform: `rotate(${-obj.angle}rad)` }}>
              ▲
            </span>
          )}
          <span>{obj.text}</span>
          {obj.dist != null && obj.dist > 6 && <span className="text-stone-400">{Math.round(obj.dist)} m</span>}
        </div>
      )}
      <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2 rounded-full bg-black/45 px-3 py-1 text-xs text-stone-200">
        <span className="inline-block" style={{ transform: `rotate(${-windAngle}rad)` }}>
          ↑
        </span>
        {lang === 'kk' ? 'жел' : 'wind'}
      </div>
      {!dialogueOpen && list.length > 0 && (
        <div className="pointer-events-none absolute bottom-24 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5">
          {list.map((i) => (
            <div key={i.key + i.label} className="rounded-lg bg-black/65 px-3 py-1.5 text-sm text-stone-100">
              <kbd className="mr-2 rounded bg-amber-600 px-1.5 py-0.5 font-mono text-xs text-white">{i.key}</kbd>
              {i.label}
            </div>
          ))}
        </div>
      )}
      {!dialogueOpen && (
        <div className="pointer-events-none absolute bottom-3 left-3 text-xs text-stone-200/80 [text-shadow:0_1px_2px_#000]">
          WASD {lang === 'kk' ? 'жүру' : 'move'} · Shift {lang === 'kk' ? 'жылдам' : 'run/gallop'} · {lang === 'kk' ? 'тышқанды сүйреп қарау' : 'drag to look'} · J{' '}
          {t(lang, 'journal')} · ` GM log
        </div>
      )}
    </>
  )
}
