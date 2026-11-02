/** The index of the first value at or above `value`, in ascending values. */
export function lowerBound(values: ArrayLike<number>, value: number): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (values[mid] < value) low = mid + 1;
    else high = mid;
  }
  return low;
}

/** The index of the first value above `value`, in ascending values. */
export function upperBound(values: ArrayLike<number>, value: number): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (values[mid] <= value) low = mid + 1;
    else high = mid;
  }
  return low;
}
