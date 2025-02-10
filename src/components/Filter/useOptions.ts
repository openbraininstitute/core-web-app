import { useMemo } from 'react';

export function useOptions(values: string[], data?: Array<{ label: string; value: number }>) {
  return useMemo(() => {
    // returning unique buckets since some times we have same label and different id (eg. contributors)
    return (
      data &&
      data.map((bucket) => {
        const key = String(bucket.label);
        return {
          id: key,
          label: bucket.label,
          count: bucket.value,
          checked: values?.includes(key),
        };
      })
    );
  }, [data, values]);
}
