// Generates game art with Muse Image into public/generated/. Skips names that already have a file.
// The committed portraits were converted to 640px JPEG afterwards to keep them small.
// Run: bun scripts/gen-art.ts [--force] [name...]
import { existsSync, mkdirSync } from 'node:fs'
import OpenAI from 'openai'

const STYLE =
  'Painterly gouache illustration, warm muted earth palette, soft directional light, 18th-century Kazakh nomad culture, historically grounded clothing and objects, no text, no watermark.'

const ART: Record<string, { prompt: string; size: string }> = {
  'portrait-ata': {
    size: '768x1024',
    prompt: `${STYLE} Head-and-shoulders portrait of a 70-year-old Kazakh grandfather and eagle hunter (бүркітші): weathered kind face, white beard, fox-fur тымақ hat with ear flaps, dark brown wool чапан. A hooded golden eagle on his gloved right arm. Plain dark warm background.`,
  },
  'portrait-apa': {
    size: '768x1024',
    prompt: `${STYLE} Head-and-shoulders portrait of a 65-year-old Kazakh grandmother: warm, shrewd smile, white кимешек headdress of a married woman framing her face, deep red velvet камзол with embroidered trim, silver earrings. Plain dark warm background.`,
  },
  'portrait-guest': {
    size: '768x1024',
    prompt: `${STYLE} Head-and-shoulders portrait of a middle-aged Kazakh traveler who just rode through a snowstorm: dark beard with frost, rosy cold cheeks, a red бөрік cap trimmed with fur, dark blue quilted чапан dusted with snow, tired but polite eyes. Plain dark cool background.`,
  },
  'title': {
    size: '1536x864',
    prompt: `${STYLE} Wide landscape: a small Kazakh aul of white felt yurts on the autumn steppe at the moment the first snow begins, a herd of horses in the distance, a rider with a golden eagle on his arm, smoke rising from the yurts, vast sky. Cinematic composition with empty sky at the top for a title.`,
  },
}

const force = process.argv.includes('--force')
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const key = process.env.META_AI_API_KEY
if (!key) throw new Error('META_AI_API_KEY is not set')
const client = new OpenAI({ baseURL: 'https://api.meta.ai/v1', apiKey: key })
mkdirSync('public/generated', { recursive: true })

await Promise.all(
  Object.entries(ART)
    .filter(([name]) => !only.length || only.includes(name))
    .map(async ([name, { prompt, size }]) => {
      const file = `public/generated/${name}.webp`
      const existing = ['webp', 'jpg', 'png'].map((ext) => `public/generated/${name}.${ext}`).find((f) => existsSync(f))
      if (existing && !force) return console.log(`skip ${existing}`)
      const started = performance.now()
      const res = (await client.images.generate({
        model: 'muse-image-1.0',
        prompt,
        size,
        n: 1,
        output_format: 'webp',
      } as never)) as { data?: { b64_json?: string }[] }
      const b64 = res.data?.[0]?.b64_json
      if (!b64) throw new Error(`no image for ${name}`)
      await Bun.write(file, Buffer.from(b64, 'base64'))
      console.log(`wrote ${file} in ${Math.round(performance.now() - started)}ms`)
    }),
)
