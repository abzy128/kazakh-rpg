import OpenAI from 'openai'
import { env } from './env'

export const META_BASE_URL = 'https://api.meta.ai/v1'

let client: OpenAI | undefined

/** OpenAI SDK pointed at Meta Model API. */
export function meta() {
  client ??= new OpenAI({ baseURL: META_BASE_URL, apiKey: env.metaKey, maxRetries: 2, timeout: 60_000 })
  return client
}
