export type Lang = 'en' | 'kk'
export type NpcId = 'ata' | 'apa' | 'guest'
export type QuestId = 'boran' | 'qonaq' | 'qansonar'
export type Emotion = 'warm' | 'stern' | 'amused' | 'worried' | 'calm' | 'excited' | 'sad'
export type QuestStatus = 'locked' | 'active' | 'done'
export type Weather = 'clear' | 'wind' | 'storm' | 'snowfall'
export type Phase = 'morning' | 'midday' | 'afternoon' | 'evening'
export type Scene = 'aul' | 'yurt'

export const NPC_IDS: NpcId[] = ['ata', 'apa', 'guest']
export const EMOTIONS: Emotion[] = ['warm', 'stern', 'amused', 'worried', 'calm', 'excited', 'sad']

export const WORLD_EVENTS = [
  'storm_begins',
  'storm_ends',
  'guest_arrives',
  'enter_yurt',
  'leave_yurt',
  'ride_out',
  'fox_appears',
  'night_falls',
] as const
export type WorldEvent = (typeof WORLD_EVENTS)[number]

export interface Term {
  kk: string
  translit: string
  en: string
}

export type Effect =
  | {
      type: 'say'
      npcId: NpcId
      text: string
      emotion: Emotion
      translationEn: string
      terms: Term[]
    }
  | { type: 'standing'; npcId: NpcId; delta: number; reason: string }
  | { type: 'remember'; text: string; importance: number }
  | { type: 'quest'; questId: QuestId; toStep: string; source: 'gm' | 'game'; flags?: QuestFlags }
  | { type: 'event'; event: WorldEvent; source: 'gm' | 'game' }
  | { type: 'teach'; kk: string; translit: string; en: string; note: string }
  | { type: 'end_conversation'; reason: string }

export type QuestFlags = Record<string, string | number | boolean>

export interface QuestState {
  status: QuestStatus
  step: string
  flags: QuestFlags
}

export interface Memory {
  text: string
  importance: number
  quest: QuestId | null
}

export interface DialogueLine {
  speaker: 'player' | NpcId
  text: string
  translationEn?: string
  terms?: Term[]
  action?: boolean
}

export interface VocabCard {
  kk: string
  translit: string
  en: string
  note: string
}

/** The narrative state the game master reads and changes. World simulation (positions) lives elsewhere. */
export interface StoryState {
  lang: Lang
  phase: Phase
  weather: Weather
  scene: Scene
  quests: Record<QuestId, QuestState>
  standing: Record<NpcId, number>
  memories: Memory[]
  journal: VocabCard[]
  dialogue: DialogueLine[]
  activeNpc: NpcId | null
}

export interface QuestStepDef {
  next: string[]
  /** Whether the game master may move the quest out of this step; otherwise game logic does. */
  gmAdvances: boolean
  /** Events the game master may trigger during this step. */
  events: WorldEvent[]
  /** What should happen in this step, for the game master. */
  goal: string
}

export interface QuestDef {
  id: QuestId
  title: { en: string; kk: string }
  start: string
  steps: Record<string, QuestStepDef>
}

export interface TurnInput {
  kind: 'speech' | 'text' | 'action'
  text: string
}

export interface ToolCallLog {
  name: string
  /** JSON-encoded arguments. */
  args: string
  accepted: boolean
  why?: string
}

export interface TurnLog {
  npcId: NpcId
  input: TurnInput
  summary: string[]
  narration: string
  calls: ToolCallLog[]
  ms: { stt?: number; gm: number; tts?: number }
  usage?: { input: number; cached: number; output: number }
}
