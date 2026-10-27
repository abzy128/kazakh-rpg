import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { applyEffects, initialState } from '#/game/engine/engine'
import type { DialogueLine, Effect, Lang, NpcId, QuestFlags, QuestId, StoryState, TurnLog, WorldEvent } from '#/game/engine/types'

export type DialogueStatus = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking'

export interface Toast {
  id: number
  text: string
  tone: 'good' | 'bad' | 'info'
}

interface GameStore {
  story: StoryState
  status: DialogueStatus
  heard: string
  error: string
  gmLog: TurnLog[]
  toasts: Toast[]
  showLog: boolean
  showJournal: boolean
  /** NPC currently speaking a line, for subtitles and animation. */
  speaking: { npcId: NpcId; text: string; translationEn: string; terms: DialogueLine['terms'] } | null

  setLang: (lang: Lang) => void
  reset: (lang?: Lang) => void
  openDialogue: (npcId: NpcId) => void
  closeDialogue: () => void
  addPlayerLine: (text: string, action?: boolean) => void
  apply: (effects: Effect[]) => void
  advanceByGame: (questId: QuestId, toStep: string, flags?: QuestFlags) => void
  trigger: (event: WorldEvent) => void
  remember: (text: string, importance?: number) => void
  setStatus: (status: DialogueStatus) => void
  setHeard: (heard: string) => void
  setError: (error: string) => void
  setSpeaking: (s: GameStore['speaking']) => void
  pushLog: (log: TurnLog) => void
  toast: (text: string, tone?: Toast['tone']) => void
  toggleLog: () => void
  toggleJournal: () => void
}

let toastId = 0

export const useGame = create<GameStore>()(
  persist(
    (set, get) => ({
      story: initialState('en'),
      status: 'idle',
      heard: '',
      error: '',
      gmLog: [],
      toasts: [],
      showLog: false,
      showJournal: false,
      speaking: null,

      setLang: (lang) => set((s) => ({ story: { ...s.story, lang } })),
      reset: (lang) => set({ story: initialState(lang ?? get().story.lang), gmLog: [], heard: '', error: '', status: 'idle' }),
      openDialogue: (npcId) => set((s) => ({ story: { ...s.story, activeNpc: npcId }, heard: '', error: '' })),
      closeDialogue: () => set((s) => ({ story: { ...s.story, activeNpc: null }, status: 'idle', speaking: null })),
      addPlayerLine: (text, action) =>
        set((s) => ({ story: { ...s.story, dialogue: [...s.story.dialogue, { speaker: 'player' as const, text, action }].slice(-40) } })),
      apply: (effects) => {
        const { state, log } = applyEffects(get().story, effects)
        set({ story: state })
        for (const { effect, accepted } of log) {
          if (!accepted) continue
          if (effect.type === 'standing') get().toast(effect.reason, effect.delta > 0 ? 'good' : 'bad')
          if (effect.type === 'teach') get().toast(`📖 ${effect.kk} — ${effect.en}`, 'info')
        }
        return log
      },
      advanceByGame: (questId, toStep, flags) =>
        get().apply([{ type: 'quest', questId, toStep, source: 'game', flags }]),
      trigger: (event) => get().apply([{ type: 'event', event, source: 'game' }]),
      remember: (text, importance = 2) => get().apply([{ type: 'remember', text, importance }]),
      setStatus: (status) => set({ status }),
      setHeard: (heard) => set({ heard }),
      setError: (error) => set({ error }),
      setSpeaking: (speaking) => set({ speaking }),
      pushLog: (log) => set((s) => ({ gmLog: [log, ...s.gmLog].slice(0, 30) })),
      toast: (text, tone = 'info') => {
        const id = ++toastId
        set((s) => ({ toasts: [...s.toasts, { id, text, tone }] }))
        setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4500)
      },
      toggleLog: () => set((s) => ({ showLog: !s.showLog })),
      toggleJournal: () => set((s) => ({ showJournal: !s.showJournal })),
    }),
    {
      name: 'kazakh-rpg-save',
      version: 1,
      partialize: (s) => ({ story: { ...s.story, activeNpc: null } }),
    },
  ),
)
