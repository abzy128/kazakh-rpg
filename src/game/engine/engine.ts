import { QUESTS, QUEST_ORDER } from '#/content/aul-18c/quests'
import type { Effect, Lang, Phase, QuestId, StoryState, ToolCallLog } from './types'
import { NPC_IDS, WORLD_EVENTS } from './types'

export const MAX_MEMORIES = 40
export const MAX_DIALOGUE = 40
export const STANDING_RANGE = 10

const PHASE_FOR_QUEST: Record<QuestId, Phase> = {
  boran: 'morning',
  qonaq: 'midday',
  qansonar: 'afternoon',
}

export function initialState(lang: Lang = 'en'): StoryState {
  return {
    lang,
    phase: 'morning',
    weather: 'wind',
    scene: 'aul',
    quests: {
      boran: { status: 'active', step: QUESTS.boran.start, flags: {} },
      qonaq: { status: 'locked', step: QUESTS.qonaq.start, flags: {} },
      qansonar: { status: 'locked', step: QUESTS.qansonar.start, flags: {} },
    },
    standing: { ata: 0, apa: 0, guest: 0 },
    memories: [],
    journal: [],
    dialogue: [],
    activeNpc: null,
  }
}

export function activeQuest(state: StoryState): QuestId | null {
  return QUEST_ORDER.find((id) => state.quests[id].status === 'active') ?? null
}

export function dayComplete(state: StoryState): boolean {
  return QUEST_ORDER.every((id) => state.quests[id].status === 'done')
}

/** Checks one effect against the current state. Returns a reason when it must be rejected. */
export function rejectReason(state: StoryState, effect: Effect): string | null {
  switch (effect.type) {
    case 'say':
      if (!NPC_IDS.includes(effect.npcId)) return `unknown npc ${effect.npcId}`
      if (!effect.text.trim()) return 'empty line'
      return null
    case 'standing':
      if (!NPC_IDS.includes(effect.npcId)) return `unknown npc ${effect.npcId}`
      if (![-2, -1, 1, 2].includes(effect.delta)) return 'delta must be ±1 or ±2'
      return null
    case 'remember':
      return effect.text.trim() ? null : 'empty memory'
    case 'teach':
      if (state.journal.some((c) => c.kk.toLowerCase() === effect.kk.toLowerCase())) return 'already in journal'
      return effect.kk.trim() ? null : 'empty term'
    case 'end_conversation':
      return null
    case 'quest': {
      const def = QUESTS[effect.questId]
      if (!def) return `unknown quest ${effect.questId}`
      const q = state.quests[effect.questId]
      if (q.status !== 'active') return `quest ${effect.questId} is ${q.status}`
      const step = def.steps[q.step]
      if (!step.next.includes(effect.toStep)) return `cannot go ${q.step} → ${effect.toStep}`
      if (effect.source === 'gm' && !step.gmAdvances) return `step ${q.step} is advanced by gameplay, not the GM`
      return null
    }
    case 'event': {
      if (!WORLD_EVENTS.includes(effect.event)) return `unknown event ${effect.event}`
      if (effect.source === 'gm' && !allowedGmEvents(state).includes(effect.event)) return `event ${effect.event} not allowed in this step`
      return null
    }
  }
}

/** Events the game master may trigger right now. Game code may trigger any event. */
export function allowedGmEvents(state: StoryState) {
  const id = activeQuest(state)
  if (!id) return []
  return QUESTS[id].steps[state.quests[id].step].events
}

function applyEvent(state: StoryState, event: Effect & { type: 'event' }): StoryState {
  switch (event.event) {
    case 'storm_begins':
      return { ...state, weather: 'storm' }
    case 'storm_ends':
      return { ...state, weather: 'snowfall' }
    case 'enter_yurt':
      return { ...state, scene: 'yurt' }
    case 'leave_yurt':
      return { ...state, scene: 'aul' }
    case 'night_falls':
      return { ...state, phase: 'evening', weather: 'clear' }
    default:
      return state
  }
}

function applyOne(state: StoryState, effect: Effect): StoryState {
  switch (effect.type) {
    case 'say':
      return {
        ...state,
        dialogue: [
          ...state.dialogue,
          { speaker: effect.npcId, text: effect.text, translationEn: effect.translationEn, terms: effect.terms },
        ].slice(-MAX_DIALOGUE),
      }
    case 'standing': {
      const v = Math.max(-STANDING_RANGE, Math.min(STANDING_RANGE, state.standing[effect.npcId] + effect.delta))
      return { ...state, standing: { ...state.standing, [effect.npcId]: v } }
    }
    case 'remember': {
      const memories = [...state.memories, { text: effect.text, importance: effect.importance, quest: activeQuest(state) }]
      // Keep the most important memories when trimming, in story order.
      while (memories.length > MAX_MEMORIES) {
        const i = memories.reduce((lo, m, idx) => (m.importance < memories[lo].importance ? idx : lo), 0)
        memories.splice(i, 1)
      }
      return { ...state, memories }
    }
    case 'teach':
      return { ...state, journal: [...state.journal, { kk: effect.kk, translit: effect.translit, en: effect.en, note: effect.note }] }
    case 'end_conversation':
      return { ...state, activeNpc: null }
    case 'event':
      return applyEvent(state, effect)
    case 'quest': {
      const prev = state.quests[effect.questId]
      const done = QUESTS[effect.questId].steps[effect.toStep].next.length === 0
      const quests = {
        ...state.quests,
        [effect.questId]: {
          status: done ? 'done' : 'active',
          step: effect.toStep,
          flags: { ...prev.flags, ...effect.flags },
        },
      } as StoryState['quests']
      let next: StoryState = { ...state, quests }
      if (done) {
        const following = QUEST_ORDER[QUEST_ORDER.indexOf(effect.questId) + 1]
        if (following) {
          next = {
            ...next,
            phase: PHASE_FOR_QUEST[following],
            quests: { ...next.quests, [following]: { ...next.quests[following], status: 'active' } },
          }
        }
      }
      return next
    }
  }
}

/**
 * Applies effects in order, rejecting any that the current state does not allow.
 * The same function runs on the server (to validate the game master) and on the client (to update the game).
 */
export function applyEffects(state: StoryState, effects: Effect[]) {
  const log: { effect: Effect; accepted: boolean; why?: string }[] = []
  let next = state
  // Events are checked against the step the turn started in, so apply them before any quest advance.
  const ordered = [...effects].sort((a, b) => Number(b.type === 'event') - Number(a.type === 'event'))
  for (const effect of ordered) {
    let why = rejectReason(next, effect)
    if (why) {
      log.push({ effect, accepted: false, why })
      continue
    }
    next = applyOne(next, effect)
    log.push({ effect, accepted: true })
  }
  return { state: next, log }
}

export function toCallLog(log: ReturnType<typeof applyEffects>['log']): ToolCallLog[] {
  return log.map(({ effect, accepted, why }) => ({ name: effect.type, args: JSON.stringify(effect), accepted, why }))
}
