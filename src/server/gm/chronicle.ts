import { createServerFn } from '@tanstack/react-start'
import type { ImagesResponse } from 'openai/resources/images'
import type { StoryState } from '#/game/engine/types'
import { env } from '../env'
import { guard } from '../guard'
import { meta } from '../meta'
import { composeChronicle } from './compose'

export type { Chronicle } from './compose'

export const chronicle = createServerFn({ method: 'POST' })
  .validator((data: unknown) => data as { state: StoryState })
  .handler(async ({ data }) => {
    guard('chronicle')
    return composeChronicle(data.state)
  })

export const paintDay = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    const prompt = (data as { prompt?: unknown })?.prompt
    if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 2000) throw new Error('invalid prompt')
    return { prompt }
  })
  .handler(async ({ data }) => {
    guard('image')
    const image = (await meta().images.generate({
      model: env.imageModel,
      prompt: data.prompt,
      size: '1536x1024',
      n: 1,
      output_format: 'webp',
    })) as ImagesResponse
    const b64 = image.data?.[0]?.b64_json
    if (!b64) throw new Error('No image returned')
    return { dataUrl: `data:image/webp;base64,${b64}` }
  })
