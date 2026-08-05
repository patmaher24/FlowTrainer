import { GateTree } from './components/GateTree'

import {
  ScatterPlot,
  type SelectionResult
} from './components/ScatterPlot'

import { GateEngine } from './core/GateEngine'
import { PlotManager } from './core/PlotManager'
import { createFlowData } from './data/flowData'

function identifyFscPopulation(
  averageFsc: number,
  averageSsc: number
): string {
  if (averageFsc < 330 && averageSsc < 180) {
    return 'Likely lymphocytes'
  }

  if (averageFsc < 510 && averageSsc < 340) {
    return 'Likely monocytes'
  }

  if (averageFsc >= 500 && averageSsc >= 300) {
    return 'Likely granulocytes'
  }

  return 'Mixed or uncertain population'
}

function identifyCd45Population(
  averageCd45: number,
  averageSsc: number
): string {
  if (averageCd45 > 780 && averageSsc < 180) {
    return 'Likely lymphocytes'
  }

  if (
    averageCd45 > 540 &&
    averageCd45 <= 780 &&
    averageSsc < 350
  ) {
    return 'Likely monocytes'
  }

  if (averageCd45 <= 560 && averageSsc >= 300) {
    return 'Likely granulocytes'
  }

  return 'Mixed or uncertain population'
}

export function App(): HTMLElement {
  const container = document.createElement('div')

  container.innerHTML = `
    <div class="app">
      <h1>Flow Cytometry Trainer</h1>

      <p>
        Draw a lasso on either plot, name the gate,
        and save it.
      </p>

      <div class="workspace">
        <aside class="gate-tree-panel">
          <h2>Gate Tree</h2>

          <div class="all-events-node">
            <strong>All Events</strong>
            <span id="total-events"></span>
          </div>

          <div id="gate-tree" class="gate-tree"></div>
        </aside>

        <main class="plot-workspace">
          <div class="gate-panel">
            <div class="stat">
              <strong id="event-count">0</strong>
              <span>Selected events</span>
            </div>

            <div class="stat">
              <strong id="event-percent">0.0%</strong>
              <span>Percent of total</span>
            </div>

            <div class="stat">
              <strong id="population-name">
                No gate selected
              </strong>
              <span>Estimated population</span>
            </div>
          </div>

          <div class="gate-controls">
            <label for="gate-name">
              Gate name
            </label>

            <input
              id="gate-name"
              type="text"
              placeholder="Example: Lymphocytes"
            />

            <button id="save-gate" type="button">
              Save gate
            </button>

            <button id="clear-gate" type="button">
              Clear selection
            </button>
          </div>

          <p
            id="gate-message"
            class="gate-message"
            aria-live="polite"
          ></p>

          <div class="plot-grid">
            <div class="plot-panel">
              <h3>FSC-A vs SSC-A</h3>
              <div id="plot"></div>
            </div>

            <div class="plot-panel">
              <h3>CD45 vs SSC-A</h3>
              <div id="cd45-plot"></div>
            </div>
          </div>
        </main>
      </div>
    </div>
  `

  setTimeout(async () => {
    const fscPlotElement =
      container.querySelector<HTMLDivElement>('#plot')

    const cd45PlotElement =
      container.querySelector<HTMLDivElement>(
        '#cd45-plot'
      )

    const gateTreeElement =
      container.querySelector<HTMLDivElement>(
        '#gate-tree'
      )

    const totalEventsElement =
      container.querySelector<HTMLElement>(
        '#total-events'
      )

    const eventCountElement =
      container.querySelector<HTMLElement>(
        '#event-count'
      )

    const eventPercentElement =
      container.querySelector<HTMLElement>(
        '#event-percent'
      )

    const populationNameElement =
      container.querySelector<HTMLElement>(
        '#population-name'
      )

    const gateNameInput =
      container.querySelector<HTMLInputElement>(
        '#gate-name'
      )

    const saveGateButton =
      container.querySelector<HTMLButtonElement>(
        '#save-gate'
      )

    const clearGateButton =
      container.querySelector<HTMLButtonElement>(
        '#clear-gate'
      )

    const messageElement =
      container.querySelector<HTMLElement>(
        '#gate-message'
      )

    if (
      !fscPlotElement ||
      !cd45PlotElement ||
      !gateTreeElement ||
      !totalEventsElement ||
      !eventCountElement ||
      !eventPercentElement ||
      !populationNameElement ||
      !gateNameInput ||
      !saveGateButton ||
      !clearGateButton ||
      !messageElement
    ) {
      throw new Error(
        'A required application element is missing.'
      )
    }

    const flowData = createFlowData()
    const totalEvents = flowData.fsc.length

    totalEventsElement.textContent =
      `${totalEvents.toLocaleString()} events`

    const fscPlot = new ScatterPlot(
      fscPlotElement,
      flowData,
      'fsc',
      'ssc',
      'FSC-A',
      'SSC-A',
      'FSC-A vs SSC-A'
    )

    const cd45Plot = new ScatterPlot(
      cd45PlotElement,
      flowData,
      'cd45',
      'ssc',
      'CD45',
      'SSC-A',
      'CD45 vs SSC-A'
    )

    const plotManager = new PlotManager()

    plotManager.register(fscPlot)
    plotManager.register(cd45Plot)

    const gateTree = new GateTree(gateTreeElement)
    const gateEngine = new GateEngine()

    let currentSelection: SelectionResult | null = null
    let currentPopulation = ''

    function refreshGateTree(): void {
      gateTree.setGates(
        gateEngine.getAllGates()
      )
    }

    async function clearSelectionDisplay(
      message: string
    ): Promise<void> {
      currentSelection = null
      currentPopulation = ''

      await plotManager.clear()

      eventCountElement.textContent = '0'
      eventPercentElement.textContent = '0.0%'

      populationNameElement.textContent =
        'No gate selected'

      gateNameInput.value = ''
      messageElement.textContent = message
    }

    function handleSelection(
      selection: SelectionResult,
      population: string
    ): void {
      currentSelection = {
        ...selection,
        pointIndexes: [...selection.pointIndexes]
      }

      currentPopulation = population

      const percentage =
        (selection.pointIndexes.length / totalEvents) *
        100

      eventCountElement.textContent =
        selection.pointIndexes.length.toLocaleString()

      eventPercentElement.textContent =
        `${percentage.toFixed(1)}%`

      populationNameElement.textContent =
        population

      messageElement.textContent =
        'Selection ready to save.'

      void plotManager.showGate(
        selection.pointIndexes
      )
    }

    await plotManager.renderAll()
    refreshGateTree()

    fscPlot.onSelection((selection) => {
      const population = identifyFscPopulation(
        selection.averageX,
        selection.averageY
      )

      handleSelection(selection, population)
    })

    cd45Plot.onSelection((selection) => {
      const population = identifyCd45Population(
        selection.averageX,
        selection.averageY
      )

      handleSelection(selection, population)
    })

    gateTree.onAction(async (action, gate) => {
      if (action === 'select') {
        await plotManager.showGate(
          gate.pointIndexes
        )

        currentSelection = {
          pointIndexes: [...gate.pointIndexes],
          averageX: 0,
          averageY: 0
        }

        currentPopulation = gate.population

        eventCountElement.textContent =
          gate.pointIndexes.length.toLocaleString()

        eventPercentElement.textContent =
          `${gate.percentage.toFixed(1)}%`

        populationNameElement.textContent =
          gate.population

        gateNameInput.value = gate.name

        messageElement.textContent =
          `Showing saved gate: ${gate.name}`

        return
      }

      if (action === 'rename') {
        const newName = prompt(
          'Rename gate:',
          gate.name
        )

        if (!newName?.trim()) {
          return
        }

        const renamed = gateEngine.renameGate(
          gate.id,
          newName
        )

        if (!renamed) {
          messageElement.textContent =
            'The gate could not be renamed.'
          return
        }

        refreshGateTree()

        messageElement.textContent =
          `Renamed gate to "${newName.trim()}".`

        return
      }

      if (action === 'delete') {
        const shouldDelete = confirm(
          `Delete "${gate.name}"?`
        )

        if (!shouldDelete) {
          return
        }

        const deleted = gateEngine.deleteGate(
          gate.id
        )

        if (!deleted) {
          messageElement.textContent =
            'The gate could not be deleted.'
          return
        }

        refreshGateTree()

        await clearSelectionDisplay(
          `Deleted gate "${gate.name}".`
        )
      }
    })

    saveGateButton.addEventListener(
      'click',
      () => {
        const name = gateNameInput.value.trim()

        if (!currentSelection) {
          messageElement.textContent =
            'Draw a gate before saving.'
          return
        }

        if (!name) {
          messageElement.textContent =
            'Enter a gate name.'

          gateNameInput.focus()
          return
        }

        const percentage =
          (currentSelection.pointIndexes.length /
            totalEvents) *
          100

        gateEngine.createGate(
          name,
          currentSelection.pointIndexes,
          percentage,
          currentPopulation
        )

        refreshGateTree()

        gateNameInput.value = ''

        messageElement.textContent =
          `Saved gate: ${name}`
      }
    )

    clearGateButton.addEventListener(
      'click',
      () => {
        void clearSelectionDisplay(
          'Selection cleared.'
        )
      }
    )

    gateNameInput.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Enter') {
          saveGateButton.click()
        }
      }
    )
  }, 0)

  return container
}