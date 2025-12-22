export type VoltageUnit = 'mV' | 'V';

export type CurrentUnit = 'pA' | 'nA' | 'A';

export function ensureCurrentUnit(unit: string, defaultUnit: CurrentUnit): CurrentUnit {
  if (['pA', 'nA', 'A'].includes(unit)) return unit as CurrentUnit;
  return defaultUnit;
}

/**
 * Convert voltage to a specific unit (mV, V)
 *
 * @param {array<number>} Voltage series, in Volts
 * @param {string} desirable unit
 * @param {number} baseline conversion factor
 * @return {array<number>} array of converted values
 */
export const convertVoltageSeries = (
  values: number[],
  targetUnit: VoltageUnit,
  baselineConversionFactor: number = 1
) => {
  if (targetUnit === 'V') {
    return values;
  }

  let conversionFactor = 1 * baselineConversionFactor;

  switch (targetUnit) {
    case 'mV':
      conversionFactor = 1000 * baselineConversionFactor;
      break;
    default:
      throw new Error(`Invalid voltage conversion unit: ${targetUnit}`);
  }

  return values.map((value: number) => value * conversionFactor);
};

/**
 * Convert current to a specific int (pA, nA, A)
 *
 * @param {array<number>} Current series, in Amperes
 * @param {string} desirable unit
 * @param {number} baseline conversion factor
 * @return {array<number>} array of converted values
 */
export const convertCurrentSeries = (
  values: number[],
  targetUnit: CurrentUnit,
  baselineConversionFactor: number = 1
) => {
  if (targetUnit === 'A') {
    return values;
  }

  let conversionFactor = 1;

  switch (targetUnit) {
    case 'pA':
      conversionFactor = baselineConversionFactor * 10 ** 12;
      break;
    case 'nA':
      conversionFactor = baselineConversionFactor * 10 ** 9;
      break;
    default:
      throw new Error(`Invalid current conversion unit: ${targetUnit}`);
  }

  return values.map((value: number) => value * conversionFactor);
};
