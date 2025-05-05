import { CircuitSchemaProps } from '../../type';

export type CircuitWithCount = {
  circuit: CircuitSchemaProps;
  subcircuitCount: number;
};

// FLATTEN ROWS OBJECT
export const flattenRowsObj = (data: CircuitSchemaProps[]): { [key: string]: CircuitWithCount } => {
  return data.reduce(
    (acc, row) => {
      const subcircuits: { [key: string]: CircuitWithCount } = row.subcircuits
        ? flattenRowsObj(row.subcircuits)
        : {};
      const subcircuitCount = row.subcircuits
        ? row.subcircuits.length +
          Object.values(subcircuits).reduce(
            (sum, { subcircuitCount: innerSubcircuitCount }: CircuitWithCount) =>
              sum + innerSubcircuitCount,
            0
          )
        : 0;

      return {
        ...acc,
        [row.key]: { circuit: row, subcircuitCount },
        ...subcircuits,
      };
    },
    {} as { [key: string]: CircuitWithCount }
  );
};

// FLATTERN ROWS JSON
export const flattenRows = (data: CircuitSchemaProps[]): CircuitSchemaProps[] => {
  return data.reduce((acc, row) => {
    const subcircuits = row.subcircuits ? flattenRows(row.subcircuits) : [];
    return [...acc, row, ...subcircuits];
  }, [] as CircuitSchemaProps[]);
};
