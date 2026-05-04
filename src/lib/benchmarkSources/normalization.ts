function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return roundScore(Math.min(100, Math.max(0, value)));
}

export function normalizePercentageScore(value: number): number {
  if (value > 0 && value <= 1) {
    return clampScore(value * 100);
  }

  return clampScore(value);
}

export function normalizeEloScores(values: number[]): number[] {
  const finiteValues = values.filter(Number.isFinite);

  if (finiteValues.length === 0) {
    return values.map(() => 0);
  }

  const min = Math.min(...finiteValues);
  const max = Math.max(...finiteValues);

  if (min === max) {
    return values.map((value) => (Number.isFinite(value) ? 100 : 0));
  }

  return values.map((value) => clampScore(((value - min) / (max - min)) * 100));
}

export function normalizeSpeedScores(values: number[]): number[] {
  const fastest = Math.max(0, ...values.filter(Number.isFinite));

  if (fastest <= 0) {
    return values.map(() => 0);
  }

  return values.map((value) => clampScore((value / fastest) * 100));
}

export function normalizeCostScores(values: number[]): number[] {
  const finiteValues = values.filter((value) => Number.isFinite(value) && value >= 0);

  if (finiteValues.length === 0) {
    return values.map(() => 0);
  }

  const cheapestPositive = Math.min(
    ...finiteValues.filter((value) => value > 0),
  );
  const hasFreeTier = finiteValues.some((value) => value === 0);

  if (hasFreeTier) {
    return values.map((value) => (value === 0 ? 100 : 0));
  }

  return values.map((value) => clampScore((cheapestPositive / value) * 100));
}
