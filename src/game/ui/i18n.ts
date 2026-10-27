import type { Lang } from '#/game/engine/types'

const STRINGS = {
  listening: { en: 'Listening', kk: 'Тыңдап тұр' },
  transcribing: { en: 'Hearing you', kk: 'Естіп жатыр' },
  thinking: { en: 'Thinking', kk: 'Ойланып жатыр' },
  heard: { en: 'Heard', kk: 'Естілгені' },
  hold: { en: 'Hold', kk: 'Басып тұр' },
  type: { en: 'Or type your answer and press Enter', kk: 'Немесе жазып, Enter басыңыз' },
  talkTo: { en: 'Talk to', kk: 'Сөйлесу:' },
  mount: { en: 'Mount horse', kk: 'Атқа міну' },
  dismount: { en: 'Dismount', kk: 'Аттан түсу' },
  journal: { en: 'Journal', kk: 'Күнделік' },
  standing: { en: 'Respect', kk: 'Абырой' },
  words: { en: 'Words learned', kk: 'Үйренген сөздер' },
  memories: { en: 'What they remember', kk: 'Есте қалғаны' },
  horsesPenned: { en: 'Horses in the corral', kk: 'Қорадағы жылқылар' },
  stormIn: { en: 'Storm in', kk: 'Боранға дейін' },
  releaseEagle: { en: 'Release the eagle', kk: 'Бүркітті ұшыру' },
  enterYurt: { en: 'Enter the yurt', kk: 'Үйге кіру' },
  evening: { en: 'Sit by the fire for the evening blessing', kk: 'Кешкі батаға от басына отыру' },
} as const

export type StringKey = keyof typeof STRINGS

export function t(lang: Lang, key: StringKey) {
  return STRINGS[key][lang]
}
