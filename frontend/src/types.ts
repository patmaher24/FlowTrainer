export type FlowData = {
  fsc: number[]
  ssc: number[]
  cd45: number[]
}

export type SavedGate = {
  id: number
  name: string
  pointIndexes: number[]
  percentage: number
  population: string
}

export type PlotlySelectionPoint = {
  pointNumber?: number
  pointIndex?: number
  curveNumber?: number
  x: number
  y: number
}

export type PlotlySelectionEvent = {
  points?: PlotlySelectionPoint[]
}

export type GateAction =
  | 'select'
  | 'rename'
  | 'delete'