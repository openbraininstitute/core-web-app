import { useMemo } from 'react';

export type FacetLabelValuePair = { id: string, label: string; value: string | number };

export type FacetOptionsList = {
  id: string;
  label: string;
  value: string | number;
  checked: boolean;
}[] | undefined;


export function useOptions(values: Array<string>, data?: Array<FacetLabelValuePair>): FacetOptionsList {
  return useMemo(() => {
    return (
      data &&
      data.map((item) => {
        const id = String(item.id);
        return {
          id,
          label: item.label,
          value: item.value,
          checked: values?.includes(id),
        };
      })
    );
  }, [data, values]);
}
