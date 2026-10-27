import type { QuestDef, QuestId } from '#/game/engine/types'

export const QUEST_ORDER: QuestId[] = ['boran', 'qonaq', 'qansonar']

export const QUESTS: Record<QuestId, QuestDef> = {
  boran: {
    id: 'boran',
    title: { en: 'The Storm', kk: 'Боран' },
    start: 'intro',
    steps: {
      intro: {
        next: ['herding'],
        gmAdvances: true,
        events: ['storm_begins'],
        goal: 'Ata notices signs of a blizzard and asks the player to bring the horse herd from the far pasture into the corral. Advance to "herding" (and trigger storm_begins) once the player agrees to go.',
      },
      herding: {
        next: ['returned'],
        gmAdvances: false,
        events: [],
        goal: 'The player is out herding. The game ends this step when the horses are penned or the storm hits.',
      },
      returned: {
        next: ['done'],
        gmAdvances: true,
        events: ['storm_ends'],
        goal: 'Ata reacts to how many horses were saved (flag horses_saved of horses_total). Teach a weather sign or a word about horses. Advance to "done" when the talk winds down.',
      },
      done: { next: [], gmAdvances: false, events: [], goal: 'Finished.' },
    },
  },
  qonaq: {
    id: 'qonaq',
    title: { en: 'The Guest', kk: 'Қонақ' },
    start: 'arrival',
    steps: {
      arrival: {
        next: ['greeted'],
        gmAdvances: true,
        events: [],
        goal: 'A traveler caught by the storm rides up to the yurt. The player should greet him first and respectfully. Advance to "greeted" once the player has greeted him (well or badly — record how).',
      },
      greeted: {
        next: ['inside'],
        gmAdvances: true,
        events: ['enter_yurt'],
        goal: 'The player should take care of the guest\'s horse and invite him inside. When the player invites him in, advance to "inside" and trigger enter_yurt.',
      },
      inside: {
        next: ['seated'],
        gmAdvances: false,
        events: [],
        goal: 'Inside the yurt the player must choose where the guest sits (the game reports it as an action). The place of honor is the төр, opposite the door.',
      },
      seated: {
        next: ['served'],
        gmAdvances: false,
        events: [],
        goal: 'The player should offer water to wash hands and serve the meal (reported as actions). Asking the guest\'s business before he has eaten is impolite.',
      },
      served: {
        next: ['talked'],
        gmAdvances: true,
        events: [],
        goal: 'After the meal the guest can be asked about his road and news. He shares news from afar if he was hosted well. Advance to "talked" after he has shared his news.',
      },
      talked: {
        next: ['farewell'],
        gmAdvances: true,
        events: [],
        goal: 'The conversation winds down. The guest may bless the household after the meal. Advance to "farewell" when it is time to rest or part.',
      },
      farewell: {
        next: ['done'],
        gmAdvances: true,
        events: ['leave_yurt'],
        goal: 'The household rests; the guest thanks the hosts. Advance to "done" and trigger leave_yurt.',
      },
      done: { next: [], gmAdvances: false, events: [], goal: 'Finished.' },
    },
  },
  qansonar: {
    id: 'qansonar',
    title: { en: 'First Snow Hunt', kk: 'Қансонар' },
    start: 'intro',
    steps: {
      intro: {
        next: ['tracking'],
        gmAdvances: true,
        events: ['ride_out', 'fox_appears'],
        goal: 'The storm left fresh snow: қансонар, the best time to hunt with the golden eagle. Ata invites the player to ride out with his eagle and explains how: approach at a walk with the wind blowing into your face (so the fox cannot smell you), then unhood and release. Advance to "tracking" and trigger fox_appears once the player is ready.',
      },
      tracking: {
        next: ['released'],
        gmAdvances: false,
        events: [],
        goal: 'The player is stalking the fox. The game ends this step when the eagle is released (flag caught true/false).',
      },
      released: {
        next: ['done'],
        gmAdvances: true,
        events: ['night_falls'],
        goal: 'Ata reacts to the hunt (flag caught). Teach about the eagle (бүркіт) and sharing the catch. Advance to "done" and trigger night_falls when the talk ends.',
      },
      done: { next: [], gmAdvances: false, events: [], goal: 'Finished.' },
    },
  },
}
