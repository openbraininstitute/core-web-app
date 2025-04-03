import { CircuitSchemaProps } from "../type";

const getExpandableRowKeys = (data: CircuitSchemaProps[]): string[] => {
  return data.reduce((acc, row) => {
    const subKeys = row.subcircuit ? getExpandableRowKeys(row.subcircuit) : [];
    return row.hasSubcircuits ? [...acc, row.key, ...subKeys] : [...acc, ...subKeys];
  }, [] as string[]);
};

export default getExpandableRowKeys;