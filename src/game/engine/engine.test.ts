import { describe, expect, test } from 'bun:test'
import { activeQuest, applyEffects, initialState } from './engine'
import type { Effect } from './types'

const say: Effect = { type: 'say', npcId: 'ata', text: 'Сәлем, балам.', emotion: 'warm', translationEn: '', terms: [] }

describe('applyEffects', () => {
  test('accepts a spoken line and records it', () => {
    const { state, log } = applyEffects(initialState(), [say])
    expect(log[0].accepted).toBe(true)
    expect(state.dialogue.at(-1)?.text).toBe('Сәлем, балам.')
  })

  test('lets the GM advance only along the quest graph', () => {
    const s = initialState()
    const ok = applyEffects(s, [{ type: 'quest', questId: 'boran', toStep: 'herding', source: 'gm' }])
    expect(ok.state.quests.boran.step).toBe('herding')
    const skip = applyEffects(s, [{ type: 'quest', questId: 'boran', toStep: 'done', source: 'gm' }])
    expect(skip.log[0].accepted).toBe(false)
  })

  test('keeps gameplay steps away from the GM', () => {
    const herding = applyEffects(initialState(), [{ type: 'quest', questId: 'boran', toStep: 'herding', source: 'gm' }]).state
    const gm = applyEffects(herding, [{ type: 'quest', questId: 'boran', toStep: 'returned', source: 'gm' }])
    expect(gm.log[0].accepted).toBe(false)
    const game = applyEffects(herding, [{ type: 'quest', questId: 'boran', toStep: 'returned', source: 'game', flags: { horses_saved: 9 } }])
    expect(game.state.quests.boran.flags.horses_saved).toBe(9)
  })

  test('rejects locked quests and unlocks the next one when a quest ends', () => {
    let s = initialState()
    expect(applyEffects(s, [{ type: 'quest', questId: 'qonaq', toStep: 'greeted', source: 'gm' }]).log[0].accepted).toBe(false)
    s = applyEffects(s, [
      { type: 'quest', questId: 'boran', toStep: 'herding', source: 'gm' },
      { type: 'quest', questId: 'boran', toStep: 'returned', source: 'game' },
      { type: 'quest', questId: 'boran', toStep: 'done', source: 'gm' },
    ]).state
    expect(s.quests.boran.status).toBe('done')
    expect(activeQuest(s)).toBe('qonaq')
    expect(s.phase).toBe('midday')
  })

  test('only allows GM events listed for the current step', () => {
    const s = initialState()
    expect(applyEffects(s, [{ type: 'event', event: 'storm_begins', source: 'gm' }]).state.weather).toBe('storm')
    expect(applyEffects(s, [{ type: 'event', event: 'enter_yurt', source: 'gm' }]).log[0].accepted).toBe(false)
    expect(applyEffects(s, [{ type: 'event', event: 'enter_yurt', source: 'game' }]).state.scene).toBe('yurt')
  })

  test('checks GM events against the step the turn started in', () => {
    const { state, log } = applyEffects(initialState(), [
      { type: 'quest', questId: 'boran', toStep: 'herding', source: 'gm' },
      { type: 'event', event: 'storm_begins', source: 'gm' },
    ])
    expect(log.every((l) => l.accepted)).toBe(true)
    expect(state.weather).toBe('storm')
  })

  test('clamps standing and rejects odd deltas', () => {
    let s = initialState()
    for (let i = 0; i < 10; i++) s = applyEffects(s, [{ type: 'standing', npcId: 'guest', delta: 2, reason: 'x' }]).state
    expect(s.standing.guest).toBe(10)
    expect(applyEffects(s, [{ type: 'standing', npcId: 'guest', delta: 5, reason: 'x' }]).log[0].accepted).toBe(false)
  })

  test('does not teach the same word twice', () => {
    const teach: Effect = { type: 'teach', kk: 'төр', translit: 'tör', en: 'place of honor', note: '' }
    const s = applyEffects(initialState(), [teach]).state
    expect(applyEffects(s, [teach]).log[0].accepted).toBe(false)
  })

  test('trims the least important memories first', () => {
    let s = initialState()
    s = applyEffects(s, [{ type: 'remember', text: 'key moment', importance: 3 }]).state
    for (let i = 0; i < 50; i++) s = applyEffects(s, [{ type: 'remember', text: `minor ${i}`, importance: 1 }]).state
    expect(s.memories.length).toBe(40)
    expect(s.memories[0].text).toBe('key moment')
  })
})
