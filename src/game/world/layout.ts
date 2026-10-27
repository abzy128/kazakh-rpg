// World layout and the ground height function every actor uses to stand on the terrain.

export const WORLD_HALF = 300
export const PLAYABLE_HALF = 270

export const FAMILY_YURT = { x: 0, z: -14, rot: 0 }
export const YURTS = [
  FAMILY_YURT,
  { x: -17, z: -6, rot: 0.9 },
  { x: 16, z: -9, rot: -0.8 },
  { x: -10, z: 13, rot: 2.6 },
]
export const YURT_RADIUS = 3.4
export const FIRE = { x: -3, z: -3 }
export const CORRAL = { x: 24, z: 12, r: 9 }
export const HORSE_POST = { x: 6, z: -1 }
export const PASTURE = { x: 120, z: 95 }
export const HUNT_HILLS = { x: -150, z: -160 }
/** Wind blows toward +x (from the west). */
export const WIND = { x: 1, z: 0.25 }

export const NPC_SPOTS = {
  ata: { x: 3.5, z: -8, rot: Math.PI },
  apa: { x: -5.5, z: -2.5, rot: Math.PI * 0.6 },
  guest: { x: 2, z: 7, rot: 0 },
}

function smoothstep(a: number, b: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function heightAt(x: number, z: number) {
  const rolling =
    3.2 * Math.sin(x * 0.011 + 0.5) * Math.cos(z * 0.0095) +
    1.6 * Math.sin(x * 0.029 + 1.3) * Math.sin(z * 0.023 + 0.4) +
    0.5 * Math.sin(x * 0.08) * Math.cos(z * 0.07)
  const hx = x - HUNT_HILLS.x
  const hz = z - HUNT_HILLS.z
  const hills = 24 * Math.exp(-(hx * hx + hz * hz) / (2 * 75 * 75))
  const ridge = 10 * Math.exp(-((x - 60) ** 2) / (2 * 40 ** 2)) * smoothstep(-260, -120, -z) * 0.6
  const edge = 30 * smoothstep(200, 300, Math.max(Math.abs(x), Math.abs(z)))
  const h = rolling + hills + ridge + edge
  // Flatten the aul.
  const d = Math.hypot(x, z)
  return h * smoothstep(32, 75, d) + 0.0
}

export const COLLIDERS: { x: number; z: number; r: number }[] = [
  ...YURTS.map((y) => ({ x: y.x, z: y.z, r: YURT_RADIUS })),
  { x: FIRE.x, z: FIRE.z, r: 1.1 },
]

/** Pushes a point out of every circle collider. */
export function collide(p: { x: number; z: number }, radius: number) {
  for (const c of COLLIDERS) {
    const dx = p.x - c.x
    const dz = p.z - c.z
    const d = Math.hypot(dx, dz)
    const min = c.r + radius
    if (d < min && d > 0.0001) {
      p.x = c.x + (dx / d) * min
      p.z = c.z + (dz / d) * min
    }
  }
  p.x = Math.max(-PLAYABLE_HALF, Math.min(PLAYABLE_HALF, p.x))
  p.z = Math.max(-PLAYABLE_HALF, Math.min(PLAYABLE_HALF, p.z))
}
