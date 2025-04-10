import { atom } from 'jotai';
import { CircuitSchemaProps } from '../type';
import CIRCUITS from './circuits_tree';

export const flattenRows = (data: CircuitSchemaProps[]): CircuitSchemaProps[] => {
  return data.reduce((acc, row) => {
    const subcircuits = row.subcircuits ? flattenRows(row.subcircuits) : [];
    return [...acc, row, ...subcircuits];
  }, [] as CircuitSchemaProps[]);
};

const circuitsFlat = flattenRows(CIRCUITS);
const circuitCountAtom = atom(circuitsFlat.length);

export default circuitsFlat;
export { circuitCountAtom };
