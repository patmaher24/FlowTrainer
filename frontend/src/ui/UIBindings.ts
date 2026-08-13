export type UIBindings = {
  fscPlotElement: HTMLDivElement
  cd45PlotElement: HTMLDivElement
  xAxisSelect: HTMLSelectElement
  yAxisSelect: HTMLSelectElement
  gateTreeElement: HTMLDivElement
  totalEventsElement: HTMLElement
  eventCountElement: HTMLElement
  eventPercentElement: HTMLElement
  populationNameElement: HTMLElement
  gateNameInput: HTMLInputElement
  saveGateButton: HTMLButtonElement
  clearGateButton: HTMLButtonElement
  messageElement: HTMLElement
}

export function createUIBindings(
  container: HTMLElement
): UIBindings {
  const fscPlotElement =
    container.querySelector<HTMLDivElement>('#plot')

  const cd45PlotElement =
    container.querySelector<HTMLDivElement>(
      '#cd45-plot'
    )

  const xAxisSelect =
    container.querySelector<HTMLSelectElement>(
      '#x-axis'
    )

  const yAxisSelect =
    container.querySelector<HTMLSelectElement>(
      '#y-axis'
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
    !xAxisSelect ||
    !yAxisSelect ||
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

  return {
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
    messageElement
  }
}