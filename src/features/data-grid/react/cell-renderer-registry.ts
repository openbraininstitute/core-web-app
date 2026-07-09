import type { ComponentType } from 'react';
import type { CellValue } from '../core';

export interface CellRendererProps<Row = unknown> {
  row: Row;
  value: CellValue;
  rowIndex: number;
  params?: Record<string, unknown>;
}

export type CellRendererComponent<Row = unknown> = ComponentType<CellRendererProps<Row>>;

/**
 * Maps a column's `cellRenderer` key to a React component. Keeping cell rendering
 * behind a key-based registry is what lets the pure core stay free of React: a
 * binding declares keys in its schema and registers the matching components here.
 */
export class CellRendererRegistry {
  // heterogeneous components keyed by string — `unknown` row at the boundary
  private readonly map = new Map<string, CellRendererComponent<unknown>>();

  register<Row>(key: string, component: CellRendererComponent<Row>): this {
    this.map.set(key, component as unknown as CellRendererComponent<unknown>);
    return this;
  }

  get(key: string): CellRendererComponent<unknown> | undefined {
    return this.map.get(key);
  }

  has(key: string): boolean {
    return this.map.has(key);
  }
}
