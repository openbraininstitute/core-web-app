import { afterEach, describe, expect, it, vi } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import {
  applyWorkflowSessionSelectionPatch,
  createWorkflowSessionId,
  isWorkflowSessionId,
  readWorkflowSessionSelection,
  resolvePrimarySessionEntityId,
  saveWorkflowSessionSelection,
  WorkflowSessionSelectionMode,
} from '@/features/scan-config/workflow/workflow-session-selection';

import type { Config, ConfigSchema } from '@/features/scan-config/types';
import type { TWorkflowSessionSelectionPayload } from '@/features/scan-config/workflow/workflow-session-selection';

const circuitRef = {
  type: ExtendedEntitiesTypeDict.Circuit,
  id: '11111111-1111-4111-8111-111111111111',
};
const memodelRef = {
  type: ExtendedEntitiesTypeDict.Memodel,
  id: '22222222-2222-4222-8222-222222222222',
};

const schema = {
  properties: {
    initialize: {
      ui_element: ScanConfigUIElementDict.BlockSingle,
      properties: {
        circuit: {
          ui_element: ScanConfigUIElementDict.ModelIdentifier,
        },
      },
    },
  },
} as unknown as ConfigSchema;

function createMemoryStorage() {
  const values = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
    clear: vi.fn(() => values.clear()),
  };
}

describe('scan-config workflow session selection', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates ids that can be recognized as workflow session ids', () => {
    const sessionId = createWorkflowSessionId();

    expect(sessionId).toHaveLength(13);
    expect(isWorkflowSessionId(sessionId)).toBe(true);
    expect(isWorkflowSessionId(null)).toBe(false);
    expect(isWorkflowSessionId('session_1234567890')).toBe(false);
    expect(isWorkflowSessionId('wf_short')).toBe(false);
  });

  it('returns null when storage is unavailable, invalid json, or invalid payload shape', () => {
    expect(readWorkflowSessionSelection('wf_1234567890')).toBeNull();

    const storage = createMemoryStorage();
    vi.stubGlobal('window', { sessionStorage: storage });

    storage.setItem('bad-json', '{');
    storage.setItem(
      'empty-list',
      '{"json":{"mode":"list","items":[]},"meta":{"values":{"items":["array"]}}}'
    );

    expect(readWorkflowSessionSelection('missing')).toBeNull();
    expect(readWorkflowSessionSelection('bad-json')).toBeNull();
    expect(readWorkflowSessionSelection('empty-list')).toBeNull();
  });

  it('round-trips valid single, list, and grouped payloads through session storage', () => {
    const storage = createMemoryStorage();
    vi.stubGlobal('window', { sessionStorage: storage });

    const single: TWorkflowSessionSelectionPayload = {
      mode: WorkflowSessionSelectionMode.Single,
      item: circuitRef,
    };
    const list: TWorkflowSessionSelectionPayload = {
      mode: WorkflowSessionSelectionMode.List,
      items: [circuitRef, memodelRef],
    };
    const grouped: TWorkflowSessionSelectionPayload = {
      mode: WorkflowSessionSelectionMode.Grouped,
      groups: [{ name: 'Models', items: [memodelRef] }],
    };

    expect(saveWorkflowSessionSelection(single, 'wf_single001')).toBe('wf_single001');
    expect(saveWorkflowSessionSelection(list, 'wf_list00001')).toBe('wf_list00001');
    expect(saveWorkflowSessionSelection(grouped, 'wf_group0001')).toBe('wf_group0001');

    expect(readWorkflowSessionSelection('wf_single001')).toEqual(single);
    expect(readWorkflowSessionSelection('wf_list00001')).toEqual(list);
    expect(readWorkflowSessionSelection('wf_group0001')).toEqual(grouped);
  });

  it('resolves the primary entity id by requested browse type before falling back to first ref', () => {
    const selection: TWorkflowSessionSelectionPayload = {
      mode: WorkflowSessionSelectionMode.Grouped,
      groups: [{ items: [circuitRef, memodelRef] }],
    };

    expect(resolvePrimarySessionEntityId(selection, ExtendedEntitiesTypeDict.Memodel)).toBe(
      memodelRef.id
    );
    expect(resolvePrimarySessionEntityId(selection, ExtendedEntitiesTypeDict.EMCellMesh)).toBe(
      circuitRef.id
    );
  });

  it('patches only the initialize model field and preserves sibling config values', () => {
    const config: Config = {
      initialize: {
        circuit: { type: 'CircuitFromID', id_str: 'old-id' },
        seed: 7,
      },
      run: { name: 'scan' },
    };

    const patched = applyWorkflowSessionSelectionPatch({
      config,
      schema,
      sessionSelection: { mode: WorkflowSessionSelectionMode.Single, item: circuitRef },
      resolveFromIdType: (type) =>
        type === ExtendedEntitiesTypeDict.Circuit ? 'CircuitFromID' : undefined,
    });

    expect(patched).toEqual({
      initialize: {
        circuit: { type: 'CircuitFromID', id_str: circuitRef.id },
        seed: 7,
      },
      run: { name: 'scan' },
    });
    expect(config.initialize).toEqual({
      circuit: { type: 'CircuitFromID', id_str: 'old-id' },
      seed: 7,
    });
  });

  it('does not patch when initialize is not an object and throws on unmapped session refs', () => {
    const invalidConfig = { initialize: [] } as Config;

    expect(
      applyWorkflowSessionSelectionPatch({
        config: invalidConfig,
        schema,
        sessionSelection: { mode: WorkflowSessionSelectionMode.Single, item: circuitRef },
        resolveFromIdType: () => 'CircuitFromID',
      })
    ).toBe(invalidConfig);

    expect(() =>
      applyWorkflowSessionSelectionPatch({
        config: { initialize: { circuit: null } },
        schema,
        sessionSelection: { mode: WorkflowSessionSelectionMode.Single, item: memodelRef },
        resolveFromIdType: () => undefined,
      })
    ).toThrow('No scan-config FromID type for entity type "memodel"');
  });
});
