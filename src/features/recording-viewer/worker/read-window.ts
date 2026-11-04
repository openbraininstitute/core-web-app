import type { RecordingReader } from '../types';

/** The most values a window of traces holds: about 200 MB of them in memory. */
export const MAX_WINDOW_VALUES = 50_000_000;
/** About how many values are read at a time, for a read too long to hold whole. */
const PIECE_VALUES = 24_000_000;

type ReadOptions = {
  /** False once a newer read has made this one pointless, which then stops. */
  isCurrent: () => boolean;
  onProgress: (fraction: number) => void;
};

/** A window as held: every frame, or past what fits, each channel's low and high in each bin. */
export type ReadWindow = { values: Float32Array; numFrames: number };

/** Frames per piece, in step with the stored chunks so that none is decompressed twice. */
function pieceFrames(reader: RecordingReader) {
  const wanted = Math.max(1, Math.floor(PIECE_VALUES / reader.info.numChannels));
  const chunk = reader.chunkFrames;
  return chunk ? Math.max(1, Math.round(wanted / chunk)) * chunk : wanted;
}

/**
 * Reads `numFrames` frames from `startFrame`. A stretch past `maxValues` is read in pieces, each
 * reduced as it comes to a low and a high frame per bin, so that its spikes stay at the size drawn
 * without its frames being held.
 */
export async function readWindow(
  reader: RecordingReader,
  startFrame: number,
  numFrames: number,
  { isCurrent, onProgress }: ReadOptions,
  maxValues = MAX_WINDOW_VALUES
): Promise<ReadWindow> {
  const { numChannels } = reader.info;
  const maxFrames = Math.floor(maxValues / numChannels);
  const step = pieceFrames(reader);
  const reduce = numFrames > maxFrames;
  const bin = reduce ? Math.ceil(numFrames / Math.floor(maxFrames / 2)) : 1;
  const numBins = Math.ceil(numFrames / bin);
  const kept = reduce ? numBins * 2 : numFrames;
  const values = new Float32Array(kept * numChannels);
  if (reduce) {
    for (let at = 0; at < numBins; at += 1) {
      const base = at * 2 * numChannels;
      values.fill(Number.POSITIVE_INFINITY, base, base + numChannels);
      values.fill(Number.NEGATIVE_INFINITY, base + numChannels, base + 2 * numChannels);
    }
  }

  let done = 0;
  while (done < numFrames) {
    const at = startFrame + done;
    // To the next multiple of the step, so that later pieces start where chunks do.
    const count = Math.min(step - (at % step), numFrames - done);
    const piece = await reader.read(at, count);
    if (!isCurrent()) throw new Error('A newer window was asked for');
    if (reduce) {
      for (let frame = 0; frame < count; frame += 1) {
        const lows = Math.floor((done + frame) / bin) * 2 * numChannels;
        const highs = lows + numChannels;
        const base = frame * numChannels;
        for (let channel = 0; channel < numChannels; channel += 1) {
          const value = piece[base + channel];
          if (value < values[lows + channel]) values[lows + channel] = value;
          if (value > values[highs + channel]) values[highs + channel] = value;
        }
      }
    } else {
      values.set(piece, done * numChannels);
    }
    done += count;
    onProgress(done / numFrames);
    // Lets messages in between the pieces: a newer read, or someone asking how far this has got.
    if (done < numFrames) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return { values, numFrames: kept };
}
