import type { NpcId } from '#/game/engine/types'

export interface NpcDef {
  id: NpcId
  name: { en: string; kk: string }
  role: string
  persona: string
  /** Soniox voice name. Same voice for both languages. */
  voice: string
  /** Fallback browser voice pitch when Soniox is unavailable. */
  pitch: number
  look: { robe: string; hat: string; hatShape: 'borik' | 'kimeshek' | 'tymak'; beard: boolean; height: number }
  portrait: string
}

export const NPCS: Record<NpcId, NpcDef> = {
  ata: {
    id: 'ata',
    name: { en: 'Ata', kk: 'Ата' },
    role: 'grandfather, head of the family, eagle hunter (бүркітші)',
    persona:
      'Seventy winters old, unhurried, dry humor. Speaks in short sentences and proverbs. Teaches by asking questions. Strict about respect for elders, guests and animals, but proud of the player and quick to praise effort. Keeps a golden eagle named Қаракөз.',
    voice: 'Daniel',
    pitch: 0.7,
    look: { robe: '#5b3a29', hat: '#3a2a1e', hatShape: 'tymak', beard: true, height: 1.0 },
    portrait: '/generated/portrait-ata.jpg',
  },
  apa: {
    id: 'apa',
    name: { en: 'Apa', kk: 'Апа' },
    role: 'grandmother, runs the household',
    persona:
      'Warm, practical and quick. Knows every custom of hospitality and quietly coaches the player, often in a whisper so the guest will not hear. Teases Ata. Worries about everyone being fed and warm.',
    voice: 'Maya',
    pitch: 1.1,
    look: { robe: '#7a2e3a', hat: '#f2ede2', hatShape: 'kimeshek', beard: false, height: 0.94 },
    portrait: '/generated/portrait-apa.jpg',
  },
  guest: {
    id: 'guest',
    name: { en: 'Traveler', kk: 'Жолаушы' },
    role: 'a traveler from a distant aul, caught by the storm',
    persona:
      'Middle-aged rider, tired and frozen, polite and observant. Notices how he is received and responds in kind: warm and generous with news when honored, cool and brief when slighted. Carries news from the east: herds moving early to winter camps and talk of a gathering of elders.',
    voice: 'Adrian',
    pitch: 0.95,
    look: { robe: '#2f4a5c', hat: '#6b4a2b', hatShape: 'borik', beard: true, height: 1.02 },
    portrait: '/generated/portrait-guest.jpg',
  },
}
