import Plotly from 'plotly.js-dist-min'

import {
  getDefaultTransform,
  transformChannel
} from '../core/TransformEngine'

import type {
  FlowData,
  PlotlySelectionEvent
} from '../types'

type PlotElement = HTMLDivElement & {
  on: (
    eventName: string,
    callback: (
      event: PlotlySelectionEvent
    ) => void
  ) => void
}

export type SelectionResult = {
  pointIndexes: number[]
  averageX: number
  averageY: number
}

type AxisRange = [
  number,
  number
]

function percentile(
  values: number[],
  fraction: number
): number {
  const finiteValues =
    values.filter(
      Number.isFinite
    )

  if (finiteValues.length === 0) {
    return 0
  }

  const sorted =
    [...finiteValues].sort(
      (a, b) => a - b
    )

  const index =
    Math.floor(
      (sorted.length - 1) *
      fraction
    )

  return sorted[index] ?? 0
}
function calculatePointDensity(
  xValues: number[],
  yValues: number[],
  xRange: AxisRange,
  yRange: AxisRange
): number[] {
  const gridSize = 100

  const xSpan =
    xRange[1] - xRange[0]

  const ySpan =
    yRange[1] - yRange[0]

  if (
    xSpan <= 0 ||
    ySpan <= 0
  ) {
    return xValues.map(() => 0)
  }

  const grid =
    new Map<string, number>()

  const cells =
    xValues.map(
      (x, index) => {
        const y =
          yValues[index] ?? 0

        const column =
          Math.floor(
            ((x - xRange[0]) / xSpan) *
            gridSize
          )

        const row =
          Math.floor(
            ((y - yRange[0]) / ySpan) *
            gridSize
          )

        return {
          column,
          row
        }
      }
    )

  for (const cell of cells) {
    const key =
      `${cell.column}:${cell.row}`

    grid.set(
      key,
      (grid.get(key) ?? 0) + 1
    )
  }

  return cells.map(
  (cell) => {
    let density = 0

    for (
      let columnOffset = -1;
      columnOffset <= 1;
      columnOffset += 1
    ) {
      for (
        let rowOffset = -1;
        rowOffset <= 1;
        rowOffset += 1
      ) {
        const neighborColumn =
          cell.column + columnOffset

        const neighborRow =
          cell.row + rowOffset

        const key =
          `${neighborColumn}:${neighborRow}`

        density +=
          grid.get(key) ?? 0
      }
    }

    return density
  }
)
}
function isScatterChannel(
  channelName: string
): boolean {
  const upper =
    channelName.toUpperCase()

  return (
    upper.includes('FSC') ||
    upper.includes('SSC')
  )
}

function getAxisRange(
  displayValues: number[],
  channelName: string
): AxisRange {
  if (
    isScatterChannel(
      channelName
    )
  ) {
    const upper =
      percentile(
        displayValues,
        0.99
      )

    return [
      0,
      upper > 0
        ? upper * 1.08
        : 1
    ]
  }

  const lower =
    percentile(
      displayValues,
      0.001
    )

  const upper =
    percentile(
      displayValues,
      0.999
    )

  if (lower === upper) {
    const padding =
      Math.abs(lower) * 0.1 || 1

    return [
      lower - padding,
      upper + padding
    ]
  }

  const span =
    upper - lower

  const padding =
    span * 0.05

  return [
    lower - padding,
    upper + padding
  ]
}

export class ScatterPlot {
  private element: PlotElement

  private rawXValues: number[]
  private rawYValues: number[]

  private displayXValues: number[]
  private displayYValues: number[]

  private xRange: AxisRange
  private yRange: AxisRange

  private xChannel: string
  private yChannel: string

  private xLabel: string
  private yLabel: string

  private title: string

  constructor(
    element: HTMLDivElement,
    data: FlowData,
    xChannel: string,
    yChannel: string,
    xLabel: string,
    yLabel: string,
    title: string
  ) {
    const xValues =
      data[xChannel]

    const yValues =
      data[yChannel]

    if (!Array.isArray(xValues)) {
      throw new Error(
        `The channel "${xChannel}" was not found.`
      )
    }

    if (!Array.isArray(yValues)) {
      throw new Error(
        `The channel "${yChannel}" was not found.`
      )
    }

    if (
      xValues.length !==
      yValues.length
    ) {
      throw new Error(
        `"${xChannel}" and "${yChannel}" ` +
        'contain different numbers of events.'
      )
    }

    this.element =
      element as PlotElement

    this.rawXValues =
      xValues

    this.rawYValues =
      yValues

    this.xChannel =
      xChannel

    this.yChannel =
      yChannel

    this.xLabel =
      xLabel

    this.yLabel =
      yLabel

    this.title =
      title

    this.displayXValues = []
    this.displayYValues = []

    this.xRange = [0, 1]
    this.yRange = [0, 1]

    this.updateDisplayValues()
  }

  private updateDisplayValues():
    void {
    const xTransform =
      transformChannel(
        this.rawXValues,
        getDefaultTransform(
          this.xChannel
        )
      )

    const yTransform =
      transformChannel(
        this.rawYValues,
        getDefaultTransform(
          this.yChannel
        )
      )

    this.displayXValues =
      xTransform.values

    this.displayYValues =
      yTransform.values

    this.xRange =
      getAxisRange(
        this.displayXValues,
        this.xChannel
      )

    this.yRange =
      getAxisRange(
        this.displayYValues,
        this.yChannel
      )
  }

  private getLayout() {
    return {
      title: {
        text: this.title
      },

      xaxis: {
        title: {
          text: this.xLabel
        },

        range:
          this.xRange,

        gridcolor:
          '#333'
      },

      yaxis: {
        title: {
          text: this.yLabel
        },

        range:
          this.yRange,

        gridcolor:
          '#333'
      },

      paper_bgcolor:
        '#1e1e1e',

      plot_bgcolor:
        '#000000',

      font: {
        color: '#ffffff'
      },

      dragmode:
        'lasso',

      selections: [],

      margin: {
        l: 70,
        r: 30,
        t: 70,
        b: 70
      }
    }
  }

  private getTraces() {
    const rawData =
      this.rawXValues.map(
        (
          rawX,
          index
        ) => [
          rawX,
          this.rawYValues[index]
        ]
      )
const rawDensityValues =
  calculatePointDensity(
    this.displayXValues,
    this.displayYValues,
    this.xRange,
    this.yRange
  )

const densityValues =
  rawDensityValues.map(
    (density) =>
      Math.log1p(density)
  )
    return [
      {
        x:
          this.displayXValues,

        y:
          this.displayYValues,

        customdata:
          rawData,

        mode:
          'markers',

        type:
          'scatter',

        marker: {
  size: 3,
  opacity: 0.8,
  color: densityValues,
  colorscale: 'Jet',
  showscale: false
},

        hovertemplate:
          `${this.xLabel}: %{customdata[0]:.0f}<br>` +
          `${this.yLabel}: %{customdata[1]:.0f}` +
          '<extra></extra>',

        showlegend:
          false
      },

      {
        x: [],
        y: [],

        mode:
          'markers',

        type:
          'scatter',

        marker: {
          size: 7,
          opacity: 1
        },

        hoverinfo:
          'skip',

        showlegend:
          false,

        visible:
          false
      }
    ]
  }

  async render():
    Promise<void> {
    await Plotly.newPlot(
      this.element,
      this.getTraces(),
      this.getLayout(),
      {
        responsive: true,
        displaylogo: false
      }
    )
  }

  onSelection(
    callback: (
      selection: SelectionResult
    ) => void
  ): void {
    this.element.on(
      'plotly_selected',

      (
        eventData:
          PlotlySelectionEvent
      ) => {
        const baseTracePoints =
          (
            eventData.points ?? []
          ).filter(
            (point) =>
              point.curveNumber ===
                undefined ||
              point.curveNumber ===
                0
          )

        if (
          baseTracePoints.length ===
          0
        ) {
          return
        }

        const pointIndexes =
          baseTracePoints
            .map(
              (point) =>
                point.pointNumber ??
                point.pointIndex
            )
            .filter(
              (
                index
              ): index is number =>
                typeof index ===
                  'number' &&
                index >= 0 &&
                index <
                  this.rawXValues.length
            )

        if (
          pointIndexes.length ===
          0
        ) {
          return
        }

        const averageX =
          pointIndexes.reduce(
            (
              sum,
              index
            ) =>
              sum +
              this.rawXValues[
                index
              ],

            0
          ) /
          pointIndexes.length

        const averageY =
          pointIndexes.reduce(
            (
              sum,
              index
            ) =>
              sum +
              this.rawYValues[
                index
              ],

            0
          ) /
          pointIndexes.length

        callback({
          pointIndexes,
          averageX,
          averageY
        })
      }
    )
  }

  async setChannels(
    data: FlowData,
    xChannel: string,
    yChannel: string,
    xLabel: string,
    yLabel: string
  ): Promise<void> {
    const xValues =
      data[xChannel]

    const yValues =
      data[yChannel]

    if (!Array.isArray(xValues)) {
      throw new Error(
        `The channel "${xChannel}" was not found.`
      )
    }

    if (!Array.isArray(yValues)) {
      throw new Error(
        `The channel "${yChannel}" was not found.`
      )
    }

    if (
      xValues.length !==
      yValues.length
    ) {
      throw new Error(
        `"${xChannel}" and "${yChannel}" ` +
        'contain different numbers of events.'
      )
    }

    this.rawXValues =
      xValues

    this.rawYValues =
      yValues

    this.xChannel =
      xChannel

    this.yChannel =
      yChannel

    this.xLabel =
      xLabel

    this.yLabel =
      yLabel

    this.title =
      `${xLabel} vs ${yLabel}`

    this.updateDisplayValues()

    await Plotly.react(
      this.element,
      this.getTraces(),
      this.getLayout(),
      {
        responsive: true,
        displaylogo: false
      }
    )
  }

  async showGate(
    pointIndexes: number[]
  ): Promise<void> {
    const validIndexes =
      pointIndexes.filter(
        (index) =>
          Number.isInteger(
            index
          ) &&
          index >= 0 &&
          index <
            this.displayXValues.length
      )

    const highlightedX =
      validIndexes.map(
        (index) =>
          this.displayXValues[
            index
          ]
      )

    const highlightedY =
      validIndexes.map(
        (index) =>
          this.displayYValues[
            index
          ]
      )

    await Plotly.restyle(
      this.element,
      {
        'marker.opacity':
          0.16
      },
      [0]
    )

    await Plotly.restyle(
      this.element,
      {
        x: [
          highlightedX
        ],

        y: [
          highlightedY
        ],

        visible:
          true
      },
      [1]
    )

    await Plotly.relayout(
      this.element,
      {
        selections: []
      }
    )
  }

  async clear():
    Promise<void> {
    await Plotly.restyle(
      this.element,
      {
        'marker.opacity':
          0.5
      },
      [0]
    )

    await Plotly.restyle(
      this.element,
      {
        x: [[]],
        y: [[]],
        visible: false
      },
      [1]
    )

    await Plotly.relayout(
      this.element,
      {
        selections: []
      }
    )
  }
}