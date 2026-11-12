import type { ComponentType } from 'react';
import type { TCellValue } from '@/features/data-grid/core';
import type { IFilterEditorContext } from '@/features/data-grid/react/filters/context';

export interface ICellRendererProps<Row = unknown> {
  row: Row;
  value: TCellValue;
  rowIndex: number;
  params?: Record<string, unknown>;
}

export type TCellRendererComponent<Row = unknown> = ComponentType<ICellRendererProps<Row>>;

export interface IHeaderRendererProps<Row = unknown> {
  columnId: string;
  label: string;
  /** the grid's store and operators, for a header that sets the column's filter */
  ctx: IFilterEditorContext<Row>;
}

export type THeaderRendererComponent<Row = unknown> = ComponentType<IHeaderRendererProps<Row>>;

/**
 * Maps a column's `cellRenderer` key to a React component. Keeping cell rendering
 * behind a key-based registry is what lets the pure core stay free of React: a
 * binding declares keys in its schema and registers the matching components here.
 */
export class CellRendererRegistry {
  // heterogeneous components keyed by string — `unknown` row at the boundary
  private readonly map = new Map<string, TCellRendererComponent<unknown>>();

  // headers share the registry, so they resolve through the context that already carries it
  private readonly headers = new Map<string, THeaderRendererComponent<unknown>>();

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

  registerHeader<Row>(key: string, component: THeaderRendererComponent<Row>): this {
    this.headers.set(key, component as unknown as THeaderRendererComponent<unknown>);
    return this;
  }

  getHeader(key: string): THeaderRendererComponent<unknown> | undefined {
    return this.headers.get(key);
  }
}
