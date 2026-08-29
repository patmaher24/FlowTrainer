export type ChannelStatistics = {
  count: number
  minimum: number
  p1: number
  median: number
  p99: number
  maximum: number
  aboveRange: number
}

function percentile(
  sortedValues: number[],
  fraction: number
): number {
  if (sortedValues.length === 0) {
    return 0
  }

  const position =
    Math.floor(
      (sortedValues.length - 1) *
      fraction
    )

  return sortedValues[position] ?? 0
}

export function analyzeChannel(
  values: number[],
  declaredRange?: number
): ChannelStatistics {
  const finiteValues =
    values.filter(
      Number.isFinite
    )

  if (finiteValues.length === 0) {
    return {
      count: 0,
      minimum: 0,
      p1: 0,
      median: 0,
      p99: 0,
      maximum: 0,
      aboveRange: 0
    }
  }

  const sortedValues =
    [...finiteValues].sort(
      (a, b) => a - b
    )

  const aboveRange =
    declaredRange &&
    declaredRange > 0
      ? finiteValues.filter(
          (value) =>
            value >= declaredRange
        ).length
      : 0

  return {
    count:
      finiteValues.length,

    minimum:
      sortedValues[0] ?? 0,

    p1:
      percentile(
        sortedValues,
        0.01
      ),

    median:
      percentile(
        sortedValues,
        0.5
      ),

    p99:
      percentile(
        sortedValues,
        0.99
      ),

    maximum:
      sortedValues[
        sortedValues.length - 1
      ] ?? 0,

    aboveRange
  }
}

export function logChannelDiagnostics(
  channelName: string,
  values: number[],
  declaredRange?: number,
  metadata?: {
    bits?: number
    range?: number
    exponent?: string
    gain?: string
  }
): void {
  const statistics =
    analyzeChannel(
      values,
      declaredRange
    )

  console.group(
    `Channel diagnostics: ${channelName}`
  )

  console.log(
    'Statistics:',
    statistics
  )

  if (metadata) {
    console.log(
      'Parameter metadata:',
      {
        bits:
          metadata.bits ?? 'Unknown',

        range:
          metadata.range ?? 'Unknown',

        exponent:
          metadata.exponent ?? 'Unknown',

        gain:
          metadata.gain ?? 'Unknown'
      }
    )
  }

  console.groupEnd()
}