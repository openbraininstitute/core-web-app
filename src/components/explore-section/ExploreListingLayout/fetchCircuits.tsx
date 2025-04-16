import fs from 'fs/promises';
import path from 'path';
import { flattenRows } from '../Circuit/content/circuits_flat';
import { CircuitSchemaProps } from '../Circuit/type';

export async function fetchFlattenedCircuits(): Promise<CircuitSchemaProps[]> {
  try {
    const filePath = path.join(process.cwd(), 'public', 'circuits', 'circuits.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    const circuits: CircuitSchemaProps[] = JSON.parse(fileContents);

    return flattenRows(circuits);
  } catch (error) {
    throw new Error(`Error reading circuits.json: ${error}`);
  }
}
