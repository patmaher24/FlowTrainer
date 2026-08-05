import type {
  GateAction,
  SavedGate
} from '../types'

export class GateTree {
  private element: HTMLDivElement
  private gates: SavedGate[] = []

  constructor(element: HTMLDivElement) {
    this.element = element
  }

  setGates(gates: SavedGate[]): void {
    this.gates = gates.map((gate) => ({
      ...gate,
      pointIndexes: [...gate.pointIndexes]
    }))

    this.render()
  }

  onAction(
    callback: (
      action: GateAction,
      gate: SavedGate
    ) => void
  ): void {
    this.element.addEventListener('click', (event) => {
      const target = event.target as HTMLElement

      const button =
        target.closest<HTMLButtonElement>(
          'button[data-action][data-gate-id]'
        )

      if (!button) {
        return
      }

      const gateId = Number(button.dataset.gateId)
      const action = button.dataset.action as GateAction

      const gate = this.gates.find(
        (savedGate) => savedGate.id === gateId
      )

      if (!gate) {
        return
      }

      callback(action, {
        ...gate,
        pointIndexes: [...gate.pointIndexes]
      })
    })
  }

  private render(): void {
    if (this.gates.length === 0) {
      this.element.innerHTML = `
        <p class="empty-gates">
          No saved gates yet.
        </p>
      `
      return
    }

    this.element.innerHTML = this.gates
      .map(
        (gate) => `
          <div class="gate-row">
            <button
              class="gate-select-button"
              type="button"
              data-action="select"
              data-gate-id="${gate.id}"
            >
              <span class="tree-branch">└──</span>

              <span class="gate-node-text">
                <strong>${gate.name}</strong>

                <small>
                  ${gate.pointIndexes.length.toLocaleString()}
                  events · ${gate.percentage.toFixed(1)}%
                </small>
              </span>
            </button>

            <button
              class="gate-icon-button"
              type="button"
              data-action="rename"
              data-gate-id="${gate.id}"
              title="Rename gate"
              aria-label="Rename ${gate.name}"
            >
              ✏️
            </button>

            <button
              class="gate-icon-button"
              type="button"
              data-action="delete"
              data-gate-id="${gate.id}"
              title="Delete gate"
              aria-label="Delete ${gate.name}"
            >
              🗑️
            </button>
          </div>
        `
      )
      .join('')
  }
}