import { describe, expect, it } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { resolveOutputStrategy } from '@/features/scan-config/outputs/registry';
import { ActivityCustomFileRenderer } from '@/features/scan-config/types';

import type { TOutputEntity, TResolvedOutput } from '@/features/scan-config/outputs/types';

function makeResolved(entity: Partial<TOutputEntity>, strategyId = 'circuit'): TResolvedOutput {
  return {
    ref: { id: 'ref-id', type: entity.type },
    strategyId,
    entity: entity as TOutputEntity,
    extendedType: undefined,
  };
}

describe('workflow output strategies', () => {
  it('routes a generated ref to the strategy that claims it', () => {
    expect(resolveOutputStrategy({ id: 'a', type: EntityTypeDict.TaskResult })?.id).toBe(
      'task-result'
    );
    expect(resolveOutputStrategy({ id: 'b', type: EntityTypeDict.Circuit })?.id).toBe('circuit');
    expect(
      resolveOutputStrategy({ id: 'c', type: ExtendedEntitiesTypeDict.CellMorphology })?.id
    ).toBe('registered-entity');
  });

  it('has no strategy for a ref with no type, rather than guessing one', () => {
    // the typeless case is handled by resolveStrategyForRef, which looks the type up first
    expect(resolveOutputStrategy({ id: 'd' })).toBeNull();
  });

  it('survives a record whose assets came back null', () => {
    // `hasAssets` treats null as present and the field is typed non-nullable, so a naive
    // guard here dereferences null and takes down the output panel
    const taskResult = resolveOutputStrategy({ id: 'h', type: EntityTypeDict.TaskResult });
    const circuit = resolveOutputStrategy({ id: 'i', type: EntityTypeDict.Circuit });
    const nullAssets = { id: 'x', type: EntityTypeDict.TaskResult, assets: null };

    expect(() =>
      taskResult?.toFiles(makeResolved(nullAssets as never, 'task-result'))
    ).not.toThrow();
    expect(taskResult?.toFiles(makeResolved(nullAssets as never, 'task-result'))).toEqual([]);
    expect(() => circuit?.toFiles(makeResolved(nullAssets as never))).not.toThrow();
    expect(() =>
      circuit?.refetchInterval?.({ data: makeResolved(nullAssets as never), dataUpdateCount: 1 })
    ).not.toThrow();
  });

  it('lists every asset a task result carries, not just the first', () => {
    // the whole point of the result is the artefacts it holds; a run writes more than one
    const strategy = resolveOutputStrategy({ id: 'e', type: EntityTypeDict.TaskResult });

    const files = strategy?.toFiles(
      makeResolved(
        {
          id: 'result-id',
          type: EntityTypeDict.TaskResult,
          assets: [
            { id: 'asset-1', path: 'features.json' },
            { id: 'asset-2', path: 'protocols.json' },
          ],
        } as Partial<TOutputEntity>,
        'task-result'
      )
    );

    expect(files).toHaveLength(2);
    expect(files?.map((file) => file.id)).toEqual(['asset-1', 'asset-2']);
    expect(files?.map((file) => file.name)).toEqual(['features.json', 'protocols.json']);
    expect(files?.every((file) => file.renderer === ActivityCustomFileRenderer.Default)).toBe(true);
  });

  it('shows an entity output as a single mini-detail row', () => {
    const strategy = resolveOutputStrategy({ id: 'f', type: EntityTypeDict.Circuit });

    const files = strategy?.toFiles(
      makeResolved({
        id: 'circuit-id',
        name: 'Extracted circuit',
        type: EntityTypeDict.Circuit,
        assets: [{ id: 'asset-1', path: 'circuit_config.json' }],
      } as Partial<TOutputEntity>)
    );

    expect(files).toHaveLength(1);
    expect(files?.[0].renderer).toBe(ActivityCustomFileRenderer.MiniDetailView);
    expect(files?.[0].name).toBe('Extracted circuit');
  });

  it('stops polling a circuit once its visualization asset lands', () => {
    const strategy = resolveOutputStrategy({ id: 'g', type: EntityTypeDict.Circuit });

    const pending = strategy?.refetchInterval?.({
      data: makeResolved({ type: EntityTypeDict.Circuit, assets: [] } as Partial<TOutputEntity>),
      dataUpdateCount: 1,
    });
    expect(pending).toBe(2_000);

    const settled = strategy?.refetchInterval?.({
      data: makeResolved({
        type: EntityTypeDict.Circuit,
        assets: [{ id: 'vis', label: 'circuit_visualization' }],
      } as Partial<TOutputEntity>),
      dataUpdateCount: 1,
    });
    expect(settled).toBe(false);
  });
});
