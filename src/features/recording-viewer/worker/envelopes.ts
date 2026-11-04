/** A window of traces reduced to what can be drawn: each channel's range in each pixel. */
export type TraceEnvelopes = {
  /** Pixels per channel. */
  width: number;
  numChannels: number;
  /** `width` lows and highs per channel, in channel order, about the channel's mean. */
  lows: Float32Array;
  highs: Float32Array;
  /** Each channel's range over the window. */
  peakToPeak: Float32Array;
  /** The median across channels of their noise, from the median absolute deviation. */
  noise: number;
};

/** As spikeinterface takes a channel's noise, so that spikes don't inflate it. */
const MAD_TO_STD = 0.6745;
/** Frames sampled per channel to take its noise from. */
const NOISE_FRAMES = 1024;

/** Reduces `numFrames` frames of `numChannels` values each, frame by frame. */
export function traceEnvelopes(
  values: Float32Array,
  numChannels: number,
  numFrames: number,
  requestedWidth: number
): TraceEnvelopes {
  const width = Math.max(1, Math.min(Math.round(requestedWidth), numFrames));
  const means = new Float64Array(numChannels);
  for (let frame = 0; frame < numFrames; frame += 1) {
    const base = frame * numChannels;
    for (let channel = 0; channel < numChannels; channel += 1) {
      means[channel] += values[base + channel];
    }
  }
  for (let channel = 0; channel < numChannels; channel += 1) means[channel] /= numFrames;

  const lows = new Float32Array(numChannels * width).fill(Number.POSITIVE_INFINITY);
  const highs = new Float32Array(numChannels * width).fill(Number.NEGATIVE_INFINITY);
  for (let frame = 0; frame < numFrames; frame += 1) {
    const pixel = Math.floor((frame * width) / numFrames);
    const base = frame * numChannels;
    for (let channel = 0; channel < numChannels; channel += 1) {
      const value = values[base + channel] - means[channel];
      const at = channel * width + pixel;
      if (value < lows[at]) lows[at] = value;
      if (value > highs[at]) highs[at] = value;
    }
  }

  const peakToPeak = new Float32Array(numChannels);
  for (let channel = 0; channel < numChannels; channel += 1) {
    let low = Number.POSITIVE_INFINITY;
    let high = Number.NEGATIVE_INFINITY;
    for (let pixel = 0; pixel < width; pixel += 1) {
      const at = channel * width + pixel;
      if (lows[at] < low) low = lows[at];
      if (highs[at] > high) high = highs[at];
    }
    peakToPeak[channel] = high - low;
  }
  const sampled = Math.min(NOISE_FRAMES, numFrames);
  const stride = numFrames / sampled;
  const sample = new Float32Array(sampled);
  const noises = new Float32Array(numChannels);
  for (let channel = 0; channel < numChannels; channel += 1) {
    for (let i = 0; i < sampled; i += 1) {
      sample[i] = values[Math.floor(i * stride) * numChannels + channel];
    }
    sample.sort();
    const median = sample[sampled >> 1];
    for (let i = 0; i < sampled; i += 1) sample[i] = Math.abs(sample[i] - median);
    sample.sort();
    noises[channel] = sample[sampled >> 1] / MAD_TO_STD;
  }
  noises.sort();
  return { width, numChannels, lows, highs, peakToPeak, noise: noises[numChannels >> 1] ?? 0 };
}
