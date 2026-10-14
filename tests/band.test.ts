import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

const PROPS = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 6,
  bodyColumns: 120,
  scroll: { offset: 0, bodyRows: 6 },
  view: {},
}
const H = 3600_000
const NOW = Date.parse('2026-10-14T12:00:00Z')

// Motorun altını bu test tutar: saat sabit, ölçüm olayı yankılanır.
function bottom(on: On) {
  mock.clock(on, { now: NOW })
  on('session.measure', ($, e) => ({ changed: e.changed }))
}

async function feed(engine: Engine) {
  const at = NOW
  await engine.session.measure({
    context: { tokens: 96_000, window: 200_000, percent: 48 },
    rateLimits: [
      { kind: 'five_hour', percentUsed: 20, resetsAt: new Date(at + 2 * H + 40 * 60_000).toISOString() },
      { kind: 'seven_day', percentUsed: 58, resetsAt: new Date(at + 31 * H).toISOString() },
    ],
    cost: { usd: 4.32 },
    changed: ['context', 'rateLimits', 'cost'],
  })
}

test('masaüstünde her hap ayrı bir etkileşimli Svg', async ($, on) => {
  bottom(on)
  await feed($)
  const ui = await $.ui.mount({ plugin: 'usage-band', surface: 'desktop', component: 'AbovePrompt', props: PROPS })
  const pills = await ui.findAll({ type: 'Svg' })

  expect(pills.map(p => p.props.alt)).toEqual([
    '5h 20%, 2h 40m',
    '7d 58%, 1d 7h',
    'maliyet $4.32',
  ])
  expect(pills).toHaveLength(3)
  expect(pills.every(p => p.props.isInteractive === true)).toBe(true)
  expect(String(pills[2]?.props.source)).toContain('API liste fiyatıyla')
})

test('terminalde renkli metin', async ($, on) => {
  bottom(on)
  await feed($)
  const ui = await $.ui.mount({ plugin: 'usage-band', surface: 'terminal', component: 'AbovePrompt', props: PROPS })

  expect(await ui.find({ type: 'Text', text: '$4.32' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /↑/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /│/ })).toBeDefined()
})

test('anket varken ve gizliyken motora bırakır', async ($, on) => {
  bottom(on)
  let engineDrew = 0
  on('ui.render', { component: 'AbovePrompt' }, () => {
    engineDrew += 1

    return { type: 'Text' as const, children: ['motor'] }
  })
  on('command.run', () => ({ text: '' }))
  await feed($)
  await $.ui.render({ surface: 'desktop', component: 'AbovePrompt', requestId: 'band', props: { ...PROPS, hasSurvey: true } })
  expect(engineDrew).toBe(1)

  await $.command.run({ command: 'kullanim', args: 'gizle' })
  await $.ui.render({ surface: 'desktop', component: 'AbovePrompt', requestId: 'band', props: PROPS })
  expect(engineDrew).toBe(2)
})
