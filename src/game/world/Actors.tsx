import { useFrame, useThree } from '@react-three/fiber'
import { useRef, useState } from 'react'
import * as THREE from 'three'
import { NPCS } from '#/content/aul-18c/npcs'
import { presentNpcs } from '#/game/dialogue/controller'
import type { NpcId } from '#/game/engine/types'
import { useGame } from '#/game/state/store'
import { t } from '#/game/ui/i18n'
import { CORRAL, FAMILY_YURT, FIRE, HORSE_POST, HUNT_HILLS, NPC_SPOTS, PASTURE, WIND, YURT_RADIUS, collide, heightAt } from './layout'
import { Eagle, Fox, Horse, Person } from './models'
import { HERD_COLORS, sim, spawnHerd } from './sim'

export interface Interaction {
  key: 'E' | 'F' | 'R'
  label: string
  act: () => void
}
export const interactions: { list: Interaction[] } = { list: [] }

function place(obj: THREE.Object3D | null, x: number, z: number, heading: number, lift = 0) {
  if (!obj) return
  obj.position.set(x, heightAt(x, z) + lift, z)
  obj.rotation.y = heading
}

function turnToward(current: number, target: number, rate: number) {
  let d = target - current
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return current + Math.max(-rate, Math.min(rate, d))
}

/** The player on foot or on horseback, plus the follow camera. */
export function Player() {
  const body = useRef<THREE.Group>(null)
  const horse = useRef<THREE.Group>(null)
  const gait = useRef(0)
  const horseGait = useRef(0)
  const { camera } = useThree()
  const camPos = useRef(new THREE.Vector3(4, 5, 14))
  const look = useRef(new THREE.Vector3())
  const [mounted, setMounted] = useState(sim.player.mounted)

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const p = sim.player
    if (p.mounted !== mounted) setMounted(p.mounted)
    const h = sim.playerHorse
    const k = sim.keys
    const locked = !!useGame.getState().story.activeNpc
    const fwd = locked ? 0 : (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0)
    const turn = locked ? 0 : (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0) - (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0)
    const fast = k.has('ShiftLeft') || k.has('ShiftRight')

    if (p.mounted) {
      const max = fast ? 16 : 6.5
      p.heading += turn * dt * (Math.abs(p.speed) > 0.5 ? 1.7 : 1.0)
      p.speed += (fwd * (fwd < 0 ? 2 : max) - p.speed) * Math.min(1, dt * (fwd ? 1.4 : 2.5))
    } else {
      const max = fast ? 6 : 2.8
      p.heading += turn * dt * 2.6
      p.speed += (fwd * (fwd < 0 ? 1.5 : max) - p.speed) * Math.min(1, dt * 9)
    }
    p.x += Math.sin(p.heading) * p.speed * dt
    p.z += Math.cos(p.heading) * p.speed * dt
    collide(p, p.mounted ? 1.3 : 0.45)
    if (p.mounted) Object.assign(h, { x: p.x, z: p.z, heading: p.heading, speed: p.speed })
    gait.current = p.mounted ? 0 : Math.abs(p.speed) / 2.8
    horseGait.current = Math.abs(h.speed) / 6.5

    place(body.current, p.x, p.z, p.heading, p.mounted ? 1.55 : 0)
    place(horse.current, h.x, h.z, h.heading)

    // Follow camera: behind the player, drag with the mouse to look around.
    if (Math.abs(p.speed) > 0.5) sim.cameraYaw *= 1 - Math.min(1, dt * 0.8)
    const yaw = p.heading + sim.cameraYaw
    const dist = p.mounted ? 10 : 6.5
    const height = p.mounted ? 4.6 : 3.2
    const target = new THREE.Vector3(p.x - Math.sin(yaw) * dist, 0, p.z - Math.cos(yaw) * dist)
    target.y = Math.max(heightAt(target.x, target.z) + 1.2, heightAt(p.x, p.z) + height)
    camPos.current.lerp(target, Math.min(1, dt * 4))
    camera.position.copy(camPos.current)
    look.current.set(p.x + Math.sin(yaw) * 4, heightAt(p.x, p.z) + (p.mounted ? 2.2 : 1.5), p.z + Math.cos(yaw) * 4)
    camera.lookAt(look.current)
  })

  return (
    <>
      <group ref={body}>
        <Person look={{ robe: '#3d5a3a', hat: '#2a2018', hatShape: 'borik', beard: false, height: 0.92 }} gait={gait} seated={mounted} />
      </group>
      <group ref={horse}>
        <Horse color="#8a5a33" gait={horseGait} saddle />
      </group>
    </>
  )
}

/** NPCs standing in the aul (or riding with you), facing the player when near. */
export function Npcs() {
  const story = useGame((s) => s.story)
  const present = presentNpcs(story)
  return (
    <>
      {present.map((id) => (
        <NpcActor key={id} id={id} />
      ))}
    </>
  )
}

function npcPosition(id: NpcId) {
  if (id === 'ata' && sim.companion.active) return sim.companion
  if (id === 'guest') return { x: sim.guest.x, z: sim.guest.z, heading: sim.guest.heading }
  const s = NPC_SPOTS[id]
  return { x: s.x, z: s.z, heading: s.rot }
}

function NpcActor({ id }: { id: NpcId }) {
  const group = useRef<THREE.Group>(null)
  const horse = useRef<THREE.Group>(null)
  const gait = useRef(0)
  const horseGait = useRef(0)
  const heading = useRef(npcPosition(id).heading)
  const talking = useGame((s) => s.status === 'speaking' && s.speaking?.npcId === id)
  const def = NPCS[id]

  useFrame((_, dt) => {
    const pos = npcPosition(id)
    const riding = (id === 'ata' && sim.companion.active) || (id === 'guest' && !sim.guest.arrived)
    const speed = id === 'ata' && sim.companion.active ? sim.companion.speed : id === 'guest' ? sim.guest.speed : 0
    const d = Math.hypot(sim.player.x - pos.x, sim.player.z - pos.z)
    const face = d < 8 && speed < 0.5 ? Math.atan2(sim.player.x - pos.x, sim.player.z - pos.z) : pos.heading
    heading.current = turnToward(heading.current, face, dt * 3)
    place(group.current, pos.x, pos.z, heading.current, riding ? 1.55 : 0)
    if (horse.current) {
      horse.current.visible = riding
      place(horse.current, pos.x, pos.z, heading.current)
    }
    horseGait.current = speed / 6.5
    gait.current = riding ? 0 : 0
  })

  return (
    <>
      <group ref={group}>
        <Person look={def.look} gait={gait} talking={talking} seated={false} />
        {id === 'ata' && (
          <group position={[0.42, 1.25, 0.25]} scale={0.6}>
            <Eagle flapping={false} hooded />
          </group>
        )}
      </group>
      <group ref={horse} visible={false}>
        <Horse color={id === 'ata' ? '#d8cfc0' : '#3b2a1e'} gait={horseGait} saddle />
      </group>
    </>
  )
}

/** The guest's horse, tied at the hitching rope after he arrives. */
export function GuestArrival() {
  const story = useGame((s) => s.story)
  const tied = useRef<THREE.Group>(null)
  const announced = useRef(false)
  const qonaq = story.quests.qonaq
  const active = qonaq.status === 'active'

  useFrame((_, dt) => {
    const g = sim.guest
    if (active && qonaq.step === 'arrival' && !g.arrived) {
      if (!announced.current) {
        announced.current = true
        useGame.getState().toast(story.lang === 'kk' ? 'Боранның ішінен бір салт атты келе жатыр!' : 'A rider is coming through the storm!', 'info')
      }
      const tx = NPC_SPOTS.guest.x
      const tz = NPC_SPOTS.guest.z + 3
      const d = Math.hypot(tx - g.x, tz - g.z)
      if (d < 0.5) {
        g.arrived = true
        g.speed = 0
        g.x = NPC_SPOTS.guest.x
        g.z = NPC_SPOTS.guest.z
      } else {
        g.speed = Math.min(5, d)
        g.heading = Math.atan2(tx - g.x, tz - g.z)
        g.x += Math.sin(g.heading) * g.speed * dt
        g.z += Math.cos(g.heading) * g.speed * dt
      }
    } else if (qonaq.status !== 'locked') {
      g.arrived = true
      g.speed = 0
      if (Math.hypot(g.x - NPC_SPOTS.guest.x, g.z - NPC_SPOTS.guest.z) > 1) Object.assign(g, { x: NPC_SPOTS.guest.x, z: NPC_SPOTS.guest.z })
    }
    if (tied.current) {
      tied.current.visible = g.arrived && qonaq.status !== 'locked'
      place(tied.current, HORSE_POST.x - 1.2, HORSE_POST.z + 2.6, Math.PI / 2)
    }
  })
  return (
    <group ref={tied} visible={false}>
      <Horse color="#3b2a1e" saddle />
    </group>
  )
}

/** Боран: the herd in the far pasture, pushed into the corral before the blizzard peaks. */
export function Herd() {
  const story = useGame((s) => s.story)
  const step = story.quests.boran.status === 'active' ? story.quests.boran.step : story.quests.boran.status
  const refs = useRef<(THREE.Group | null)[]>([])
  const gaits = useRef(Array.from({ length: 10 }, () => ({ current: 0 })))
  const finished = useRef(false)

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    if (step === 'herding' && !sim.herd.length) {
      spawnHerd(PASTURE.x, PASTURE.z)
      finished.current = false
    }
    // After a reload, put the saved horses back in the corral.
    const saved = Number(story.quests.boran.flags.horses_saved ?? 0)
    if (step !== 'herding' && !sim.herd.length && saved > 0) {
      spawnHerd(CORRAL.x, CORRAL.z)
      sim.herd = sim.herd.slice(0, saved).map((h) => ({ ...h, x: CORRAL.x + (h.x - CORRAL.x) * 0.5, z: CORRAL.z + (h.z - CORRAL.z) * 0.5, penned: true }))
    }
    if (step === 'herding') {
      sim.herdTimer += dt
      sim.stormLevel = Math.min(1, sim.herdTimer / sim.herdDuration)
    }
    const herd = sim.herd
    const loose = herd.filter((h) => !h.penned)
    const cx = loose.reduce((s, h) => s + h.x, 0) / Math.max(1, loose.length)
    const cz = loose.reduce((s, h) => s + h.z, 0) / Math.max(1, loose.length)
    const p = sim.player
    const fleeR = p.mounted ? 20 : 9

    herd.forEach((h, i) => {
      let ax = 0
      let az = 0
      const t = state.clock.elapsedTime
      if (h.penned) {
        // Mill about inside the corral.
        ax += Math.sin(t * 0.3 + i) * 0.4 + (CORRAL.x - h.x) * 0.08
        az += Math.cos(t * 0.27 + i * 2) * 0.4 + (CORRAL.z - h.z) * 0.08
      } else {
        ax += (cx - h.x) * 0.05
        az += (cz - h.z) * 0.05
        ax += Math.sin(t * 0.5 + i * 1.7) * 0.3
        az += Math.cos(t * 0.4 + i * 2.3) * 0.3
        // Untended horses drift downwind in the storm.
        ax += WIND.x * sim.stormLevel * 0.5
        az += WIND.z * sim.stormLevel * 0.5
        const dx = h.x - p.x
        const dz = h.z - p.z
        const d = Math.hypot(dx, dz)
        if (d < fleeR) {
          const f = ((fleeR - d) / fleeR) * (p.mounted && Math.abs(p.speed) > 9 ? 9 : 6)
          ax += (dx / d) * f
          az += (dz / d) * f
        }
      }
      for (const o of herd) {
        if (o === h) continue
        const dx = h.x - o.x
        const dz = h.z - o.z
        const d = Math.hypot(dx, dz)
        if (d < 2.6 && d > 0.01) {
          ax += (dx / d) * (2.6 - d) * 2
          az += (dz / d) * (2.6 - d) * 2
        }
      }
      h.vx += ax * dt
      h.vz += az * dt
      const damp = Math.max(0, 1 - dt * 1.2)
      h.vx *= damp
      h.vz *= damp
      const max = h.penned ? 1.2 : 9
      const sp = Math.hypot(h.vx, h.vz)
      if (sp > max) {
        h.vx *= max / sp
        h.vz *= max / sp
      }
      h.x += h.vx * dt
      h.z += h.vz * dt
      h.speed = Math.hypot(h.vx, h.vz)
      if (h.speed > 0.3) h.heading = turnToward(h.heading, Math.atan2(h.vx, h.vz), dt * 4)
      collide(h, 0.9)
      const dc = Math.hypot(h.x - CORRAL.x, h.z - CORRAL.z)
      if (!h.penned && dc < CORRAL.r - 1.5) h.penned = true
      if (h.penned && dc > CORRAL.r - 1.2) {
        h.x = CORRAL.x + ((h.x - CORRAL.x) / dc) * (CORRAL.r - 1.2)
        h.z = CORRAL.z + ((h.z - CORRAL.z) / dc) * (CORRAL.r - 1.2)
      }
      gaits.current[i].current = h.speed / 3
      place(refs.current[i], h.x, h.z, h.heading)
    })
    refs.current.forEach((r, i) => r && (r.visible = !!herd[i]))

    if (step === 'herding' && herd.length && !finished.current) {
      const penned = herd.filter((h) => h.penned).length
      if (penned === herd.length || sim.herdTimer >= sim.herdDuration) {
        finished.current = true
        const g = useGame.getState()
        g.advanceByGame('boran', 'returned', { horses_saved: penned, horses_total: herd.length })
        g.remember(
          penned === herd.length
            ? `The player brought all ${herd.length} horses into the corral before the blizzard peaked.`
            : `The player brought ${penned} of ${herd.length} horses into the corral; ${herd.length - penned} were lost to the blizzard.`,
          3,
        )
        sim.herd = herd.filter((h) => h.penned)
        g.toast(g.story.lang === 'kk' ? `${penned}/${herd.length} жылқы қорада. Атаға барып айт.` : `${penned}/${herd.length} horses penned. Go and tell Ата.`, penned === herd.length ? 'good' : 'bad')
      }
    }
  })

  return (
    <>
      {Array.from({ length: 10 }).map((_, i) => (
        <group key={i} ref={(el) => void (refs.current[i] = el)} visible={false}>
          <Horse color={HERD_COLORS[i]} gait={gaits.current[i]} />
        </group>
      ))}
    </>
  )
}

/** Қансонар: Ata rides along, a fox in the hills, and the eagle's flight. */
export function Hunt() {
  const story = useGame((s) => s.story)
  const q = story.quests.qansonar
  const tracking = q.status === 'active' && q.step === 'tracking'
  const riding = q.status === 'active' && (q.step === 'tracking' || q.step === 'released')
  const fox = useRef<THREE.Group>(null)
  const eagle = useRef<THREE.Group>(null)
  const foxGait = useRef(0)
  const respawnAt = useRef(0)

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const now = state.clock.elapsedTime
    const p = sim.player
    // Ata follows the player on his white horse.
    const c = sim.companion
    if (riding && !c.active) Object.assign(c, { active: true, x: p.x - 4, z: p.z - 4, heading: p.heading, speed: 0 })
    if (!riding && c.active) c.active = false
    if (c.active) {
      const behindX = p.x - Math.sin(p.heading) * 5 + Math.cos(p.heading) * 3
      const behindZ = p.z - Math.cos(p.heading) * 5 - Math.sin(p.heading) * 3
      const d = Math.hypot(behindX - c.x, behindZ - c.z)
      c.speed = d > 1 ? Math.min(16, d * 1.5) : 0
      if (d > 1) c.heading = turnToward(c.heading, Math.atan2(behindX - c.x, behindZ - c.z), dt * 3)
      c.x += Math.sin(c.heading) * c.speed * dt
      c.z += Math.cos(c.heading) * c.speed * dt
      collide(c, 1.2)
    }

    if (tracking && !sim.fox && now > respawnAt.current && !sim.eagle) {
      const a = Math.random() * Math.PI * 2
      sim.fox = { x: HUNT_HILLS.x + Math.cos(a) * 35, z: HUNT_HILLS.z + Math.sin(a) * 35, heading: a, speed: 0, alerted: false, fled: false }
    }
    const f = sim.fox
    if (f) {
      const dx = f.x - p.x
      const dz = f.z - p.z
      const d = Math.hypot(dx, dz)
      // Upwind of the fox, it smells you; galloping, it hears you.
      const windward = (dx * WIND.x + dz * WIND.z) / Math.max(1, d) > 0.5
      if (!f.alerted && !sim.eagle && ((Math.abs(p.speed) > 9 && d < 80) || d < 14 || (windward && d < 55))) {
        f.alerted = true
        useGame
          .getState()
          .toast(story.lang === 'kk' ? 'Түлкі сезіп қалды!' : windward ? 'The fox caught your scent!' : 'The fox heard you!', 'bad')
      }
      if (sim.eagle?.caught) f.speed = 0
      else if (f.alerted) {
        f.speed = 11
        f.heading = turnToward(f.heading, Math.atan2(dx, dz), dt * 4)
      } else {
        f.speed = 1.2
        f.heading += Math.sin(now * 0.7) * dt
      }
      f.x += Math.sin(f.heading) * f.speed * dt
      f.z += Math.cos(f.heading) * f.speed * dt
      collide(f, 0.3)
      foxGait.current = f.speed
      place(fox.current, f.x, f.z, f.heading)
      if (f.alerted && d > 140 && !sim.eagle) {
        sim.fox = null
        sim.foxSpooked++
        respawnAt.current = now + 6
        useGame.getState().toast(story.lang === 'kk' ? 'Түлкі қашып кетті. Ата: «Асықпа, жел бетіңнен соқсын.»' : 'The fox bolted. Ата: “Slower — keep the wind in your face.”', 'info')
      }
    }
    if (fox.current) fox.current.visible = !!sim.fox

    // Eagle flight: from Ata's arm to the fox along an arc.
    const e = sim.eagle
    if (e && f) {
      e.t = Math.min(1, e.t + dt / 2.6)
      const x = e.from.x + (f.x - e.from.x) * e.t
      const z = e.from.z + (f.z - e.from.z) * e.t
      const ground = heightAt(x, z)
      const y = ground + 2 + Math.sin(e.t * Math.PI) * 18 * (1 - e.t * 0.5)
      if (eagle.current) {
        eagle.current.visible = true
        eagle.current.position.set(x, e.t >= 1 ? heightAt(f.x, f.z) + 0.5 : y, z)
        eagle.current.rotation.y = Math.atan2(f.x - e.from.x, f.z - e.from.z)
      }
      if (e.t >= 1 && q.step === 'tracking') {
        const g = useGame.getState()
        g.advanceByGame('qansonar', 'released', { caught: e.caught, spooked: sim.foxSpooked })
        g.remember(
          e.caught
            ? `On the first-snow hunt the player stalked the fox quietly${sim.foxSpooked ? ` (after spooking it ${sim.foxSpooked} time(s))` : ''} and Ata's eagle caught it.`
            : 'On the first-snow hunt the fox heard the player coming and escaped the eagle.',
          3,
        )
        g.toast(e.caught ? (story.lang === 'kk' ? 'Бүркіт түлкіні алды!' : 'The eagle caught the fox!') : story.lang === 'kk' ? 'Түлкі құтылып кетті.' : 'The fox escaped.', e.caught ? 'good' : 'bad')
      }
    } else if (eagle.current) eagle.current.visible = false
    if (q.status === 'done' && (sim.fox || sim.eagle)) {
      sim.fox = null
      sim.eagle = null
    }
  })

  return (
    <>
      <group ref={fox} visible={false}>
        <Fox gait={foxGait} />
      </group>
      <group ref={eagle} visible={false} scale={1.3}>
        <Eagle />
      </group>
    </>
  )
}

/** Works out what the player can do right now; the HUD shows it and Game handles the keys. */
export function Interactions() {
  useFrame(() => {
    const g = useGame.getState()
    const story = g.story
    const list: Interaction[] = []
    const p = sim.player
    if (story.activeNpc || story.scene !== 'aul') {
      interactions.list = list
      return
    }
    const lang = story.lang
    const reach = p.mounted ? 6 : 3.5
    let nearest: { id: NpcId; d: number } | null = null
    for (const id of presentNpcs(story)) {
      const pos = npcPosition(id)
      const d = Math.hypot(pos.x - p.x, pos.z - p.z)
      if (id === 'guest' && !sim.guest.arrived) continue
      if (d < reach && (!nearest || d < nearest.d)) nearest = { id, d }
    }
    if (nearest) {
      const id = nearest.id
      list.push({ key: 'E', label: `${t(lang, 'talkTo')} ${NPCS[id].name[lang]}`, act: () => g.openDialogue(id) })
    }

    const h = sim.playerHorse
    if (p.mounted) {
      if (Math.abs(p.speed) < 2) list.push({ key: 'F', label: t(lang, 'dismount'), act: () => dismount() })
    } else if (Math.hypot(h.x - p.x, h.z - p.z) < 3) {
      list.push({ key: 'F', label: t(lang, 'mount'), act: () => mount() })
    }

    const door = { x: FAMILY_YURT.x, z: FAMILY_YURT.z + YURT_RADIUS + 0.5 }
    const qonaq = story.quests.qonaq
    if (qonaq.status === 'active' && qonaq.step !== 'arrival' && qonaq.step !== 'greeted' && !p.mounted && Math.hypot(door.x - p.x, door.z - p.z) < 3) {
      list.push({ key: 'E', label: t(lang, 'enterYurt'), act: () => g.trigger('enter_yurt') })
    }

    if (story.quests.qansonar.status === 'done' && !p.mounted && Math.hypot(FIRE.x - p.x, FIRE.z - p.z) < 4.5) {
      list.push({ key: 'E', label: t(lang, 'evening'), act: () => window.dispatchEvent(new Event('open-finale')) })
    }

    const f = sim.fox
    if (f && !sim.eagle && story.quests.qansonar.step === 'tracking') {
      const d = Math.hypot(f.x - p.x, f.z - p.z)
      if (d < 50) {
        list.push({
          key: 'R',
          label: `${t(lang, 'releaseEagle')} (${Math.round(d)} m)`,
          act: () => {
            const from = sim.companion.active ? sim.companion : p
            sim.eagle = { t: 0, from: { x: from.x, z: from.z }, caught: !f.alerted || d < 30 }
          },
        })
      }
    }
    interactions.list = list
  })
  return null
}

function mount() {
  const p = sim.player
  const h = sim.playerHorse
  Object.assign(p, { x: h.x, z: h.z, heading: h.heading, speed: 0, mounted: true })
}

function dismount() {
  const p = sim.player
  p.mounted = false
  p.speed = 0
  sim.playerHorse.speed = 0
  p.x += Math.cos(p.heading) * 1.5
  p.z -= Math.sin(p.heading) * 1.5
}
