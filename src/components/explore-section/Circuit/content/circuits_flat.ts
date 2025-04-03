import { CircuitSchemaProps } from '../type';
import CIRCUITS_FULL from './circuits_tree';

export const flattenRows = (data: CircuitSchemaProps[]): CircuitSchemaProps[] => {
  return data.reduce((acc, row) => {
    const subcircuits = row.subcircuit ? flattenRows(row.subcircuit) : [];
    return [...acc, row, ...subcircuits];
  }, [] as CircuitSchemaProps[]);
};

export default flattenRows(CIRCUITS_FULL);
