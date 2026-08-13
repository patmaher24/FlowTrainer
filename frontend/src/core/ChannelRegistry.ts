import type { FlowData } from '../types'

export type ChannelKey = keyof FlowData

export type ChannelDefinition = {
  key: ChannelKey
  label: string
}

export const CHANNELS: ChannelDefinition[] = [
  {
    key: 'fsc',
    label: 'FSC-A'
  },
  {
    key: 'ssc',
    label: 'SSC-A'
  },
  {
    key: 'cd45',
    label: 'CD45'
  }
]

export function getChannelLabel(
  key: ChannelKey
): string {
  const channel = CHANNELS.find(
    (item) => item.key === key
  )

  return channel?.label ?? String(key)
}