import type { ComponentType } from 'react';
import type { TCellValue } from '../core';

export interface ICellRendererProps<Row = unknown> {
  row: Row;
  value: TCellValue;
  rowIndex: number;
  params?: Record<string, unknown>;
}

export type TCellRendererComponent<Row = unknown> = ComponentType<ICellRendererProps<Row>>;

/**
 * Maps a column's `cellRenderer` key to a React component. Keeping cell rendering
 * behind a key-based registry is what lets the pure core stay free of React: a
 * binding declares keys in its schema and registers the matching components here.
 */
export class CellRendererRegistry {
  // heterogeneous components keyed by string — `unknown` row at the boundary
  private readonly map = new Map<string, TCellRendererComponent<unknown>>();

  register<Row>(key: string, component: TCellRendererComponent<Row>): this {
    this.map.set(key, component as unknown as TCellRendererComponent<unknown>);
    return this;
  }

  get(key: string): TCellRendererComponent<unknown> | undefined {
    return this.map.get(key);
  }

  has(key: string): boolean {
    return this.map.has(key);
  }
}
