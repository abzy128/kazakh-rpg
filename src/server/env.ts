// Server-only. Never import this from client code: it reads API keys.

function optional(name: string) {
  const v = process.env[name]
  return v && v.trim() ? v.trim() : undefined
}

export const env = {
  get metaKey() {
    const v = optional('META_AI_API_KEY')
    if (!v) throw new Error('META_AI_API_KEY is not set')
    return v
  },
  get sonioxKey() {
    return optional('SONIOX_API_KEY')
  },
  /** Which provider transcribes Kazakh speech: Muse Voice Transcribe ("meta") or Soniox. */
  get kkSttProvider(): 'meta' | 'soniox' {
    return optional('KK_STT_PROVIDER') === 'soniox' && optional('SONIOX_API_KEY') ? 'soniox' : 'meta'
  },
  get demoPaused() {
    return optional('DEMO_PAUSED') === '1'
  },
  gmModel: optional('GM_MODEL') ?? 'muse-spark-1.3',
  imageModel: 'muse-image-1.0',
  sttModel: 'muse-voice-transcribe-1.0',
}
