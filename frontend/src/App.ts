import { GateTree } from './components/GateTree'

import {
  ScatterPlot,
  type SelectionResult
} from './components/ScatterPlot'

import {
  parseFCSData
} from './core/FCSParser'

import {
  logChannelDiagnostics
} from './core/ChannelDiagnostics'

import {
  identifyCd45Population,
  identifyFscPopulation
} from './core/PopulationClassifier'

import {
  createUIBindings
} from './ui/UIBindings'

import {
  CHANNELS,
  getChannelLabel
} from './core/ChannelRegistry'

import type {
  ChannelKey
} from './core/ChannelRegistry'

import {
  GateEngine
} from './core/GateEngine'

import {
  PlotManager
} from './core/PlotManager'

import {
  clearChannelTopOfScaleRegistry,
  registerChannelTopOfScale
} from './core/TransformEngine'

import {
  createFlowData
} from './data/flowData'

export function App(): HTMLElement {
  const container =
    document.createElement('div')

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

          <div
            id="gate-tree"
            class="gate-tree"
          ></div>
        </aside>

        <main class="plot-workspace">
          <div class="gate-panel">
            <div class="stat">
              <strong id="event-count">
                0
              </strong>

              <span>
                Selected events
              </span>
            </div>

            <div class="stat">
              <strong id="event-percent">
                0.0%
              </strong>

              <span>
                Percent of total
              </span>
            </div>

            <div class="stat">
              <strong id="population-name">
                No gate selected
              </strong>

              <span>
                Estimated population
              </span>
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

            <button
              id="save-gate"
              type="button"
            >
              Save gate
            </button>

            <button
              id="clear-gate"
              type="button"
            >
              Clear selection
            </button>
          </div>

          <p
            id="gate-message"
            class="gate-message"
            aria-live="polite"
          ></p>

          <div class="axis-controls">
            <div class="axis-control">
              <label for="x-axis">
                Plot 1 X Axis
              </label>

              <select id="x-axis"></select>
            </div>

            <div class="axis-control">
              <label for="y-axis">
                Plot 1 Y Axis
              </label>

              <select id="y-axis"></select>
            </div>

            <div class="axis-control">
              <label for="right-x-axis">
                Plot 2 X Axis
              </label>

              <select id="right-x-axis"></select>
            </div>

            <div class="axis-control">
              <label for="right-y-axis">
                Plot 2 Y Axis
              </label>

              <select id="right-y-axis"></select>
            </div>
          </div>

          <div class="file-controls">
            <label for="fcs-file">
              Load FCS file
            </label>

            <input
              id="fcs-file"
              type="file"
              accept=".fcs"
            />
          </div>
<div class="plot-toolbar">
  <button
    id="add-plot"
    type="button"
  >
    + Add Plot
  </button>
</div>
          <div class="plot-grid">
            <div class="plot-panel">
              <h3>Plot 1</h3>
              <div id="plot"></div>
            </div>

            <div class="plot-panel">
              <h3>Plot 2</h3>
              <div id="cd45-plot"></div>
            </div>
          </div>
        </main>
      </div>
    </div>
  `

  setTimeout(
    async () => {
      const ui =
        createUIBindings(container)

      const {
        fscPlotElement,
        cd45PlotElement,
        xAxisSelect,
        yAxisSelect,
        gateTreeElement,
        totalEventsElement,
        eventCountElement,
        eventPercentElement,
        populationNameElement,
        gateNameInput,
        saveGateButton,
        clearGateButton,
        messageElement,
        fcsFileInput
      } = ui

      const rightXAxisSelect =
        container.querySelector<HTMLSelectElement>(
          '#right-x-axis'
        )

      const rightYAxisSelect =
        container.querySelector<HTMLSelectElement>(
          '#right-y-axis'
        )

      if (
        !rightXAxisSelect ||
        !rightYAxisSelect
      ) {
        throw new Error(
          'The Plot 2 axis controls are missing.'
        )
      }

      function populateAxisSelect(
        select: HTMLSelectElement,
        selectedChannel: ChannelKey
      ): void {
        select.innerHTML =
          CHANNELS
            .map(
              (channel) => `
                <option
                  value="${channel.key}"
                  ${
                    channel.key === selectedChannel
                      ? 'selected'
                      : ''
                  }
                >
                  ${channel.label}
                </option>
              `
            )
            .join('')
      }

      function getSelectedChannel(
        select: HTMLSelectElement
      ): string {
        return select.value
      }

      function getActiveChannelLabel(
        channel: string
      ): string {
        if (usingFCSData) {
          return channel
        }

        return getChannelLabel(
          channel as ChannelKey
        )
      }

      function populateFCSAxisSelect(
        select: HTMLSelectElement,
        channelNames: string[],
        selectedChannel: string
      ): void {
        select.replaceChildren()

        for (const channelName of channelNames) {
          const option = new Option(
            channelName,
            channelName,
            false,
            channelName === selectedChannel
          )

          select.add(option)
        }
      }

      function findPreferredChannel(
        channelNames: string[],
        searchText: string
      ): string | undefined {
        const normalizedSearch =
          searchText.toUpperCase()

        return channelNames.find(
          (channelName) =>
            channelName
              .toUpperCase()
              .includes(normalizedSearch)
        )
      }

      function findPreferredAreaChannel(
        channelNames: string[],
        searchText: string
      ): string | undefined {
        const normalizedSearch =
          searchText.toUpperCase()

        return channelNames.find(
          (channelName) => {
            const upper =
              channelName.toUpperCase()

            return (
              upper.includes(normalizedSearch) &&
              (
                upper.endsWith('-A') ||
                upper.includes('-A ')
              )
            )
          }
        )
      }

      populateAxisSelect(
        xAxisSelect,
        'fsc'
      )

      populateAxisSelect(
        yAxisSelect,
        'ssc'
      )

      populateAxisSelect(
        rightXAxisSelect,
        'cd45'
      )

      populateAxisSelect(
        rightYAxisSelect,
        'ssc'
      )

      let activeFlowData =
        createFlowData()

      let totalEvents =
        activeFlowData['fsc'].length

      let usingFCSData = false

      totalEventsElement.textContent =
        `${totalEvents.toLocaleString()} events`

      const fscPlot =
        new ScatterPlot(
          fscPlotElement,
          activeFlowData,
          'fsc',
          'ssc',
          'FSC-A',
          'SSC-A',
          'FSC-A vs SSC-A'
        )

      const cd45Plot =
        new ScatterPlot(
          cd45PlotElement,
          activeFlowData,
          'cd45',
          'ssc',
          'CD45',
          'SSC-A',
          'CD45 vs SSC-A'
        )

      const plotManager =
        new PlotManager()
const addPlotButton =
  container.querySelector<HTMLButtonElement>(
    '#add-plot'
  )

const plotGrid =
  container.querySelector<HTMLDivElement>(
    '.plot-grid'
  )
      plotManager.register(
        fscPlot
      )

      plotManager.register(
        cd45Plot
      )
let nextPlotNumber = 3

addPlotButton?.addEventListener(
  'click',
  async () => {
    if (!plotGrid) return

    const plotNumber = nextPlotNumber++

    // Create a new plot panel.
    const panel = document.createElement('div')
    panel.className = 'plot-panel'

    const heading = document.createElement('h3')
    heading.textContent = `Plot ${plotNumber}`

    const plotElement = document.createElement('div')
    plotElement.id = `plot-${plotNumber}`

    panel.append(heading, plotElement)
    plotGrid.appendChild(panel)

    // Choose channels from the currently loaded data.
    const channels = Object.keys(activeFlowData)
    const xChannel = channels[0]
    const yChannel = channels[1] ?? channels[0]

    const newPlot = new ScatterPlot(
      plotElement,
      activeFlowData,
      xChannel,
      yChannel,
      getActiveChannelLabel(xChannel),
      getActiveChannelLabel(yChannel),
      `Plot ${plotNumber}`
    )

    plotManager.register(newPlot)
    await newPlot.render()

    // Connect lasso gating to the existing system.
    newPlot.onSelection((selection) => {
      handleSelection(
        selection,
        'Selected population'
      )
    })

    // Show any currently selected population.
    if (currentSelection) {
      await plotManager.showGate(
        currentSelection.pointIndexes
      )
    }
  }
)
      const gateTree =
        new GateTree(
          gateTreeElement
        )

      let gateEngine =
        new GateEngine()

      let currentSelection:
        SelectionResult | null = null

      let currentPopulation = ''

      function refreshGateTree():
        void {
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

        eventCountElement.textContent =
          '0'

        eventPercentElement.textContent =
          '0.0%'

        populationNameElement.textContent =
          'No gate selected'

        gateNameInput.value = ''

        messageElement.textContent =
          message
      }

      function handleSelection(
        selection: SelectionResult,
        population: string
      ): void {
        currentSelection = {
          ...selection,
          pointIndexes: [
            ...selection.pointIndexes
          ]
        }

        currentPopulation =
          population

        const percentage =
          (
            selection.pointIndexes.length /
            totalEvents
          ) * 100

        eventCountElement.textContent =
          selection.pointIndexes.length
            .toLocaleString()

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

      async function updateLeftPlotChannels():
        Promise<void> {
        const xChannel =
          getSelectedChannel(
            xAxisSelect
          )

        const yChannel =
          getSelectedChannel(
            yAxisSelect
          )

        const xLabel =
          getActiveChannelLabel(
            xChannel
          )

        const yLabel =
          getActiveChannelLabel(
            yChannel
          )

        await fscPlot.setChannels(
          activeFlowData,
          xChannel,
          yChannel,
          xLabel,
          yLabel
        )

        if (currentSelection) {
          await plotManager.showGate(
            currentSelection.pointIndexes
          )
        }
      }

      async function updateRightPlotChannels():
        Promise<void> {
        const xChannel =
          getSelectedChannel(
            rightXAxisSelect
          )

        const yChannel =
          getSelectedChannel(
            rightYAxisSelect
          )

        const xLabel =
          getActiveChannelLabel(
            xChannel
          )

        const yLabel =
          getActiveChannelLabel(
            yChannel
          )

        await cd45Plot.setChannels(
          activeFlowData,
          xChannel,
          yChannel,
          xLabel,
          yLabel
        )

        if (currentSelection) {
          await plotManager.showGate(
            currentSelection.pointIndexes
          )
        }
      }

      await plotManager.renderAll()

      refreshGateTree()

      xAxisSelect.addEventListener(
        'change',
        () => {
          void updateLeftPlotChannels()
        }
      )

      yAxisSelect.addEventListener(
        'change',
        () => {
          void updateLeftPlotChannels()
        }
      )

      rightXAxisSelect.addEventListener(
        'change',
        () => {
          void updateRightPlotChannels()
        }
      )

      rightYAxisSelect.addEventListener(
        'change',
        () => {
          void updateRightPlotChannels()
        }
      )

      fscPlot.onSelection(
        (selection) => {
          const population =
            usingFCSData
              ? 'Selected population'
              : identifyFscPopulation(
                  selection.averageX,
                  selection.averageY
                )

          handleSelection(
            selection,
            population
          )
        }
      )

      cd45Plot.onSelection(
        (selection) => {
          const population =
            usingFCSData
              ? 'Selected population'
              : identifyCd45Population(
                  selection.averageX,
                  selection.averageY
                )

          handleSelection(
            selection,
            population
          )
        }
      )

      gateTree.onAction(
        async (
          action,
          gate
        ) => {
          if (action === 'select') {
            await plotManager.showGate(
              gate.pointIndexes
            )

            currentSelection = {
              pointIndexes: [
                ...gate.pointIndexes
              ],
              averageX: 0,
              averageY: 0
            }

            currentPopulation =
              gate.population

            eventCountElement.textContent =
              gate.pointIndexes.length
                .toLocaleString()

            eventPercentElement.textContent =
              `${gate.percentage.toFixed(1)}%`

            populationNameElement.textContent =
              gate.population

            gateNameInput.value =
              gate.name

            messageElement.textContent =
              `Showing saved gate: ${gate.name}`

            return
          }

          if (action === 'rename') {
            const newName =
              prompt(
                'Rename gate:',
                gate.name
              )

            if (!newName?.trim()) {
              return
            }

            const renamed =
              gateEngine.renameGate(
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
            const shouldDelete =
              confirm(
                `Delete "${gate.name}"?`
              )

            if (!shouldDelete) {
              return
            }

            const deleted =
              gateEngine.deleteGate(
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
        }
      )

      saveGateButton.addEventListener(
        'click',
        () => {
          const name =
            gateNameInput.value.trim()

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
            (
              currentSelection
                .pointIndexes.length /
              totalEvents
            ) * 100

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

      fcsFileInput.addEventListener(
        'change',
        async () => {
          const file =
            fcsFileInput.files?.[0]

          if (!file) {
            return
          }

          try {
            messageElement.textContent =
              `Loading ${file.name}...`

            const buffer =
              await file.arrayBuffer()

            const dataSet =
              parseFCSData(
                buffer
              )

            const metadata =
              dataSet.metadata

            clearChannelTopOfScaleRegistry()

            for (
              const parameter of
              metadata.parameters
            ) {
              if (
                parameter.range <= 0
              ) {
                continue
              }

              registerChannelTopOfScale(
                parameter.name,
                parameter.range
              )

              registerChannelTopOfScale(
                parameter.stain,
                parameter.range
              )
            }

            const channelNames =
              Object.keys(
                dataSet.channels
              )

            if (channelNames.length < 2) {
              throw new Error(
                'The FCS file must contain at least two decoded parameters.'
              )
            }

            const fscChannel =
              findPreferredChannel(
                channelNames,
                'FSC-A'
              ) ??
              findPreferredChannel(
                channelNames,
                'FSC'
              )

            const sscChannel =
              findPreferredChannel(
                channelNames,
                'SSC-A'
              ) ??
              findPreferredChannel(
                channelNames,
                'SSC'
              )

            function logParameterDiagnostics(
              channelName:
                string | undefined
            ): void {
              if (!channelName) {
                return
              }

              const parameter =
                metadata.parameters.find(
                  (item) =>
                    item.name ===
                      channelName ||
                    item.stain ===
                      channelName
                )

              logChannelDiagnostics(
                channelName,
                dataSet.channels[
                  channelName
                ],
                parameter?.range,
                {
                  bits:
                    parameter?.bits,

                  range:
                    parameter?.range,

                  exponent:
                    parameter?.exponent,

                  gain:
                    parameter?.gain
                }
              )
            }

            const cd45Channel =
              findPreferredAreaChannel(
                channelNames,
                'CD45'
              ) ??
              findPreferredChannel(
                channelNames,
                'CD45'
              )

            logParameterDiagnostics(
              fscChannel
            )

            logParameterDiagnostics(
              sscChannel
            )

            logParameterDiagnostics(
              cd45Channel
            )

            activeFlowData =
              dataSet.channels

            usingFCSData = true

            const firstChannel =
              findPreferredAreaChannel(
                channelNames,
                'FSC'
              ) ??
              findPreferredChannel(
                channelNames,
                'FSC'
              ) ??
              channelNames[0]

            const secondChannel =
              findPreferredAreaChannel(
                channelNames,
                'SSC'
              ) ??
              findPreferredChannel(
                channelNames,
                'SSC'
              ) ??
              channelNames.find(
                (channelName) =>
                  channelName !==
                  firstChannel
              ) ??
              channelNames[1]

            const referenceXChannel =
              findPreferredAreaChannel(
                channelNames,
                'CD45'
              ) ??
              findPreferredChannel(
                channelNames,
                'CD45'
              ) ??
              firstChannel

            const referenceYChannel =
              findPreferredAreaChannel(
                channelNames,
                'SSC'
              ) ??
              findPreferredChannel(
                channelNames,
                'SSC'
              ) ??
              secondChannel

            populateFCSAxisSelect(
              xAxisSelect,
              channelNames,
              firstChannel
            )

            populateFCSAxisSelect(
              yAxisSelect,
              channelNames,
              secondChannel
            )

            populateFCSAxisSelect(
              rightXAxisSelect,
              channelNames,
              referenceXChannel
            )

            populateFCSAxisSelect(
              rightYAxisSelect,
              channelNames,
              referenceYChannel
            )

            totalEvents =
              metadata.totalEvents > 0
                ? metadata.totalEvents
                : activeFlowData[
                    firstChannel
                  ].length

            totalEventsElement.textContent =
              `${totalEvents.toLocaleString()} events`

            currentSelection = null
            currentPopulation = ''

            gateEngine =
              new GateEngine()

            refreshGateTree()

            eventCountElement.textContent =
              '0'

            eventPercentElement.textContent =
              '0.0%'

            populationNameElement.textContent =
              'No gate selected'

            gateNameInput.value = ''

            await fscPlot.setChannels(
              activeFlowData,
              firstChannel,
              secondChannel,
              firstChannel,
              secondChannel
            )

            await cd45Plot.setChannels(
              activeFlowData,
              referenceXChannel,
              referenceYChannel,
              referenceXChannel,
              referenceYChannel
            )

            console.log(
              'Loaded real FCS channels:',
              channelNames
            )

            console.log(
              'FCS metadata:',
              metadata
            )

            messageElement.textContent =
              `${file.name} — ` +
              `${metadata.version} — ` +
              `${totalEvents.toLocaleString()} events — ` +
              `${channelNames.length} decoded parameters`
          } catch (error) {
            console.error(
              'Unable to load FCS data:',
              error
            )

            messageElement.textContent =
              'Unable to load the selected FCS file.'
          }
        }
      )
    },
    0
  )

  return container
}