// Push-to-talk capture: mono 24 kHz 16-bit PCM, wrapped as WAV for Muse Voice Transcribe.

export const SAMPLE_RATE = 24000
const MAX_SECONDS = 15

const WORKLET = `
class PcmRecorder extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0]
    if (ch) this.port.postMessage(ch.slice(0))
    return true
  }
}
registerProcessor('pcm-recorder', PcmRecorder)
`

let ctx: AudioContext | null = null
let stream: MediaStream | null = null
let node: AudioWorkletNode | null = null
let chunks: Float32Array[] = []
let recording = false

/** Call from a user gesture (the Play button) so the browser allows audio. */
export async function unlockAudio() {
  ctx ??= new AudioContext({ sampleRate: SAMPLE_RATE })
  if (ctx.state === 'suspended') await ctx.resume()
  return ctx
}

async function ensureMic() {
  const audio = await unlockAudio()
  if (!stream) {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    })
  }
  if (!node) {
    const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }))
    await audio.audioWorklet.addModule(url)
    URL.revokeObjectURL(url)
    const source = audio.createMediaStreamSource(stream)
    node = new AudioWorkletNode(audio, 'pcm-recorder')
    node.port.onmessage = (e: MessageEvent<Float32Array>) => {
      if (recording && chunks.length * 128 < SAMPLE_RATE * MAX_SECONDS) chunks.push(e.data)
    }
    source.connect(node)
  }
}

export async function startRecording() {
  await ensureMic()
  chunks = []
  recording = true
}

export function isRecording() {
  return recording
}

/** Stops capture and returns a WAV file, or null if nothing useful was recorded. */
export function stopRecording(): ArrayBuffer | null {
  recording = false
  const length = chunks.reduce((n, c) => n + c.length, 0)
  if (length < SAMPLE_RATE * 0.3) return null
  const samples = new Float32Array(length)
  let offset = 0
  for (const c of chunks) {
    samples.set(c, offset)
    offset += c.length
  }
  chunks = []
  return encodeWav(samples)
}

function encodeWav(samples: Float32Array) {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const v = new DataView(buffer)
  const str = (o: number, s: string) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)))
  str(0, 'RIFF')
  v.setUint32(4, 36 + samples.length * 2, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true) // PCM
  v.setUint16(22, 1, true) // mono
  v.setUint32(24, SAMPLE_RATE, true)
  v.setUint32(28, SAMPLE_RATE * 2, true)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  str(36, 'data')
  v.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return buffer
}
