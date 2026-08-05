import type { FlowData } from '../types'

type Population = {
  count: number
  fscMean: number
  fscSpread: number
  sscMean: number
  sscSpread: number
}

function randomNormal(
  mean: number,
  standardDeviation: number
): number {
  let u1 = Math.random()
  const u2 = Math.random()

  if (u1 === 0) {
    u1 = 0.0001
  }

  const z =
    Math.sqrt(-2 * Math.log(u1)) *
    Math.cos(2 * Math.PI * u2)

  return mean + z * standardDeviation
}

function addPopulation(
  data: FlowData,
  population: Population
): void {
  for (let i = 0; i < population.count; i++) {
    data.fsc.push(
      randomNormal(
        population.fscMean,
        population.fscSpread
      )
    )

    data.ssc.push(
      randomNormal(
        population.sscMean,
        population.sscSpread
      )
    )
  }
}

export function createFlowData(): FlowData {
  const data: FlowData = {
    fsc: [],
    ssc: []
  }

  const populations: Population[] = [
    {
      count: 1800,
      fscMean: 240,
      fscSpread: 35,
      sscMean: 110,
      sscSpread: 25
    },
    {
      count: 900,
      fscMean: 420,
      fscSpread: 45,
      sscMean: 250,
      sscSpread: 40
    },
    {
      count: 2300,
      fscMean: 590,
      fscSpread: 65,
      sscMean: 430,
      sscSpread: 65
    }
  ]

  populations.forEach((population) => {
    addPopulation(data, population)
  })

  return data
}