import { useMemo } from 'react';

export function useOptions(values: string[], data?: Array<{ label: string; value: number }>) {
  return useMemo(() => {
    return (
      data &&
      data.map((item) => {
        const key = String(item.label);
        return {
          id: key,
          label: item.label,
          count: item.value,
          checked: values?.includes(key),
        };
      })
    );
  }, [data, values]);
}
