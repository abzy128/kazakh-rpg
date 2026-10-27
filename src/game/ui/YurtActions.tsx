import { sendTurn } from '#/game/dialogue/controller'
import { useGame } from '#/game/state/store'

// Hospitality actions inside the yurt. Each one is both a gameplay step and an input the game master judges.

interface Action {
  label: { en: string; kk: string }
  describe: string
  run: () => void
}

export function YurtActions() {
  const story = useGame((s) => s.story)
  const status = useGame((s) => s.status)
  const q = story.quests.qonaq
  const lang = story.lang
  if (story.scene !== 'yurt') return null
  if (q.status === 'done') {
    return (
      <button onClick={() => useGame.getState().trigger('leave_yurt')} className="self-start rounded-lg bg-amber-700 px-3 py-1.5 text-xs text-white hover:bg-amber-600">
        {lang === 'kk' ? 'Сыртқа шығу' : 'Step outside'}
      </button>
    )
  }
  const busy = status !== 'idle' && status !== 'speaking'
  const g = useGame.getState

  const act = (describe: string, before?: () => void) => () => {
    before?.()
    sendTurn({ kind: 'action', text: describe })
  }

  let actions: Action[] = []
  if (q.step === 'inside') {
    actions = [
      {
        label: { en: 'Seat him at the төр', kk: 'Төрге отырғызу' },
        describe: 'invited the guest to sit at the төр, the place of honor opposite the door',
        run: act('invited the guest to sit at the төр, the place of honor opposite the door', () =>
          g().advanceByGame('qonaq', 'seated', { seat: 'tor' }),
        ),
      },
      {
        label: { en: 'Seat him by the door', kk: 'Босағаға отырғызу' },
        describe: 'pointed the guest to the cushion by the door (босаға)',
        run: act('pointed the guest to the cushion by the door (босаға)', () => g().advanceByGame('qonaq', 'seated', { seat: 'door' })),
      },
    ]
  } else if (q.step === 'seated') {
    const washed = !!q.flags.washed
    actions = [
      ...(!washed
        ? [
            {
              label: { en: 'Pour water for his hands', kk: 'Қолына су құю' },
              describe: 'brought the jug and basin and poured water for the guest to wash his hands',
              run: act('brought the jug and basin and poured water for the guest to wash his hands', () =>
                useGame.setState((s) => ({
                  story: { ...s.story, quests: { ...s.story.quests, qonaq: { ...s.story.quests.qonaq, flags: { ...s.story.quests.qonaq.flags, washed: true } } } },
                })),
              ),
            },
          ]
        : []),
      {
        label: { en: 'Serve meat, the head (бас) to the guest', kk: 'Ет тарту, басты қонаққа' },
        describe: 'served the boiled meat and offered the sheep’s head (бас) to the guest',
        run: act('served the boiled meat and offered the sheep’s head (бас) to the guest', () =>
          g().advanceByGame('qonaq', 'served', { head_to: 'guest', washed_first: washed }),
        ),
      },
      {
        label: { en: 'Serve meat, the head to Ата', kk: 'Ет тарту, басты Атаға' },
        describe: 'served the boiled meat and put the sheep’s head (бас) in front of Ата instead of the guest',
        run: act('served the boiled meat and put the sheep’s head (бас) in front of Ата instead of the guest', () =>
          g().advanceByGame('qonaq', 'served', { head_to: 'ata', washed_first: washed }),
        ),
      },
    ]
  } else if (q.step === 'farewell') {
    actions = [
      {
        label: { en: 'See him off to his horse', kk: 'Атына дейін шығарып салу' },
        describe: 'walked the guest out and held his horse while he mounted',
        run: act('walked the guest out and held his horse while he mounted'),
      },
    ]
  }

  if (!actions.length) return null
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a) => (
        <button
          key={a.describe}
          disabled={busy}
          onClick={a.run}
          className="rounded-lg border border-amber-700/60 bg-stone-800 px-3 py-1.5 text-xs text-amber-100 hover:bg-stone-700 disabled:opacity-40"
        >
          {a.label[lang]}
        </button>
      ))}
    </div>
  )
}
