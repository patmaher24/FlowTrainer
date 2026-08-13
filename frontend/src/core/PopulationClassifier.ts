export function identifyFscPopulation(
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

export function identifyCd45Population(
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

  if (
    averageCd45 <= 560 &&
    averageSsc >= 300
  ) {
    return 'Likely granulocytes'
  }

  return 'Mixed or uncertain population'
}