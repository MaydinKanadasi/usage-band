export type UsageLimit = { kind: string; percentUsed: number; resetsAt?: string }

declare module 'claude-code' {
  interface PluginState {
    'usage-band': {
      limits: UsageLimit[]
      cost: number | null
      now: number
      isHidden: boolean
    }
  }
}
