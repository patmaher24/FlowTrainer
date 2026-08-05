import { ScatterPlot } from '../components/ScatterPlot'

export class PlotManager {
  private plots: ScatterPlot[] = []

  register(plot: ScatterPlot): void {
    this.plots.push(plot)
  }

  async renderAll(): Promise<void> {
    for (const plot of this.plots) {
      await plot.render()
    }
  }

  async showGate(
    pointIndexes: number[]
  ): Promise<void> {
    for (const plot of this.plots) {
      await plot.showGate(pointIndexes)
    }
  }

  async clear(): Promise<void> {
    for (const plot of this.plots) {
      await plot.clear()
    }
  }
}