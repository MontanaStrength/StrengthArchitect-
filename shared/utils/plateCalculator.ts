
/**
 * Plate Calculator Utility
 * Calculates optimal plate loading for a target barbell weight.
 */

export interface PlateLoadingResult {
  targetWeight: number;
  barWeight: number;
  perSide: number[];
  achievableWeight: number; // may differ from target if plates don't divide evenly
  displayString: string;
}

/**
 * Calculate plates needed per side for a target weight.
 */
export const calculatePlateLoading = (
  targetWeight: number,
  barWeight: number = 45,
  availablePlates: number[] = [45, 35, 25, 10, 5, 2.5]
): PlateLoadingResult => {
  if (targetWeight <= barWeight) {
    return {
      targetWeight,
      barWeight,
      perSide: [],
      achievableWeight: barWeight,
      displayString: 'Empty bar',
    };
  }

  let remaining = (targetWeight - barWeight) / 2;
  const sortedPlates = [...availablePlates].sort((a, b) => b - a);
  const perSide: number[] = [];

  for (const plate of sortedPlates) {
    while (remaining >= plate - 0.01) {
      perSide.push(plate);
      remaining -= plate;
    }
  }

  const loadedPerSide = perSide.reduce((sum, p) => sum + p, 0);
  const achievableWeight = barWeight + loadedPerSide * 2;

  // Build display string
  let displayString: string;
  if (perSide.length === 0) {
    displayString = 'Empty bar';
  } else {
    const counts: Record<number, number> = {};
    for (const p of perSide) {
      counts[p] = (counts[p] || 0) + 1;
    }
    displayString = Object.entries(counts)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([plate, count]) => count > 1 ? `${count}×${plate}` : `${plate}`)
      .join(' + ') + ' per side';
  }

  return {
    targetWeight,
    barWeight,
    perSide,
    achievableWeight,
    displayString,
  };
};

/**
 * Round a weight to the nearest achievable weight with available plates.
 */
export const roundToNearestLoadable = (
  weight: number,
  barWeight: number = 45,
  smallestPlate: number = 2.5
): number => {
  if (weight <= barWeight) return barWeight;
  const increment = smallestPlate * 2; // both sides
  return barWeight + Math.round((weight - barWeight) / increment) * increment;
};
