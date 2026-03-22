/* advanced_csv_table.ts

This module defines a professional, extensible table API for CSV data
using modern TypeScript features and established design patterns.
*/

import Papa from 'papaparse';

import type { ZodType } from 'zod';

/** Parsing options for CSV. */
export interface CSVParseOptions {
  header?: boolean;
  skipEmptyLines?: boolean;
  worker?: boolean;
}

/** Row validation error representation. */
export interface RowError {
  rowIndex: number;
  fieldErrors: Record<string, string>;
}

/** Generic record type. */
type AnyObject = Record<string, any>;

/** Options for the join operation. */
export interface JoinOptions {
  joinType?: 'inner' | 'left';
}

/** Options for pivoting. */
export interface PivotOptions {
  index: string | string[];
  column: string;
  value: string;
  aggregator?: (existing: any, value: any) => any;
}

/* ======================================================================
 * 1. BaseTable (Abstract)
 *    Encapsulates common table operations and immutability.
 * =====================================================================*/

abstract class BaseTable<T extends AnyObject> {
  protected readonly rows: T[];
  protected readonly header?: string[];
  protected readonly errors?: RowError[];
  protected readonly schema?: ZodType<T>;

  protected constructor(rows: T[], header?: string[], errors?: RowError[], schema?: ZodType<T>) {
    this.rows = rows;
    this.header = header;
    this.errors = errors;
    this.schema = schema;
  }

  /** Factory method – must be overridden by subclasses to create new instances. */
  protected abstract createInstance<U extends AnyObject>(
    rows: U[],
    header?: string[],
    errors?: RowError[] | undefined,
    schema?: ZodType<U> | undefined
  ): BaseTable<U>;

  /** Shallow‑cloned rows to prevent external mutation. */
  getRows(): readonly T[] {
    return this.rows.map((row) => ({ ...row }));
  }

  getHeader(): readonly string[] | undefined {
    return this.header;
  }

  getErrors(): readonly RowError[] | undefined {
    return this.errors;
  }

  /* --------------------------------------------------------------------
   * Update and manipulation methods
   * ------------------------------------------------------------------ */

  update(constant: Partial<T>): BaseTable<T> {
    const newRows = this.rows.map((row) => ({ ...row, ...constant }) as T);
    return this.cloneWithNewRows(newRows);
  }

  updateWhere(predicate: (row: T) => boolean, update: Partial<T>): BaseTable<T> {
    const newRows = this.rows.map((row) => (predicate(row) ? ({ ...row, ...update } as T) : row));
    return this.cloneWithNewRows(newRows);
  }

  updateColumn<K extends keyof T>(key: K, fn: (value: T[K], row: T) => T[K]): BaseTable<T> {
    const newRows = this.rows.map((row) => {
      return { ...row, [key]: fn(row[key], row) } as T;
    });
    return this.cloneWithNewRows(newRows);
  }

  addColumn<K extends string>(name: K, fn: (row: T) => any): BaseTable<T & { [P in K]: any }> {
    const newRows = this.rows.map((row) => {
      const value = fn(row);
      return { ...row, [name]: value } as T & { [P in K]: any };
    });
    const newHeader = this.header ? [...this.header, name] : undefined;
    return this.createInstance(newRows as any, newHeader, undefined, this.schema as any);
  }

  castColumn<K extends keyof T, U>(
    key: K,
    parser: (value: T[K], row: T) => U
  ): BaseTable<Omit<T, K> & { [P in K]: U }> {
    const newRows = this.rows.map((row) => {
      const parsed = parser(row[key], row);
      return { ...row, [key]: parsed } as any;
    });
    return this.createInstance(newRows as any, this.header, this.errors, this.schema as any);
  }

  removeWhere(predicate: (row: T) => boolean): BaseTable<T> {
    const newRows = this.rows.filter((row) => !predicate(row));
    return this.cloneWithNewRows(newRows);
  }

  /* --------------------------------------------------------------------
   * Querying
   * ------------------------------------------------------------------ */

  findRow(value: any, key: keyof T): T | undefined {
    return this.rows.find((row) => row[key] === value);
  }

  findRowsWhere(predicate: (row: T) => boolean): BaseTable<T> {
    const newRows = this.rows.filter(predicate);
    return this.createInstance(newRows, this.header, this.errors, this.schema);
  }

  /** Query builder using either equality object or a custom predicate. */
  find(params: { where: Partial<T> | ((row: T) => boolean) }): Query<T> {
    const predicate: (row: T) => boolean =
      typeof params.where === 'function'
        ? (params.where as (row: T) => boolean)
        : (row: T) => {
            const criteria = params.where as Partial<T>;
            return Object.entries(criteria).every(([key, val]) => (row as any)[key] === val);
          };
    const matches: T[] = [];
    const indices: number[] = [];
    this.rows.forEach((row, idx) => {
      if (predicate(row)) {
        matches.push(row);
        indices.push(idx);
      }
    });
    return new Query<T>(this, matches, indices);
  }

  /* --------------------------------------------------------------------
   * Sorting, joining, pivoting
   * ------------------------------------------------------------------ */

  sortBy<K extends keyof T>(key: K, direction: 'asc' | 'desc'): BaseTable<T>;
  sortBy(compareFn: (a: T, b: T) => number): BaseTable<T>;
  sortBy(...args: any[]): BaseTable<T> {
    let sorted: T[];
    if (args.length === 2) {
      const [key, direction] = args as [keyof T, 'asc' | 'desc'];
      sorted = [...this.rows].sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      const [compareFn] = args as [(a: T, b: T) => number];
      sorted = [...this.rows].sort(compareFn);
    }
    return this.cloneWithNewRows(sorted);
  }

  join<U extends AnyObject>(
    key: (keyof T & keyof U) | (keyof T & keyof U)[],
    other: BaseTable<U>,
    options: JoinOptions = {}
  ): BaseTable<T & U> {
    const joinType = options.joinType ?? 'inner';
    const keys = Array.isArray(key) ? key : [key];
    const otherIndex = new Map<string, U[] | U>();
    other.getRows().forEach((row) => {
      const keyValue = keys.map((k) => String(row[k])).join('||');
      const existing = otherIndex.get(keyValue);
      if (existing) {
        if (Array.isArray(existing)) {
          existing.push(row);
        } else {
          otherIndex.set(keyValue, [existing, row]);
        }
      } else {
        otherIndex.set(keyValue, row);
      }
    });
    const joined: (T & U)[] = [];
    this.rows.forEach((row) => {
      const keyValue = keys.map((k) => String(row[k])).join('||');
      const match = otherIndex.get(keyValue);
      if (Array.isArray(match)) {
        match.forEach((m) => {
          joined.push({ ...row, ...m });
        });
      } else if (match) {
        joined.push({ ...row, ...match });
      } else if (joinType === 'left') {
        joined.push({ ...row } as any);
      }
    });
    return this.createInstance(joined as any, undefined, undefined, undefined);
  }

  pivot(options: PivotOptions): BaseTable<any> {
    const indexKeys = Array.isArray(options.index) ? options.index : [options.index];
    const columnKey = options.column;
    const valueKey = options.value;
    const aggregator = options.aggregator ?? ((existing: any, val: any) => val);
    const groups = new Map<string, AnyObject>();
    this.rows.forEach((row) => {
      const indexValue = indexKeys.map((k) => String(row[k])).join('||');
      const colValue = String((row as any)[columnKey]);
      const val = (row as any)[valueKey];
      let target = groups.get(indexValue);
      if (!target) {
        target = {};
        indexKeys.forEach((k) => {
          (target as any)[k] = row[k];
        });
        groups.set(indexValue, target);
      }
      const existing = (target as any)[colValue];
      (target as any)[colValue] = existing !== undefined ? aggregator(existing, val) : val;
    });
    const pivotRows = Array.from(groups.values());
    const uniqueCols = new Set<string>();
    pivotRows.forEach((row) => {
      Object.keys(row).forEach((key) => {
        if (!indexKeys.includes(key)) {
          uniqueCols.add(key);
        }
      });
    });
    const header = [...indexKeys, ...Array.from(uniqueCols)];
    return this.createInstance(pivotRows as any, header);
  }

  /** Convert rows to CSV string via Papa Parse. */
  toCSV(): string {
    return Papa.unparse(this.rows);
  }

  /** Internal helper to clone table and optionally re‑validate rows. */
  protected cloneWithNewRows<U extends AnyObject>(rows: U[]): BaseTable<U> {
    if (this.schema) {
      const { rows: validRows, errors } = CSVTable.validateRows(
        rows as AnyObject[],
        this.schema as any
      );
      return this.createInstance(validRows as any, this.header, errors, this.schema as any);
    }
    return this.createInstance(rows as any, this.header, this.errors as any, this.schema as any);
  }
}

/* ======================================================================
 * 2. Query result classes – encapsulate match state and operations.
 * =====================================================================*/

class SingleQueryResult<T extends AnyObject> {
  constructor(
    private readonly table: BaseTable<T>,
    private readonly indices: number[],
    public readonly value: T | null
  ) {}

  update(update: Partial<T>): BaseTable<T> {
    if (this.indices.length === 0) {
      return this.table;
    }
    const newRows = this.table
      .getRows()
      .map((row, idx) => (this.indices.includes(idx) ? ({ ...row, ...update } as T) : row));
    return this.table.cloneWithNewRows(newRows);
  }

  remove(): BaseTable<T> {
    if (this.indices.length === 0) {
      return this.table;
    }
    const newRows = this.table.getRows().filter((_, idx) => !this.indices.includes(idx));
    return this.table.cloneWithNewRows(newRows);
  }
}

class MultiQueryResult<T extends AnyObject> {
  constructor(
    private readonly table: BaseTable<T>,
    private readonly indices: number[],
    public readonly values: T[] | null
  ) {}

  update(update: Partial<T>): BaseTable<T> {
    if (!this.values || this.indices.length === 0) {
      return this.table;
    }
    const newRows = this.table
      .getRows()
      .map((row, idx) => (this.indices.includes(idx) ? ({ ...row, ...update } as T) : row));
    return this.table.cloneWithNewRows(newRows);
  }

  remove(): BaseTable<T> {
    if (!this.values || this.indices.length === 0) {
      return this.table;
    }
    const newRows = this.table.getRows().filter((_, idx) => !this.indices.includes(idx));
    return this.table.cloneWithNewRows(newRows);
  }
}

class Query<T extends AnyObject> {
  constructor(
    private readonly table: BaseTable<T>,
    private readonly matches: T[],
    private readonly indices: number[]
  ) {}

  oneOrThrow(): SingleQueryResult<T> {
    if (this.matches.length === 0) {
      throw new Error('No matching row found');
    }
    if (this.matches.length > 1) {
      throw new Error(`Expected one matching row but found ${this.matches.length}`);
    }
    return new SingleQueryResult<T>(this.table, this.indices, this.matches[0]);
  }

  oneOrNull(): SingleQueryResult<T> {
    if (this.matches.length === 0) {
      return new SingleQueryResult<T>(this.table, [], null);
    }
    if (this.matches.length > 1) {
      throw new Error(`Expected one matching row but found ${this.matches.length}`);
    }
    return new SingleQueryResult<T>(this.table, this.indices, this.matches[0]);
  }

  allOrThrow(): MultiQueryResult<T> {
    if (this.matches.length === 0) {
      throw new Error('No matching rows found');
    }
    return new MultiQueryResult<T>(this.table, this.indices, this.matches.slice());
  }

  allOrNull(): MultiQueryResult<T> {
    if (this.matches.length === 0) {
      return new MultiQueryResult<T>(this.table, [], null);
    }
    return new MultiQueryResult<T>(this.table, this.indices, this.matches.slice());
  }
}

/* ======================================================================
 * 3. CSVTable – concrete implementation using PapaParse and optional Zod.
 * =====================================================================*/

export class CSVTable<T extends AnyObject = AnyObject> extends BaseTable<T> {
  private constructor(rows: T[], header?: string[], errors?: RowError[], schema?: ZodType<T>) {
    super(rows, header, errors, schema);
  }

  static async fromFile<U extends AnyObject>(
    file: File,
    schema?: ZodType<U>,
    options: CSVParseOptions = {}
  ): Promise<CSVTable<U>> {
    const parsed: AnyObject[] = [];
    return new Promise((resolve, reject) => {
      Papa.parse<AnyObject>(file, {
        header: options.header ?? true,
        skipEmptyLines: options.skipEmptyLines ?? true,
        worker: options.worker ?? true,
        dynamicTyping: false,
        step: (results) => {
          parsed.push(results.data);
        },
        complete: () => {
          const header = Object.keys(parsed[0] ?? {});
          if (schema) {
            const { rows, errors } = CSVTable.validateRows(parsed, schema);
            resolve(new CSVTable(rows as U[], header, errors, schema));
          } else {
            resolve(new CSVTable(parsed as U[], header));
          }
        },
        error: (err) => reject(err),
      });
    });
  }

  static async fromString<U extends AnyObject>(
    csv: string,
    schema?: ZodType<U>,
    options: CSVParseOptions = {}
  ): Promise<CSVTable<U>> {
    const parsed: AnyObject[] = [];
    return new Promise((resolve, reject) => {
      Papa.parse<AnyObject>(csv, {
        header: options.header ?? true,
        skipEmptyLines: options.skipEmptyLines ?? true,
        worker: options.worker ?? true,
        dynamicTyping: false,
        step: (results) => {
          parsed.push(results.data);
        },
        complete: () => {
          const header = Object.keys(parsed[0] ?? {});
          if (schema) {
            const { rows, errors } = CSVTable.validateRows(parsed, schema);
            resolve(new CSVTable(rows as U[], header, errors, schema));
          } else {
            resolve(new CSVTable(parsed as U[], header));
          }
        },
        error: (err) => reject(err),
      });
    });
  }

  static fromData<U extends AnyObject>(
    data: U[],
    header?: string[],
    schema?: ZodType<U>
  ): CSVTable<U> {
    if (schema) {
      const { rows, errors } = CSVTable.validateRows(data as AnyObject[], schema);
      return new CSVTable(rows as U[], header, errors, schema);
    }
    return new CSVTable(data, header);
  }

  private static validateRows<U extends AnyObject>(
    rows: AnyObject[],
    schema: ZodType<U>
  ): { rows: U[]; errors: RowError[] } {
    const validRows: U[] = [];
    const errors: RowError[] = [];
    rows.forEach((row, idx) => {
      const result = schema.safeParse(row);
      if (result.success) {
        validRows.push(result.data);
      } else {
        const fieldErrors: Record<string, string> = {};
        result.error.issues.forEach((issue) => {
          const key = issue.path.join('.') || '[row]';
          fieldErrors[key] = issue.message;
        });
        errors.push({ rowIndex: idx, fieldErrors });
      }
    });
    return { rows: validRows, errors };
  }

  protected createInstance<U extends AnyObject>(
    rows: U[],
    header?: string[],
    errors?: RowError[] | undefined,
    schema?: ZodType<U> | undefined
  ): BaseTable<U> {
    return new CSVTable(rows as any, header, errors as any, schema as any) as any;
  }
}

/* ======================================================================
 * 4. Exports
 * =====================================================================*/

export { BaseTable, MultiQueryResult, Query, SingleQueryResult };

import { z } from 'zod';

// Example

// Define an interface for your row shape (optional but recommended).
interface User {
  id: string;
  name: string;
  role: string;
  score: number;
}

// Define a Zod schema to validate each row.
const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(['user', 'admin']),
  score: z.coerce.number(),
});

async function handleFileUpload(file: File) {
  // Parse and validate the CSV file.
  const table = await CSVTable.fromFile<User>(file, userSchema);

  // View the valid rows.
  console.log(table.getRows());

  // Update every user’s role to “admin”.
  const promoted = table.update({ role: 'admin' });

  // Double the scores using updateColumn.
  const doubled = promoted.updateColumn('score', (val) => val * 2);

  // Find a single user by id and change their name (throws if not found).
  const updatedSingle = doubled
    .find({ where: { id: '2' } })
    .oneOrThrow()
    .update({ name: 'Robert' });

  // Remove all users whose name is “Alice”.
  const cleaned = updatedSingle
    .find({ where: { name: 'Alice' } })
    .allOrNull()
    .remove();

  // Convert back to CSV.
  const csvString = cleaned.toCSV();
  console.log(csvString);
}
