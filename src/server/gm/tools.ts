import { QUESTS } from '#/content/aul-18c/quests'
import type { Effect, Emotion, NpcId, QuestId, Term, WorldEvent } from '#/game/engine/types'
import { EMOTIONS, NPC_IDS, WORLD_EVENTS } from '#/game/engine/types'

function fn(name: string, description: string, properties: Record<string, unknown>) {
  return {
    type: 'function' as const,
    name,
    description,
    strict: true,
    parameters: { type: 'object', additionalProperties: false, properties, required: Object.keys(properties) },
  }
}

const allSteps = [...new Set(Object.values(QUESTS).flatMap((q) => Object.keys(q.steps)))]

export const GM_TOOLS = [
  fn('npc_say', 'Speak one line aloud as an NPC.', {
    npc_id: { type: 'string', enum: NPC_IDS },
    text: { type: 'string', description: 'The spoken line, in LANGUAGE.' },
    emotion: { type: 'string', enum: EMOTIONS },
    translation_en: { type: 'string', description: 'English translation when LANGUAGE is kk; otherwise empty.' },
    terms: {
      type: 'array',
      description: 'Kazakh words used in the line.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          kk: { type: 'string', description: 'Cyrillic, as written in the line' },
          translit: { type: 'string' },
          en: { type: 'string' },
        },
        required: ['kk', 'translit', 'en'],
      },
    },
  }),
  fn('adjust_standing', "Change how an NPC regards the player after the player followed or broke a custom.", {
    npc_id: { type: 'string', enum: NPC_IDS },
    delta: { type: 'integer', enum: [-2, -1, 1, 2] },
    reason: { type: 'string', description: 'Short, in English, e.g. "seated the guest at the төр".' },
  }),
  fn('remember', "Record a choice the player made that NPCs may bring up later today.", {
    text: { type: 'string', description: 'One sentence in English, third person: "The player ..."' },
    importance: { type: 'integer', enum: [1, 2, 3] },
  }),
  fn('advance_quest', 'Move the active quest to its next step when the step goal is met. Only allowed transitions.', {
    quest_id: { type: 'string', enum: Object.keys(QUESTS) },
    to_step: { type: 'string', enum: allSteps },
  }),
  fn('trigger_event', 'Make something happen in the world. Only allowed events.', {
    event: { type: 'string', enum: WORLD_EVENTS },
  }),
  fn('teach', "Add a Kazakh word or custom to the player's journal.", {
    kk: { type: 'string', description: 'Cyrillic' },
    translit: { type: 'string' },
    en: { type: 'string' },
    note: { type: 'string', description: 'One short sentence of cultural context in English.' },
  }),
  fn('end_conversation', 'The NPC ends the conversation, for example to go and do something.', {
    reason: { type: 'string' },
  }),
]

/** Turns a tool call into an effect. Returns null for unknown tools or malformed arguments. */
export function toEffect(name: string, rawArgs: string): Effect | null {
  let a: Record<string, unknown>
  try {
    a = JSON.parse(rawArgs)
  } catch {
    return null
  }
  const s = (k: string) => (typeof a[k] === 'string' ? (a[k] as string) : '')
  const n = (k: string) => (typeof a[k] === 'number' ? (a[k] as number) : 0)
  switch (name) {
    case 'npc_say':
      return {
        type: 'say',
        npcId: s('npc_id') as NpcId,
        text: s('text').trim(),
        emotion: (EMOTIONS as string[]).includes(s('emotion')) ? (s('emotion') as Emotion) : 'calm',
        translationEn: s('translation_en'),
        terms: Array.isArray(a.terms) ? (a.terms as Term[]).filter((t) => t && t.kk).slice(0, 4) : [],
      }
    case 'adjust_standing':
      return { type: 'standing', npcId: s('npc_id') as NpcId, delta: n('delta'), reason: s('reason') }
    case 'remember':
      return { type: 'remember', text: s('text'), importance: Math.max(1, Math.min(3, n('importance') || 1)) }
    case 'advance_quest':
      return { type: 'quest', questId: s('quest_id') as QuestId, toStep: s('to_step'), source: 'gm' }
    case 'trigger_event':
      return { type: 'event', event: s('event') as WorldEvent, source: 'gm' }
    case 'teach':
      return { type: 'teach', kk: s('kk'), translit: s('translit'), en: s('en'), note: s('note') }
    case 'end_conversation':
      return { type: 'end_conversation', reason: s('reason') }
    default:
      return null
  }
}
