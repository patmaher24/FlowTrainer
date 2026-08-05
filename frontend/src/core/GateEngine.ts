import type { SavedGate } from '../types'

export class GateEngine {
  private gates: SavedGate[] = []
  private nextGateId = 1

  getAllGates(): SavedGate[] {
    return this.gates.map((gate) => ({
      ...gate,
      pointIndexes: [...gate.pointIndexes]
    }))
  }

  createGate(
    name: string,
    pointIndexes: number[],
    percentage: number,
    population: string
  ): SavedGate {
    const gate: SavedGate = {
      id: this.nextGateId,
      name: name.trim(),
      pointIndexes: [...pointIndexes],
      percentage,
      population
    }

    this.nextGateId += 1
    this.gates = [...this.gates, gate]

    return {
      ...gate,
      pointIndexes: [...gate.pointIndexes]
    }
  }

  renameGate(
    id: number,
    newName: string
  ): boolean {
    const trimmedName = newName.trim()

    if (!trimmedName) {
      return false
    }

    const gate = this.gates.find(
      (savedGate) => savedGate.id === id
    )

    if (!gate) {
      return false
    }

    gate.name = trimmedName
    return true
  }

  deleteGate(id: number): boolean {
    const previousLength = this.gates.length

    this.gates = this.gates.filter(
      (gate) => gate.id !== id
    )

    return this.gates.length < previousLength
  }
}