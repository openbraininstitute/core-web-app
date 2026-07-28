/**
 * Min/max decimation for plotting long recordings.
 *
 * The range is split into one bucket per pair of output points and the extremes of each bucket
 * are kept, so a feature narrower than a bucket still reaches the plot. That is the property
 * LTTB does not have: it keeps a single sample per bucket, chosen by triangle area, and an
 * ephys sweep decimated to 1000 points runs a few thousand samples to the bucket — wide enough
 * for an action potential to fall between the samples it picks.
 *
 * Both extremes are emitted at their own sample time and in the order they occur, so the result
 * reads as an envelope that still follows the signal rather than a run of vertical bars.
 */

/** Maps a sample index to its x value. */
type XAccessor = (index: number) => number;

function minMaxCore(
  getX: XAccessor,
  y: ArrayLike<number>,
  start: number,
  end: number,
  desiredLength: number
): { x: number[]; y: number[] } {
  const length = end - start;

  if (length <= 0) return { x: [], y: [] };

  if (length <= desiredLength) {
    const allX = new Array<number>(length);
    const allY = new Array<number>(length);
    for (let i = 0; i < length; i += 1) {
      allX[i] = getX(start + i);
      allY[i] = y[start + i];
    }
    return { x: allX, y: allY };
  }

  // Each bucket contributes two points, so the budget buys half as many buckets as points.
  const buckets = Math.max(1, Math.floor(desiredLength / 2));

  const outX = new Array<number>(buckets * 2);
  const outY = new Array<number>(buckets * 2);

  for (let bucket = 0; bucket < buckets; bucket += 1) {
    const bucketStart = start + Math.floor((bucket * length) / buckets);
    const bucketEnd = start + Math.floor(((bucket + 1) * length) / buckets);

    let minIndex = -1;
    let maxIndex = -1;
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    for (let i = bucketStart; i < bucketEnd; i += 1) {
      const value = y[i];
      // Both comparisons are false for NaN, so a gap in the recording is never taken for an
      // extreme of the bucket around it.
      if (value < min) {
        min = value;
        minIndex = i;
      }
      if (value > max) {
        max = value;
        maxIndex = i;
      }
    }

    const out = bucket * 2;

    if (minIndex < 0) {
      // Nothing finite in this bucket. NaN leaves a gap rather than a line drawn straight
      // across the stretch of recording that is missing.
      const gapX = getX(bucketStart);
      outX[out] = gapX;
      outY[out] = NaN;
      outX[out + 1] = gapX;
      outY[out + 1] = NaN;
      continue;
    }

    // In the order they occur, so the line on to the next bucket leaves from the later of the
    // two. Where the bucket is flat both indices coincide and the pair collapses onto a point.
    const first = Math.min(minIndex, maxIndex);
    const last = Math.max(minIndex, maxIndex);

    outX[out] = getX(first);
    outY[out] = y[first];
    outX[out + 1] = getX(last);
    outY[out + 1] = y[last];
  }

  return { x: outX, y: outY };
}

/**
 * Downsample a pair of parallel x/y series.
 *
 * Bucketing by position means this composes: running it over a series that is already an
 * envelope gives the same result as decimating the original to the coarser length, provided
 * the coarser bucket count divides the finer one. That is what lets a repetition be read once
 * at full detail and every coarser view be taken from it.
 */
export function minMaxDownsample(
  x: ArrayLike<number>,
  y: ArrayLike<number>,
  desiredLength: number
): { x: number[]; y: number[] } {
  return minMaxCore((index) => x[index], y, 0, Math.min(x.length, y.length), desiredLength);
}

/**
 * Downsample a series sampled at a fixed interval, so the x values never have to be
 * materialised. `start`/`end` bound the window in sample indices.
 */
export function minMaxUniform(
  y: ArrayLike<number>,
  deltaTime: number,
  desiredLength: number,
  start = 0,
  end = y.length
): { x: number[]; y: number[] } {
  const from = Math.max(0, Math.min(start, y.length));
  const to = Math.max(from, Math.min(end, y.length));

  return minMaxCore((index) => index * deltaTime, y, from, to, desiredLength);
}
