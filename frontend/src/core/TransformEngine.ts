export type TransformKind =
  | 'linear'
  | 'arcsinh'
  | 'logicle'

export type TransformConfig = {
  kind: TransformKind
  cofactor?: number
  t?: number
  m?: number
  w?: number
  a?: number
}

export type TransformResult = {
  values: number[]
  inverse: (value: number) => number
}

type LogicleParameters = {
  t: number
  m: number
  w: number
  a: number
  b: number
  d: number
  x1: number
  coefficientA: number
  coefficientC: number
  coefficientF: number
}

const DEFAULT_COFACTOR = 150
const DEFAULT_T = 262144
const DEFAULT_M = 4.5
const DEFAULT_W = 0.5
const DEFAULT_A = 0

const channelTopOfScale =
  new Map<string, number>()

function normalizeChannelName(
  channelName: string
): string {
  return channelName
    .trim()
    .toUpperCase()
}

export function registerChannelTopOfScale(
  channelName: string,
  topOfScale: number
): void {
  if (
    !channelName.trim() ||
    !Number.isFinite(topOfScale) ||
    topOfScale <= 0
  ) {
    return
  }

  channelTopOfScale.set(
    normalizeChannelName(channelName),
    topOfScale
  )
}

export function clearChannelTopOfScaleRegistry():
  void {
  channelTopOfScale.clear()
}

function getRegisteredTopOfScale(
  channelName: string
): number | undefined {
  return channelTopOfScale.get(
    normalizeChannelName(channelName)
  )
}

export function isScatterChannel(
  channelName: string
): boolean {
  const upper =
    channelName.toUpperCase()

  return (
    upper.includes('FSC') ||
    upper.includes('SSC')
  )
}

export function getDefaultTransform(
  channelName: string
): TransformConfig {
  if (
    isScatterChannel(
      channelName
    )
  ) {
    return {
      kind: 'linear'
    }
  }

  return {
    kind: 'logicle',
    t:
      getRegisteredTopOfScale(
        channelName
      ) ??
      DEFAULT_T,
    m: DEFAULT_M,
    w: DEFAULT_W,
    a: DEFAULT_A
  }
}

function applyLinear(
  values: number[]
): TransformResult {
  return {
    values: [...values],

    inverse:
      (value: number) =>
        value
  }
}

function applyArcsinh(
  values: number[],
  cofactor: number
): TransformResult {
  const transformed =
    values.map(
      (value) =>
        Math.asinh(
          value /
          cofactor
        )
    )

  return {
    values:
      transformed,

    inverse:
      (value: number) =>
        Math.sinh(value) *
        cofactor
  }
}

function validateLogicleConfig(
  t: number,
  m: number,
  w: number,
  a: number
): void {
  if (
    !Number.isFinite(t) ||
    t <= 0
  ) {
    throw new Error(
      'Logicle T must be greater than zero.'
    )
  }

  if (
    !Number.isFinite(m) ||
    m <= 0
  ) {
    throw new Error(
      'Logicle M must be greater than zero.'
    )
  }

  if (
    !Number.isFinite(w) ||
    w < 0 ||
    w > m / 2
  ) {
    throw new Error(
      'Logicle W must satisfy 0 <= W <= M / 2.'
    )
  }

  if (
    !Number.isFinite(a) ||
    a < -w ||
    a > m - 2 * w
  ) {
    throw new Error(
      'Logicle A is outside the valid range.'
    )
  }
}

function solveD(
  b: number,
  normalizedW: number
): number {
  if (normalizedW === 0) {
    return b
  }

  let low =
    Number.EPSILON

  let high =
    b

  for (
    let iteration = 0;
    iteration < 100;
    iteration += 1
  ) {
    const middle =
      (low + high) / 2

    const value =
      2 *
        Math.log(
          middle / b
        ) +
      normalizedW *
        (b + middle)

    if (
      Math.abs(value) <
      1e-14
    ) {
      return middle
    }

    if (value > 0) {
      high = middle
    } else {
      low = middle
    }
  }

  return (
    low + high
  ) / 2
}

function createLogicleParameters(
  t: number,
  m: number,
  w: number,
  a: number
): LogicleParameters {
  validateLogicleConfig(
    t,
    m,
    w,
    a
  )

  const totalDecades =
    m + a

  const b =
    totalDecades *
    Math.LN10

  const normalizedW =
    w /
    totalDecades

  const x2 =
    a /
    totalDecades

  const x1 =
    x2 +
    normalizedW

  const x0 =
    x1 +
    normalizedW

  const d =
    solveD(
      b,
      normalizedW
    )

  const cOverA =
    Math.exp(
      (b + d) *
      x0
    )

  const fOverA =
    cOverA *
      Math.exp(
        -d * x1
      ) -
    Math.exp(
      b * x1
    )

  const denominator =
    Math.exp(b) -
    cOverA *
      Math.exp(-d) +
    fOverA

  const coefficientA =
    t /
    denominator

  const coefficientC =
    cOverA *
    coefficientA

  const coefficientF =
    fOverA *
    coefficientA

  return {
    t,
    m,
    w,
    a,
    b,
    d,
    x1,
    coefficientA,
    coefficientC,
    coefficientF
  }
}

function evaluateBiexponential(
  x: number,
  parameters: LogicleParameters
): number {
  return (
    parameters.coefficientA *
      Math.exp(
        parameters.b *
        x
      ) -
    parameters.coefficientC *
      Math.exp(
        -parameters.d *
        x
      ) +
    parameters.coefficientF
  )
}

function scaleLogicleValue(
  value: number,
  parameters: LogicleParameters
): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  if (value === 0) {
    return (
      parameters.x1 *
      parameters.m
    )
  }

  let low = 0
  let high = 1

  let lowValue =
    evaluateBiexponential(
      low,
      parameters
    )

  let highValue =
    evaluateBiexponential(
      high,
      parameters
    )

  let expansionCount = 0

  while (
    value < lowValue &&
    expansionCount < 32
  ) {
    high = low
    highValue = lowValue

    low -= 0.5

    lowValue =
      evaluateBiexponential(
        low,
        parameters
      )

    expansionCount += 1
  }

  expansionCount = 0

  while (
    value > highValue &&
    expansionCount < 32
  ) {
    low = high
    lowValue = highValue

    high += 0.5

    highValue =
      evaluateBiexponential(
        high,
        parameters
      )

    expansionCount += 1
  }

  for (
    let iteration = 0;
    iteration < 64;
    iteration += 1
  ) {
    const middle =
      (low + high) / 2

    const middleValue =
      evaluateBiexponential(
        middle,
        parameters
      )

    if (middleValue < value) {
      low = middle
    } else {
      high = middle
    }
  }

  return (
    (low + high) /
    2
  ) * parameters.m
}

function inverseLogicleValue(
  displayValue: number,
  parameters: LogicleParameters
): number {
  const scaleValue =
    displayValue /
    parameters.m

  return evaluateBiexponential(
    scaleValue,
    parameters
  )
}

function applyLogicle(
  values: number[],
  t: number,
  m: number,
  w: number,
  a: number
): TransformResult {
  const parameters =
    createLogicleParameters(
      t,
      m,
      w,
      a
    )

  const transformed =
    values.map(
      (value) =>
        scaleLogicleValue(
          value,
          parameters
        )
    )

  return {
    values:
      transformed,

    inverse:
      (value: number) =>
        inverseLogicleValue(
          value,
          parameters
        )
  }
}

export function transformChannel(
  values: number[],
  config: TransformConfig
): TransformResult {
  if (
    config.kind ===
    'linear'
  ) {
    return applyLinear(
      values
    )
  }

  if (
    config.kind ===
    'arcsinh'
  ) {
    return applyArcsinh(
      values,
      config.cofactor ??
        DEFAULT_COFACTOR
    )
  }

  return applyLogicle(
    values,
    config.t ??
      DEFAULT_T,
    config.m ??
      DEFAULT_M,
    config.w ??
      DEFAULT_W,
    config.a ??
      DEFAULT_A
  )
}