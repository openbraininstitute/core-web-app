/**
 * Largest Triangle Three Buckets downsampling for typed arrays.
 *
 * Adapted from `src/util/explore-section/LTTB.ts`, which allocates a `[x, y]` tuple per input
 * sample — untenable for the multi-million-sample sweeps this runs over. This variant reads
 * straight out of the parallel input arrays and never allocates per sample.
 */

/** Downsample a pair of parallel x/y series. */
export function lttbDownsample(
  x: ArrayLike<number>,
  y: ArrayLike<number>,
  desiredLength: number
): { x: number[]; y: number[] } {
  const length = Math.min(x.length, y.length);

  if (length <= 0) return { x: [], y: [] };

  if (length <= desiredLength) {
    const allX = new Array<number>(length);
    const allY = new Array<number>(length);
    for (let i = 0; i < length; i += 1) {
      allX[i] = x[i];
      allY[i] = y[i];
    }
    return { x: allX, y: allY };
  }

  if (desiredLength < 2) {
    return { x: [x[0]], y: [y[0]] };
  }

  const outX = new Array<number>(desiredLength);
  const outY = new Array<number>(desiredLength);

  // Always include the first point.
  outX[0] = x[0];
  outY[0] = y[0];

  const bucketSize = (length - 2) / (desiredLength - 2);
  let prevSelectedX = outX[0];
  let prevSelectedY = outY[0];

  for (let i = 1; i < desiredLength - 1; i += 1) {
    const bucketStart = Math.floor((i - 1) * bucketSize) + 1;
    const bucketEnd = Math.min(Math.floor(i * bucketSize) + 1, length - 1);
    const nextBucketStart = bucketEnd;
    const nextBucketEnd = Math.min(Math.floor((i + 1) * bucketSize) + 1, length - 1);

    // Average of the next bucket, which forms the far vertex of the triangle.
    let avgX = 0;
    let avgY = 0;
    const nextLength = nextBucketEnd - nextBucketStart;
    if (nextLength > 0) {
      for (let j = nextBucketStart; j < nextBucketEnd; j += 1) {
        avgX += x[j];
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
          (prevSelectedX - x[j]) * (avgY - prevSelectedY)
      );
      if (area > maxArea) {
        maxArea = area;
        maxIdx = j;
      }
    }

    outX[i] = x[maxIdx];
    outY[i] = y[maxIdx];
    prevSelectedX = outX[i];
    prevSelectedY = outY[i];
  }

  // Always include the last point.
  outX[desiredLength - 1] = x[length - 1];
  outY[desiredLength - 1] = y[length - 1];

  return { x: outX, y: outY };
}
