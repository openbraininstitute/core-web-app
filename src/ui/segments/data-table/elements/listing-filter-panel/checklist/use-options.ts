import { useMemo } from 'react';

export type FacetLabelValuePair = {
  id: string;
  label: string;
  value: string;
  type?: string | null;
  count: number;
};

export type FacetOptionsList =
  | Array<{
      id: string;
      label: string;
      value: string;
      checked: boolean;
      count: number;
      type?: string | null;
    }>
  | undefined;

export function useOptions(
  values: Array<string>,
  data?: Array<FacetLabelValuePair>
): FacetOptionsList {
  return useMemo(() => {
    return data?.map(({ id, label, value, type, count }) => {
      return {
        id,
        label,
        type,
        value,
        count,
        checked: values?.includes(label),
      };
    });
  }, [data, values]);
}
