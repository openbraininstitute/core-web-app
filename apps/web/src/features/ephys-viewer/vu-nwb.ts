/**
 * Support for NWB files produced at VU University Amsterdam.
 *
 * The logic here is ported from BluePyEfe's `VUNWBReader` and its reader-selection
 * helpers (`bluepyefe/nwbreader.py`, `bluepyefe/reader.py` @ `ce16c35`). It is kept
 * free of h5wasm so it can be unit tested without an NWB file — `NWBVUTrace` in
 * `worker/nwb-trace.ts` does the HDF5 wiring and delegates the decisions here.
 *
 * BluePyEfe reads these files to extract features, so it drops everything it can not
 * map onto a BBP protocol and rewrites some of the samples it keeps. The viewer instead
 * shows every sweep under the protocol name the file itself carries, and corrects only
 * what the file states wrongly or leaves out.
 */

import { RecordingType } from '@/features/ephys-viewer/trace-index';

import type { RecordingMeta, Samples } from '@/features/ephys-viewer/trace-index';

/** `bias_current` is stored in pA, samples are in amperes once converted. */
const PICO = 1e-12;

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
    currentConversion: 1e-12,
    currentUnit: 'amperes',
  };
}

/**
 * VU sweeps carry the commanded current on the stimulus channel and the recorded voltage on
 * the response channel, so which half of the corrected unit pair applies depends on the side
 * being asked for.
 */
export function toVURecordingMeta(
  units: RecordingUnits,
  timeUnit: string,
  timeRate: number,
  recordingType: RecordingType
): RecordingMeta {
  const isStimulus = recordingType === RecordingType.STIMULUS;

  return {
    unit: isStimulus ? units.currentUnit : units.voltageUnit,
    conversionFactor: isStimulus ? units.currentConversion : units.voltageConversion,
    timeUnit,
    timeRate,
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
 * The file records the commanded step alone, but the cell was held at `bias_current`
 * throughout, so the stimulus it actually received is the sum of the two.
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
