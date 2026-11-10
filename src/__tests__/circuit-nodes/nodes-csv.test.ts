import { File as H5File, ready } from 'h5wasm';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { csvCell, csvLines } from '@/features/circuit-nodes/nodes-csv';
import { NodesSession } from '@/features/circuit-nodes/worker/nodes-h5';

import type { CsvRequest } from '@/features/circuit-nodes/types';

const POPULATION = 'microcircuit';
const FILE = 'csv.h5';
const ROWS = 23;

const MTYPES = ['L5_TPC:A', 'L2/3, "bitufted"', 'L4_SSC'];
const IDS = ['720575940620980315', '720575940620980304', '720575940618238523'];
const each = <T>(value: (row: number) => T) => Array.from({ length: ROWS }, (_, row) => value(row));

function writeNodesFile() {
  const file = new H5File(FILE, 'w');
  const base = `/nodes/${POPULATION}/0`;
  file.create_group('nodes');
  file.create_group(`nodes/${POPULATION}`);
  file.create_group(base);
  file.create_group(`${base}/@library`);
  file.create_dataset({ name: `${base}/@library/mtype`, data: MTYPES });
  file.create_dataset({ name: `${base}/mtype`, data: Uint8Array.from(each((row) => row % 3)) });
  file.create_dataset({ name: `${base}/x`, data: Float32Array.from(each((row) => row * 1.1)) });
  file.create_dataset({ name: `${base}/depth`, data: Float64Array.from(each((row) => -row / 7)) });
  file.create_dataset({
    name: `${base}/flywire_id`,
    data: BigInt64Array.from(each((row) => BigInt(IDS[row % 3]) + BigInt(row))),
  });
  file.create_dataset({
    name: `${base}/morphology`,
    data: each((row) => (row % 5 === 0 ? `cell ${row}, "main"` : `cell_${row}`)),
  });
  file.close();
  return FILE;
}

const COLUMNS = [
  'node_id',
  'mtype',
  'x',
  'depth',
  'flywire_id',
  'morphology',
  'rate',
  'group',
  'not_there',
];

let session: NodesSession | null = null;

beforeAll(async () => {
  await ready;
});

afterEach(async () => {
  if (!session) return;
  session.close();
  session = null;
  const { FS } = await ready;
  FS.unlink(FILE);
});

function open() {
  if (session) return session;
  session = new NodesSession(writeNodesFile(), POPULATION);
  session.setDerivedColumns('test', [
    { name: 'rate', values: Float64Array.from(each((row) => (row % 4 === 0 ? NaN : row / 3))) },
    {
      name: 'group',
      library: ['a', 'b, c'],
      indices: Uint32Array.from(each((row) => row % 2)),
    },
  ]);
  return session;
}

function csv(request: Partial<CsvRequest> = {}, blockRows?: number) {
  const parts = [...open().csvParts({ columns: COLUMNS, ...request }, blockRows)];
  const decoder = new TextDecoder();
  return { parts, text: parts.map(({ part }) => decoder.decode(part)).join('') };
}

/** The same rows as the table pages them in, written a cell at a time. */
function paged(request: Partial<CsvRequest> = {}) {
  const columns = request.columns ?? COLUMNS;
  const { rows } = open().getRows({ start: 0, end: ROWS, columns, ...request });
  return [columns, ...rows.map((row) => columns.map((column) => row[column]))]
    .map((cells) => `${cells.map(csvCell).join(',')}\r\n`)
    .join('');
}

describe('csvLines', () => {
  it('writes a line per row, quoting what needs it and leaving gaps empty', () => {
    const lines = csvLines(
      [
        [0, 1],
        ['L5_TPC:A', 'say "hi"'],
        ['a, b', undefined],
        [Number.NaN, 'two\nlines'],
      ],
      2
    );
    expect(lines).toBe('0,L5_TPC:A,"a, b",NaN\r\n1,"say ""hi""",,"two\nlines"\r\n');
  });
});

describe('NodesSession.csvParts', () => {
  it('writes the cells the table shows, read straight from the file', () => {
    const { text } = csv();
    expect(text).toBe(paged());
    const [header, first] = text.split('\r\n');
    expect(header).toBe(COLUMNS.join(','));
    expect(first).toBe(`0,L5_TPC:A,0,0,${IDS[0]},"cell 0, ""main""",NaN,a,`);
  });

  it('writes them in the order of a sort, for the rows a filter keeps', () => {
    const request: Partial<CsvRequest> = {
      sort: [
        { column: 'mtype', direction: 'desc' },
        { column: 'depth', direction: 'asc' },
      ],
      filter: { x: { filterType: 'number', type: 'greaterThan', filter: '4' } },
    };
    const { text, parts } = csv(request, 5);
    expect(text).toBe(paged(request));
    expect(parts.at(-1)?.total).toBe(19);
    expect(text.split('\r\n')[1].startsWith('21,L5_TPC:A,')).toBe(true);
  });

  it('writes the same text whatever the size of its parts', () => {
    const whole = csv().text;
    for (const blockRows of [1, 7, ROWS, ROWS + 1]) {
      const { text, parts } = csv({}, blockRows);
      expect(text).toBe(whole);
      expect(parts.map((p) => p.done)).toEqual(
        Array.from({ length: Math.ceil(ROWS / blockRows) }, (_, i) =>
          Math.min(ROWS, (i + 1) * blockRows)
        )
      );
      expect(parts.every((p) => p.total === ROWS)).toBe(true);
    }
  });

  it('writes only the columns asked for, in their order', () => {
    const request = { columns: ['mtype', 'node_id'] };
    expect(csv(request).text).toBe(paged(request));
    expect(csv(request).text.split('\r\n')[2]).toBe('"L2/3, ""bitufted""",1');
  });

  it('reads no column from the file twice under a sort, however many there are', () => {
    const opened = open();
    const loads: string[] = [];
    const inner = opened as unknown as { loadColumn: (name: string) => unknown };
    const loadColumn = inner.loadColumn.bind(opened);
    inner.loadColumn = (name) => {
      loads.push(name);
      return loadColumn(name);
    };
    csv({ sort: [{ column: 'x', direction: 'desc' }] }, 2);
    const fromFile = ['mtype', 'x', 'depth', 'flywire_id', 'morphology'];
    for (const name of fromFile) expect(loads.filter((n) => n === name).length).toBeLessThan(3);
  });

  it('writes the names alone where the filter keeps no row', () => {
    const { text, parts } = csv({
      filter: { x: { filterType: 'number', type: 'greaterThan', filter: '1000' } },
    });
    expect(text).toBe(`${COLUMNS.join(',')}\r\n`);
    expect(parts).toMatchObject([{ done: 0, total: 0 }]);
  });
});
