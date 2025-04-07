import { CircuitSchemaProps } from '../type';
import CIRCUITS_FULL from './circuits_tree_formatted';

export type CircuitWithCount = {
  circuit: CircuitSchemaProps;
  subcircuitCount: number;
};

// FLATTEN ROWS OBJECT
export const flattenRowsObj = (data: CircuitSchemaProps[]): { [key: string]: CircuitWithCount } => {
  return data.reduce(
    (acc, row) => {
      const subcircuits: { [key: string]: CircuitWithCount } = row.subcircuit
        ? flattenRowsObj(row.subcircuit)
        : {};
      const subcircuitCount = row.subcircuit
        ? row.subcircuit.length +
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
    const subcircuits = row.subcircuit ? flattenRows(row.subcircuit) : [];
    return [...acc, row, ...subcircuits];
  }, [] as CircuitSchemaProps[]);
};

export default flattenRows(CIRCUITS_FULL);
