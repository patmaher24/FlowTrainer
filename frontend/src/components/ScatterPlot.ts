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

export type SelectionResult = {
  pointIndexes: number[]
  averageFsc: number
  averageSsc: number
}

export class ScatterPlot {
  private element: PlotElement
  private data: FlowData

  constructor(
    element: HTMLDivElement,
    data: FlowData
  ) {
    this.element = element as PlotElement
    this.data = data
  }

  async render(): Promise<void> {
    await this.draw([])
  }

  onSelection(
    callback: (selection: SelectionResult) => void
  ): void {
    this.element.on(
      'plotly_selected',
      (eventData: PlotlySelectionEvent) => {
        const points = eventData.points ?? []

        if (points.length === 0) {
          return
        }

        const pointIndexes = points
          .map(
            (point) =>
              point.pointNumber ??
              point.pointIndex
          )
          .filter(
            (index): index is number =>
              typeof index === 'number'
          )

        if (pointIndexes.length === 0) {
          return
        }

        const averageFsc =
          points.reduce(
            (sum, point) => sum + Number(point.x),
            0
          ) / points.length

        const averageSsc =
          points.reduce(
            (sum, point) => sum + Number(point.y),
            0
          ) / points.length

        /*
         * Immediately replace Plotly's temporary selection
         * with our own controlled highlight layer.
         */
        void this.showGate(pointIndexes)

        callback({
          pointIndexes,
          averageFsc,
          averageSsc
        })
      }
    )
  }

  async showGate(
    pointIndexes: number[]
  ): Promise<void> {
    await this.draw(pointIndexes)
  }

  async clear(): Promise<void> {
    await this.draw([])
  }

  private async draw(
    highlightedIndexes: number[]
  ): Promise<void> {
    const highlightedFsc = highlightedIndexes.map(
      (index) => this.data.fsc[index]
    )

    const highlightedSsc = highlightedIndexes.map(
      (index) => this.data.ssc[index]
    )

    await Plotly.react(
      this.element,
      [
        {
          x: this.data.fsc,
          y: this.data.ssc,
          mode: 'markers',
          type: 'scatter',
          marker: {
            size: 4,
            opacity:
              highlightedIndexes.length > 0
                ? 0.16
                : 0.5
          },
          hovertemplate:
            'FSC-A: %{x:.0f}<br>' +
            'SSC-A: %{y:.0f}<extra></extra>',
          showlegend: false
        },
        {
          x: highlightedFsc,
          y: highlightedSsc,
          mode: 'markers',
          type: 'scatter',
          marker: {
            size: 7,
            opacity: 1
          },
          hovertemplate:
            'FSC-A: %{x:.0f}<br>' +
            'SSC-A: %{y:.0f}<extra></extra>',
          showlegend: false,
          visible: highlightedIndexes.length > 0
        }
      ],
      {
        title: {
          text: 'FSC-A vs SSC-A'
        },
        xaxis: {
          title: {
            text: 'FSC-A'
          },
          range: [0, 800],
          gridcolor: '#333'
        },
        yaxis: {
          title: {
            text: 'SSC-A'
          },
          range: [0, 650],
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
}