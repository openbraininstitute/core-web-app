/**
 * Largest Triangle Three Buckets downsampling for typed arrays.
 *
 * Adapted from `src/util/explore-section/LTTB.ts`, which allocates a `[x, y]` tuple per input
 * sample — untenable for the multi-million-sample sweeps in an ephys recording. This variant
 * reads through an index range and never allocates per sample.
 */

/** Maps a sample index to its x value. */
type XAccessor = (index: number) => number;

function lttbCore(
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

  if (desiredLength < 2) {
    return { x: [getX(start)], y: [y[start]] };
  }

  const outX = new Array<number>(desiredLength);
  const outY = new Array<number>(desiredLength);

  // Always include the first point.
  outX[0] = getX(start);
  outY[0] = y[start];

  const bucketSize = (length - 2) / (desiredLength - 2);
  let prevSelectedX = outX[0];
  let prevSelectedY = outY[0];

  for (let i = 1; i < desiredLength - 1; i += 1) {
    const bucketStart = start + Math.floor((i - 1) * bucketSize) + 1;
    const bucketEnd = start + Math.min(Math.floor(i * bucketSize) + 1, length - 1);
    const nextBucketStart = bucketEnd;
    const nextBucketEnd = start + Math.min(Math.floor((i + 1) * bucketSize) + 1, length - 1);

    // Average of the next bucket, which forms the far vertex of the triangle.
    let avgX = 0;
    let avgY = 0;
    const nextLength = nextBucketEnd - nextBucketStart;
    if (nextLength > 0) {
      for (let j = nextBucketStart; j < nextBucketEnd; j += 1) {
        avgX += getX(j);
        avgY += y[j];
      }
      avgX /= nextLength;
      avgY /= nextLength;
    }

    // Keep the point of the current bucket that spans the largest triangle.
    let maxArea = -1;
    let maxIdx = bucketStart;
    for (let j = bucketStart; j < bucketEnd; j += 1) {
      const area = Math.abs(
        (prevSelectedX - avgX) * (y[j] - prevSelectedY) -
          (prevSelectedX - getX(j)) * (avgY - prevSelectedY)
      );
      if (area > maxArea) {
        maxArea = area;
        maxIdx = j;
      }
    }

    outX[i] = getX(maxIdx);
    outY[i] = y[maxIdx];
    prevSelectedX = outX[i];
    prevSelectedY = outY[i];
  }

  // Always include the last point.
  outX[desiredLength - 1] = getX(end - 1);
  outY[desiredLength - 1] = y[end - 1];

  return { x: outX, y: outY };
}

/** Downsample a pair of parallel x/y series. */
export function lttbDownsample(
  x: ArrayLike<number>,
  y: ArrayLike<number>,
  desiredLength: number
): { x: number[]; y: number[] } {
  return lttbCore((index) => x[index], y, 0, Math.min(x.length, y.length), desiredLength);
}
