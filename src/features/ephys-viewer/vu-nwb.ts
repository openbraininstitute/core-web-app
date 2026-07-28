/**
 * Support for NWB files produced at VU University Amsterdam.
 *
 * The logic here is ported from BluePyEfe's `VUNWBReader` and its reader-selection
 * helpers (`bluepyefe/nwbreader.py`, `bluepyefe/reader.py` @ `ce16c35`). It is kept
 * free of h5wasm so it can be unit tested without an NWB file — `NWBVUTrace` in
 * `worker/nwb-trace.ts` does the HDF5 wiring and delegates the decisions here.
 *
 * BluePyEfe reads these files to extract features, so it drops everything it can not
 * map onto a BBP protocol. The viewer instead shows every sweep, translating protocol
 * names where a mapping exists and falling back to the raw VU name where it does not.
 */

import type { Samples } from '@/features/ephys-viewer/trace-index';

export type { Samples };

/** VU stimulus descriptions that correspond to a known BBP protocol. */
export const PROTOCOL_VU_TO_BBP: Record<string, string> = {
  X1PS_SubThresh_DA_0: 'IV',
  X2LP_Search_DA_0: 'IDThresh',
  X3LP_Rheo_DA_0: 'IDRest',
  X4PS_SupraThresh_DA_0: 'IDRest',
  X4PT_C2NSD1SHORT_DA_0: 'PinkNoise',
  X4PU_C2NSD2SHORT_DA_0: 'PinkNoise',
  X5SP_Search_DA_0: 'IDThresh',
  X6SP_Rheo_DA_0: 'IDRest',
  X6SQ_C2SSTRIPLE_DA_0: 'SpikeRec',
  X7Ramp_DA_0: 'Ramp',
  X8_CHIRP_DA_0: 'SineSpec',
  X9_C1QCAPCHK_DA_0: 'CapCheck',
  X9_C1SQCAPCHK_DA_0: 'CapCheck',
  CCSteps_DA_0: 'Step',
  steps_DA_0: 'Step',
};

/** VU stimuli whose samples before 90 ms are a recording artifact. */
export const VU_STIMULI_REQUIRING_INITIAL_SAMPLE_REPLACEMENT = new Set([
  'CCSteps_DA_0',
  'X1PS_SubThresh_DA_0',
  'X4PS_SupraThresh_DA_0',
]);

/** Everything recorded before this point is replaced with the value at this point. */
const INITIAL_SAMPLE_REPLACEMENT_TIME = 0.09; // seconds

/** `bias_current` is stored in pA, samples are in amperes once converted. */
const PICO = 1e-12;

export function isKnownVUProtocol(description: string): boolean {
  return Object.hasOwn(PROTOCOL_VU_TO_BBP, description);
}

/** The BBP protocol name for a VU stimulus description, or the description itself. */
export function translateVUProtocol(description: string): string {
  return isKnownVUProtocol(description) ? PROTOCOL_VU_TO_BBP[description] : description;
}

/**
 * Protocol names in display order: the recognised BBP protocols first, then the
 * raw VU descriptions we have no mapping for, each group sorted alphabetically.
 *
 * Several VU descriptions collapse onto the same BBP protocol (both `X2LP_Search_DA_0`
 * and `X5SP_Search_DA_0` are `IDThresh`), so the result is de-duplicated.
 */
export function orderVUProtocols(descriptions: string[]): string[] {
  const known = new Set<string>();
  const unknown = new Set<string>();

  descriptions.forEach((description) => {
    if (isKnownVUProtocol(description)) {
      known.add(PROTOCOL_VU_TO_BBP[description]);
    } else {
      unknown.add(description);
    }
  });

  return [...[...known].sort(), ...[...unknown].sort()];
}

/**
 * The acquisition entry recording the response to a given stimulus.
 *
 * VU sweep names carry IGOR channel markers: `DA` is the digital-to-analog output
 * channel holding the commanded stimulus, `AD` the analog-to-digital input channel
 * holding the recorded response.
 */
export function toVUAcquisitionName(stimulusName: string): string {
  return stimulusName.replaceAll('DA', 'AD');
}

/**
 * Whether a file looks VU-shaped, i.e. at least one `DA` stimulus entry has a
 * matching `AD` acquisition entry.
 */
export function looksLikeVU(presentationKeys: string[], acquisitionKeys: string[]): boolean {
  const acquisition = new Set(acquisitionKeys);

  return presentationKeys.some(
    (key) => key.includes('DA') && acquisition.has(toVUAcquisitionName(key))
  );
}

export type RecordingUnits = {
  voltageConversion: number;
  currentConversion: number;
  voltageUnit: string;
  currentUnit: string;
};

function approximately(value: number, target: number): boolean {
  return Math.abs(value / target - 1) < 1e-6;
}

/**
 * Correct the swapped conversion factors some VU files ship with, where both
 * channels are labelled "volts".
 *
 * The conversion factors are stored as float32, so they read back as
 * 9.999999960041972e-13 rather than 1e-12 — hence the relative comparison instead
 * of the equality check BluePyEfe uses.
 */
export function correctUnitMixup(units: RecordingUnits): RecordingUnits {
  const { voltageConversion, currentConversion, voltageUnit, currentUnit } = units;

  const isMixedUp =
    approximately(voltageConversion, 1e-12) &&
    approximately(currentConversion, 1e-3) &&
    voltageUnit === 'volts' &&
    currentUnit === 'volts';

  if (!isMixedUp) return units;

  return {
    ...units,
    voltageConversion: 1e-3,
    currentConversion: PICO,
    currentUnit: 'amperes',
  };
}

/**
 * Drop the NaN padding some VU protocols end with, keeping both channels aligned.
 *
 * The returned buffers are views onto the originals, so this does not copy.
 *
 * Mirrors BluePyEfe's `if first_nan:` guard: `numpy.argmax` returns 0 both when
 * there is no NaN and when the very first sample is one, so an entirely NaN sweep
 * is left alone rather than truncated to nothing.
 */
export function trimTrailingNaNs(
  current: Samples,
  voltage: Samples
): { current: Samples; voltage: Samples } {
  let firstNaN = -1;

  for (let i = 0; i < current.length; i += 1) {
    if (Number.isNaN(current[i])) {
      firstNaN = i;
      break;
    }
  }

  if (firstNaN <= 0) return { current, voltage };

  return {
    current: current.subarray(0, firstNaN),
    voltage: voltage.subarray(0, Math.min(firstNaN, voltage.length)),
  };
}

/**
 * Offset the stimulus by the holding current, mutating `current` in place.
 *
 * `bias_current` is in pA while the samples are raw values scaled by `conversion`,
 * so the offset is applied in raw units:
 *
 *   (raw + bias) * 1e-12 === raw * 1e-12 + bias * 1e-12
 *
 * which keeps the `data` + `conversionFactor` split the plots rely on. A conversion
 * other than one pA per count is rescaled accordingly.
 */
export function applyHoldingCurrent(
  current: Samples,
  biasCurrent: number | undefined,
  currentConversion: number
): Samples {
  if (!biasCurrent || !currentConversion) return current;

  const offset = (biasCurrent * PICO) / currentConversion;

  for (let i = 0; i < current.length; i += 1) {
    current[i] += offset;
  }

  return current;
}

export function requiresInitialSampleReplacement(description: string): boolean {
  return VU_STIMULI_REQUIRING_INITIAL_SAMPLE_REPLACEMENT.has(description);
}

/** The sample index 90 ms into a recording taken at `rate` Hz. */
export function initialReplacementIndex(rate: number): number {
  return Math.trunc(INITIAL_SAMPLE_REPLACEMENT_TIME * rate);
}

/**
 * Replace everything before 90 ms with the value at 90 ms, mutating both channels
 * in place. Returns whether the replacement was applied.
 *
 * Where the recording is too short to reach 90 ms BluePyEfe drops the sweep; the
 * viewer keeps it unmodified instead, so the data stays reachable.
 */
export function replaceInitialSamples(current: Samples, voltage: Samples, rate: number): boolean {
  const index = initialReplacementIndex(rate);

  if (index <= 0 || index >= current.length || index >= voltage.length) return false;

  current.fill(current[index], 0, index);
  voltage.fill(voltage[index], 0, index);

  return true;
}
