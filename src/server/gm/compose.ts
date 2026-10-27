import customs from '#/content/aul-18c/customs.md?raw'
import type { StoryState } from '#/game/engine/types'
import { env } from '../env'
import { meta } from '../meta'

export interface Chronicle {
  bataKk: string
  bataEn: string
  chronicleEn: string
  paintingPrompt: string
  steps: { tool: string; args: string }[]
  summary: string[]
}

function tool(name: string, description: string, properties: Record<string, unknown>) {
  return {
    type: 'function' as const,
    name,
    description,
    strict: true,
    parameters: { type: 'object', additionalProperties: false, properties, required: Object.keys(properties) },
  }
}

const TOOLS = [
  tool('recall', "Search the player's memories for a theme, e.g. 'guest', 'horses', 'eagle', 'mistakes'.", {
    theme: { type: 'string' },
  }),
  tool('consult_customs', 'Read the customs notes on a topic, e.g. "бата", "guest", "eagle".', {
    topic: { type: 'string' },
  }),
  tool('compose_bata', 'Finish: write the blessing and the chronicle of the day.', {
    bata_kk: {
      type: 'string',
      description: 'The blessing in Kazakh (Cyrillic), 4 to 8 short lines in the rhythm of a traditional бата, naming specific deeds of the day.',
    },
    bata_en: { type: 'string', description: 'A faithful English translation.' },
    chronicle_en: { type: 'string', description: 'Three to five sentences retelling the player’s day, in English.' },
    painting_prompt: {
      type: 'string',
      description:
        'A prompt for an illustration of the most memorable moment of the day: 18th-century Kazakh steppe, late autumn, first snow, painterly gouache style. No text in the image.',
    },
  }),
]

function search(text: string, query: string) {
  const words = query.toLowerCase().split(/\W+/u).filter((w) => w.length > 2)
  return text
    .split('\n\n')
    .filter((block) => words.some((w) => block.toLowerCase().includes(w)))
    .join('\n\n')
    .slice(0, 2500)
}

/**
 * The finale. Unlike per-turn calls, this is a small agent loop: the model recalls memories and
 * reads customs with tools before it composes Ata's blessing.
 */
export async function composeChronicle(state: StoryState): Promise<Chronicle> {
  const memories = state.memories.map((m) => `- [${m.quest ?? 'day'}] ${m.text}`).join('\n') || '- (no memories)'
  const flags = JSON.stringify(Object.fromEntries(Object.entries(state.quests).map(([id, q]) => [id, q.flags])))
  const steps: Chronicle['steps'] = []
  const summary: string[] = []

  let response = await meta().responses.create({
    model: env.gmModel,
    store: true,
    instructions:
      "It is evening in an 18th-century Kazakh aul. The family sits by the fire and Ata, the elder, gives the young player a бата (blessing) for the day. Before composing it, use recall and consult_customs to gather the player's specific deeds and the form of a бата. Then call compose_bata. Praise real good deeds by name, and turn mistakes into gentle wishes for growth. Never invent deeds that are not in the memories.",
    input: `Quest outcomes: ${flags}\nStanding with NPCs: ${JSON.stringify(state.standing)}\nWords learned: ${state.journal.map((j) => j.kk).join(', ') || 'none'}`,
    tools: TOOLS,
    reasoning: { effort: 'medium', summary: 'auto' },
    max_output_tokens: 4000,
  })

  for (let round = 0; round < 5; round++) {
    const outputs: { type: 'function_call_output'; call_id: string; output: string }[] = []
    for (const item of response.output) {
      if (item.type === 'reasoning') summary.push(...(item.summary ?? []).map((s) => s.text))
      if (item.type !== 'function_call') continue
      steps.push({ tool: item.name, args: item.arguments })
      const args = JSON.parse(item.arguments) as Record<string, string>
      if (item.name === 'compose_bata') {
        return {
          bataKk: args.bata_kk,
          bataEn: args.bata_en,
          chronicleEn: args.chronicle_en,
          paintingPrompt: args.painting_prompt,
          steps,
          summary,
        }
      }
      const result =
        item.name === 'recall'
          ? search(memories.replaceAll('\n', '\n\n'), args.theme) || memories
          : search(customs, args.topic) || 'No notes on that topic.'
      outputs.push({ type: 'function_call_output', call_id: item.call_id, output: result })
    }
    if (!outputs.length) break
    response = await meta().responses.create({
      model: env.gmModel,
      store: true,
      previous_response_id: response.id,
      input: outputs,
      tools: TOOLS,
      reasoning: { effort: 'medium', summary: 'auto' },
      max_output_tokens: 4000,
    })
  }
  throw new Error('The chronicle agent did not compose a blessing')
}
