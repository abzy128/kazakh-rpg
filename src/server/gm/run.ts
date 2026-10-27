import { applyEffects, toCallLog } from '#/game/engine/engine'
import type { Effect, NpcId, StoryState, TurnInput, TurnLog } from '#/game/engine/types'
import { env } from '../env'
import { meta } from '../meta'
import { STATIC_PROMPT, turnPrompt } from './prompt'
import { GM_TOOLS, toEffect } from './tools'

export interface TurnResult {
  effects: Effect[]
  log: TurnLog
}

export async function runTurn(
  state: StoryState,
  npc: NpcId,
  present: NpcId[],
  input: TurnInput,
): Promise<TurnResult> {
  const started = performance.now()
  const response = await meta().responses.create({
    model: env.gmModel,
    store: false,
    instructions: STATIC_PROMPT,
    input: [{ role: 'user', content: turnPrompt(state, npc, present, input) }],
    tools: GM_TOOLS,
    parallel_tool_calls: true,
    reasoning: { effort: 'minimal', summary: 'auto' },
    max_output_tokens: 1500,
  })
  const ms = Math.round(performance.now() - started)

  const summary: string[] = []
  let narration = ''
  const proposed: Effect[] = []
  const malformed: TurnLog['calls'] = []
  for (const item of response.output) {
    if (item.type === 'reasoning') summary.push(...(item.summary ?? []).map((s) => s.text))
    if (item.type === 'message') {
      narration += item.content.map((c) => ('text' in c ? c.text : '')).join(' ')
    }
    if (item.type === 'function_call') {
      const effect = toEffect(item.name, item.arguments)
      if (effect) proposed.push(effect)
      else malformed.push({ name: item.name, args: item.arguments, accepted: false, why: 'malformed arguments' })
    }
  }

  // tool_choice only supports "auto" on Meta Model API, so a turn can come back without a spoken line.
  if (!proposed.some((e) => e.type === 'say')) {
    const fallback = narration.trim()
    proposed.unshift({
      type: 'say',
      npcId: npc,
      text: fallback || (state.lang === 'kk' ? 'Хм... Тағы бір айтшы, балам.' : 'Hm... say that again, балам.'),
      emotion: 'calm',
      translationEn: fallback || state.lang !== 'kk' ? '' : 'Hm... say it once more, my child.',
      terms: [],
    })
    narration = ''
  }
  // Keep at most two spoken lines per turn.
  let says = 0
  const capped = proposed.filter((e) => e.type !== 'say' || ++says <= 2)

  // Validate against the quest graph and rules; the client re-applies the accepted effects.
  const { log } = applyEffects(state, capped)
  const accepted = log.filter((l) => l.accepted).map((l) => l.effect)

  return {
    effects: accepted,
    log: {
      npcId: npc,
      input,
      summary,
      narration: narration.trim(),
      calls: [...toCallLog(log), ...malformed],
      ms: { gm: ms },
      usage: response.usage
        ? {
            input: response.usage.input_tokens,
            cached: response.usage.input_tokens_details?.cached_tokens ?? 0,
            output: response.usage.output_tokens,
          }
        : undefined,
    },
  }
}
