import Plotly from 'plotly.js-dist-min'

import type {
  FlowData,
  PlotlySelectionEvent
} from '../types'

type PlotElement = HTMLDivElement & {
  on: (
    eventName: string,
    callback: (event: PlotlySelectionEvent) => void
  ) => void
}

type ChannelKey = keyof FlowData

export type SelectionResult = {
  pointIndexes: number[]
  averageX: number
  averageY: number
}

export class ScatterPlot {
  private element: PlotElement
  private xValues: number[]
  private yValues: number[]
  private xLabel: string
  private yLabel: string
  private title: string

  constructor(
    element: HTMLDivElement,
    data: FlowData,
    xChannel: ChannelKey,
    yChannel: ChannelKey,
    xLabel: string,
    yLabel: string,
    title: string
  ) {
    const xValues = data[xChannel]
    const yValues = data[yChannel]

    if (!Array.isArray(xValues)) {
      throw new Error(
        `The channel "${String(xChannel)}" was not found.`
      )
    }

    if (!Array.isArray(yValues)) {
      throw new Error(
        `The channel "${String(yChannel)}" was not found.`
      )
    }

    if (xValues.length !== yValues.length) {
      throw new Error(
        `${String(xChannel)} and ${String(yChannel)} ` +
        'contain different numbers of events.'
      )
    }

    this.element = element as PlotElement
    this.xValues = xValues
    this.yValues = yValues
    this.xLabel = xLabel
    this.yLabel = yLabel
    this.title = title
  }

  async render(): Promise<void> {
    await Plotly.newPlot(
      this.element,
      [
        {
          x: this.xValues,
          y: this.yValues,
          mode: 'markers',
          type: 'scatter',
          marker: {
            size: 4,
            opacity: 0.5
          },
          hovertemplate:
            `${this.xLabel}: %{x:.0f}<br>` +
            `${this.yLabel}: %{y:.0f}<extra></extra>`,
          showlegend: false
        },
        {
          x: [],
          y: [],
          mode: 'markers',
          type: 'scatter',
          marker: {
            size: 7,
            opacity: 1
          },
          hoverinfo: 'skip',
          showlegend: false,
          visible: false
        }
      ],
      {
        title: {
          text: this.title
        },
        xaxis: {
          title: {
            text: this.xLabel
          },
          autorange: true,
          gridcolor: '#333'
        },
        yaxis: {
          title: {
            text: this.yLabel
          },
          autorange: true,
          gridcolor: '#333'
        },
        paper_bgcolor: '#1e1e1e',
        plot_bgcolor: '#000000',
        font: {
          color: '#ffffff'
        },
        dragmode: 'lasso',
        selections: [],
        margin: {
          l: 70,
          r: 30,
          t: 70,
          b: 70
        }
      },
      {
        responsive: true,
        displaylogo: false
      }
    )
  }

  onSelection(
    callback: (selection: SelectionResult) => void
  ): void {
    this.element.on(
      'plotly_selected',
      (eventData: PlotlySelectionEvent) => {
        const baseTracePoints =
          (eventData.points ?? []).filter(
            (point) =>
              point.curveNumber === undefined ||
              point.curveNumber === 0
          )

        if (baseTracePoints.length === 0) {
          return
        }

        const pointIndexes = baseTracePoints
          .map(
            (point) =>
              point.pointNumber ??
              point.pointIndex
          )
          .filter(
            (index): index is number =>
              typeof index === 'number' &&
              index >= 0 &&
              index < this.xValues.length
          )

        if (pointIndexes.length === 0) {
          return
        }

        const averageX =
          baseTracePoints.reduce(
            (sum, point) => sum + Number(point.x),
            0
          ) / baseTracePoints.length

        const averageY =
          baseTracePoints.reduce(
            (sum, point) => sum + Number(point.y),
            0
          ) / baseTracePoints.length

        callback({
          pointIndexes,
          averageX,
          averageY
        })
      }
    )
  }

  async showGate(
    pointIndexes: number[]
  ): Promise<void> {
    const validIndexes = pointIndexes.filter(
      (index) =>
        Number.isInteger(index) &&
        index >= 0 &&
        index < this.xValues.length
    )

    const highlightedX = validIndexes.map(
      (index) => this.xValues[index]
    )

    const highlightedY = validIndexes.map(
      (index) => this.yValues[index]
    )

    await Plotly.restyle(
      this.element,
      {
        'marker.opacity': 0.16
      },
      [0]
    )

    await Plotly.restyle(
      this.element,
      {
        x: [highlightedX],
        y: [highlightedY],
        visible: true
      },
      [1]
    )

    await Plotly.relayout(this.element, {
      selections: []
    })
  }

  async clear(): Promise<void> {
    await Plotly.restyle(
      this.element,
      {
        'marker.opacity': 0.5
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

    await Plotly.relayout(this.element, {
      selections: []
    })
  }
}