import { getRequestIP } from '@tanstack/react-start/server'
import { env } from './env'

// In-memory limits. Good enough for a single long-lived server; resets on restart.
const WINDOW_MS = 10 * 60_000
const LIMITS = { gm: 60, stt: 60, tts: 90, chronicle: 4, image: 3 } as const
const DAILY_GM_CAP = Number(process.env.DAILY_GM_CAP ?? 4000)

const hits = new Map<string, number[]>()
let day = new Date().toDateString()
let gmToday = 0

export class GuardError extends Error {
  status = 429
}

export function guard(kind: keyof typeof LIMITS, ip?: string) {
  if (env.demoPaused) throw new GuardError('The demo is paused right now. Please try again later.')
  const today = new Date().toDateString()
  if (today !== day) {
    day = today
    gmToday = 0
  }
  if (kind === 'gm' && ++gmToday > DAILY_GM_CAP) throw new GuardError('The demo reached its daily limit. Please come back tomorrow.')

  const who = ip ?? safeIp() ?? 'unknown'
  const key = `${kind}:${who}`
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  if (recent.length >= LIMITS[kind]) throw new GuardError('Too many requests. Slow down a little.')
  recent.push(now)
  hits.set(key, recent)
}

function safeIp() {
  try {
    return getRequestIP({ xForwardedFor: true })
  } catch {
    return undefined
  }
}
