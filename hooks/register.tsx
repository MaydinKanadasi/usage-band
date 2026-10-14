import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionUsage } from 'claude-code'

import type { UsageLimit } from '../types'
import { THEMES, costPill, fmtCost, fmtRemaining, level, limitPill, limitView, terminalBar } from './pills'

const limits = atom({ plugin: 'usage-band', key: 'limits' } as const, [])
const cost = atom({ plugin: 'usage-band', key: 'cost' } as const, null)
const now = atom({ plugin: 'usage-band', key: 'now' } as const, 0)
const isHidden = atom({ plugin: 'usage-band', key: 'isHidden' } as const, false)

const SHOWN_KINDS = ['five_hour', 'seven_day']

async function applyUsage($: EngineInterface, usage: Pick<SessionUsage, 'rateLimits' | 'cost'>) {
  const shown: UsageLimit[] = usage.rateLimits
    .filter(limit => SHOWN_KINDS.includes(limit.kind))
    .map(({ kind, percentUsed, resetsAt }) => (resetsAt ? { kind, percentUsed, resetsAt } : { kind, percentUsed }))
  const at = await $.clock.now()
  await update($, now, () => at)
  await update($, limits, () => shown)
  await update($, cost, () => usage.cost?.usd ?? null)
}

async function refreshAll($: EngineInterface) {
  await applyUsage($, await $.session.usage())
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'kullanim',
      description: 'Kullanım şeridini yeniler ve özet yazar; "gizle" kapatır, "goster" açar',
      argumentHint: '[gizle|goster]',
    })
    void refreshAll($).catch(() => undefined)
    $.clock.every(30_000, () => void refreshAll($).catch(() => undefined))

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await applyUsage($, e)

    return next(e)
  })

  on('command.run', { command: 'kullanim' }, async ($, e) => {
    const arg = e.args.trim().toLocaleLowerCase('tr')
    if (arg === 'gizle') {
      await update($, isHidden, () => true)

      return { text: 'Kullanım şeridi gizlendi. Geri açmak için: /kullanim goster' }
    }
    if (arg === 'goster' || arg === 'göster') {
      await update($, isHidden, () => false)

      return { text: 'Kullanım şeridi açıldı.' }
    }

    await refreshAll($)
    const at = await read($, now)
    const parts: string[] = []
    for (const limit of await read($, limits)) {
      const view = limitView(limit, at)
      parts.push(`${view.label} %${Math.round(view.percent)}${view.remainingMs !== null ? ` (${fmtRemaining(view.remainingMs)})` : ''}`)
    }
    const usd = await read($, cost)
    if (usd !== null) parts.push(fmtCost(usd))

    return { text: parts.length > 0 ? parts.join(' · ') : 'Henüz kullanım verisi yok.' }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden))) return next(e)

    const at = (await read($, now)) || (await $.clock.now())
    const views = (await read($, limits)).map(limit => limitView(limit, at))
    const usd = await read($, cost)
    if (views.length === 0 && usd === null) return next(e)

    if (e.surface === 'terminal') {
      const { Box, Text } = $.ui.resolve(e)
      const bar = { ok: 'success', warn: 'warning', bad: 'error' } as const

      return (
        <Box flexDirection="row" flexWrap="wrap" columnGap={3}>
          {views.length > 0 && (
            <Box key="limits" flexDirection="row" columnGap={2}>
              {views.map(view => (
                <Box key={view.kind} flexDirection="row">
                  <Text color={view.kind === 'seven_day' ? THEMES.seven_day.fgDark : THEMES.five_hour.fgDark}>{view.label} </Text>
                  <Text color={bar[level(view.percent)]}>{terminalBar(view.percent, view.elapsed)}</Text>
                  <Text bold> {Math.round(view.percent)}%</Text>
                  {view.remainingMs !== null && <Text dimColor> ⏱ {fmtRemaining(view.remainingMs)}</Text>}
                </Box>
              ))}
            </Box>
          )}
          {usd !== null && <Text color={THEMES.cost.fgDark}>{fmtCost(usd)}</Text>}
        </Box>
      )
    }

    const { Box, Svg } = $.ui.resolve(e)
    const groups = [views.map(limitPill), usd !== null ? [costPill(usd)] : []].filter(group => group.length > 0)

    return (
      <Box flexDirection="row" flexWrap="wrap" columnGap={2} rowGap={1}>
        {groups.map(group => (
          <Box key={group[0]!.group} flexDirection="row" flexWrap="wrap" columnGap={1} rowGap={1}>
            {group.map(pill => (
              <Svg source={pill.source} alt={pill.alt} width={pill.width} height={22} isInteractive />
            ))}
          </Box>
        ))}
      </Box>
    )
  })
}
