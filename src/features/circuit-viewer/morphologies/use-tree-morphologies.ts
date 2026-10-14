'use client';

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

import {
  loadSections,
  type TSectionsRequest,
} from '@/features/scan-config/components/circuit-viz/sequential-loader';
import { logError } from '@/utils/logger';

import { extentOf } from './extent';
import { placeTrees, type TreeCells } from './load/place-trees';
import { type TreeMorphology, treeOf } from './load/tree';

import type { Sections } from '@/features/scan-config/types';
import type { CircuitMorphologyData, Vec3 } from './types';

/** A small circuit's cells, and where each one's morphology is read. Memoise it: another is another scene. */
export interface TreeSource extends TreeCells {
  /** In the cells' numbering; null for a cell drawn as its soma alone. */
  requests: readonly (TSectionsRequest | null)[];
}

/** How many of the morphologies on show are in, as asked with or without their axons, and of how many. */
interface Progress {
  /** Moves on with every morphology that comes in. */
  version: number;
  loaded: number;
  total: number;
}

export interface TreeLoad {
  /** Every cell, as its morphology once that is in and as its soma until then; null without a source. */
  data: CircuitMorphologyData | null;
  loaded: number;
  total: number;
  /** Read again what could not be read. */
  retry(): void;
}

const NO_PROGRESS: Progress = { version: 0, loaded: 0, total: 0 };

/** A cell's morphology as read, null where it could not be, and whether it was read with its axon. */
interface Read {
  tree: TreeMorphology | null;
  axons: boolean;
}

/**
 * Reads a small circuit's morphologies one at a time, in the cells' order, those of the populations on show only; told
 * to read them with or without axons, it reads them again, and the one in place is drawn till the next is in.
 */
export class TreeLoader {
  private reads: (Read | undefined)[] = [];
  private listeners = new Set<() => void>();
  private axons = false;
  private wanted: number[] = [];
  private stopRun: (() => void) | null = null;
  private progress: Progress = NO_PROGRESS;
  private placed: { version: number; data: CircuitMorphologyData } | null = null;
  private readonly centre: Vec3;

  constructor(
    private readonly source: TreeSource,
    private readonly read: (request: TSectionsRequest) => Promise<Sections> = loadSections
  ) {
    // As the view centres the somas it frames.
    this.centre = extentOf(source.somas.positions)?.mean ?? [0, 0, 0];
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): Progress => this.progress;

  /**
   * The cells as they stood at `version`, placed once whatever the number of morphologies that came in since: a run of
   * them from the cache comes in all at once.
   */
  dataAt(version: number): CircuitMorphologyData {
    if (this.placed?.version !== version) {
      const trees = this.reads.map((read) => read?.tree);
      this.placed = { version, data: placeTrees(this.source, trees, this.centre) };
    }
    return this.placed.data;
  }

  /** Read what the populations other than `hidden` lack, with or without axons, in place of what was being read. */
  load(axons: boolean, hidden: readonly string[]): void {
    this.stop();
    this.axons = axons;
    this.wanted = [];
    let first = 0;
    for (const { name, cells } of this.source.somas.populations) {
      if (!hidden.includes(name)) {
        for (let cell = first; cell < first + cells; cell++) {
          if (this.source.requests[cell]) this.wanted.push(cell);
        }
      }
      first += cells;
    }
    this.changed();
    let stopped = false;
    this.stopRun = () => {
      stopped = true;
    };
    const run = async () => {
      for (const cell of this.wanted) {
        if (stopped) return;
        const request = this.source.requests[cell];
        if (!request || this.reads[cell]?.axons === axons) continue;
        let tree: TreeMorphology | null = null;
        try {
          tree = treeOf(await this.read(request), { axons });
        } catch (e) {
          // The cell stays a soma.
          logError(`Unable to load the morphology of cell ${cell}:`, e);
        }
        // Stopped, it does not undo what the run after it read.
        if (stopped && this.reads[cell]?.axons === this.axons) return;
        this.reads[cell] = { tree, axons };
        this.changed();
      }
    };
    run().catch((e: unknown) => logError('Could not load the morphologies', e));
  }

  /** Read again what could not be read, as last asked. */
  retry(hidden: readonly string[]): void {
    this.reads = this.reads.map((read) => (read?.tree ? read : undefined));
    this.load(this.axons, hidden);
  }

  stop(): void {
    this.stopRun?.();
    this.stopRun = null;
  }

  private changed(): void {
    this.progress = {
      version: this.progress.version + 1,
      loaded: this.wanted.filter((cell) => this.reads[cell]?.axons === this.axons).length,
      total: this.wanted.length,
    };
    for (const listener of this.listeners) listener();
  }
}

const noSubscription = () => () => {};
const noProgress = () => NO_PROGRESS;

/**
 * The cells of `source` with their morphologies, each in place of its soma once it is in; those of `hidden`
 * populations, which is to be memoised, are not read while they are hidden.
 */
export function useTreeMorphologies(
  source: TreeSource | null,
  { axons, hidden }: { axons: boolean; hidden: readonly string[] }
): TreeLoad {
  const loader = useMemo(() => (source ? new TreeLoader(source) : null), [source]);
  useEffect(() => {
    if (!loader) return;
    loader.load(axons, hidden);
    return () => loader.stop();
  }, [loader, axons, hidden]);
  const { version, loaded, total } = useSyncExternalStore(
    loader?.subscribe ?? noSubscription,
    loader?.getSnapshot ?? noProgress,
    noProgress
  );
  const data = useMemo(() => loader?.dataAt(version) ?? null, [loader, version]);
  const retry = useCallback(() => loader?.retry(hidden), [loader, hidden]);
  return { data, loaded, total, retry };
}
