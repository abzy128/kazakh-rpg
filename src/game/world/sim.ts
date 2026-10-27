import { HORSE_POST } from './layout'

// Mutable per-frame simulation state, shared by components without React re-renders.

export interface Body {
  x: number
  z: number
  heading: number
  speed: number
}

export interface HerdHorse extends Body {
  vx: number
  vz: number
  penned: boolean
  color: string
}

export const sim = {
  player: { x: 4, z: 6, heading: Math.PI, speed: 0, mounted: false } as Body & { mounted: boolean },
  playerHorse: { x: HORSE_POST.x, z: HORSE_POST.z, heading: Math.PI / 2, speed: 0 } as Body,
  cameraYaw: 0,
  herd: [] as HerdHorse[],
  herdTimer: 0,
  herdDuration: 210,
  stormLevel: 0,
  guest: { x: 0, z: 70, heading: Math.PI, speed: 0, arrived: false },
  fox: null as null | (Body & { alerted: boolean; fled: boolean }),
  foxSpooked: 0,
  eagle: null as null | { t: number; from: { x: number; z: number }; caught: boolean },
  companion: { x: 0, z: 0, heading: 0, speed: 0, active: false },
  keys: new Set<string>(),
}

export const HERD_COLORS = ['#6b4423', '#3b2a1e', '#8a5a33', '#c9b18a', '#2a211b', '#7a4b2a', '#d8cfc0', '#5a3a22', '#a06a3a', '#4a3020']

export function spawnHerd(cx: number, cz: number) {
  sim.herd = HERD_COLORS.map((color, i) => {
    const a = (i / HERD_COLORS.length) * Math.PI * 2
    return { x: cx + Math.cos(a) * 9, z: cz + Math.sin(a) * 9, heading: a, speed: 0, vx: 0, vz: 0, penned: false, color }
  })
  sim.herdTimer = 0
}
