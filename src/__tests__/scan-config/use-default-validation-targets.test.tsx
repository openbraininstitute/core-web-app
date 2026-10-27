import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveOptimisationTargetEFeaturesId } from '@/entity-configuration/domain/validation/optimisation-targets';
import {
  DefaultLookupProvider,
  useDefaultLookup,
} from '@/features/scan-config/bridge/default-lookup-context';
import {
  decideTarget,
  useDefaultValidationTargets,
  VALIDATION_TARGET_FIELD_PATH,
} from '@/features/scan-config/hooks/use-default-validation-targets';
import { type Config, SchemaNameDict } from '@/features/scan-config/types';
import { makeQueryClient } from '@/query-provider/query-client';

vi.mock('@/entity-configuration/domain/validation/optimisation-targets', () => ({
  resolveOptimisationTargetEFeaturesId: vi.fn(),
}));
vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vl', projectId: 'p' }),
}));

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const EM_A = uuid(1);
const EM_B = uuid(2);
const T_A = uuid(101);
const T_B = uuid(102);
const T_X = uuid(999);
const T_SAVED = uuid(500);

const resolve = vi.mocked(resolveOptimisationTargetEFeaturesId);
const callsFor = (emodelId: string) => resolve.mock.calls.filter(([id]) => id === emodelId);

const ref = (type: string, id: string) => ({ type, id_str: id });
const emodel = (id: string | null) => ({ emodel: { emodel: id ? ref('EModelFromID', id) : null } });
const target = (id: string | null) => ({
  target_efeatures: { task_result: id ? ref('TaskResultFromID', id) : null },
});

function setup(initial: Record<string, unknown>) {
  const client = makeQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <DefaultLookupProvider>{children}</DefaultLookupProvider>
    </QueryClientProvider>
  );
  const view = renderHook(
    () => {
      const [config, setConfig] = useState(initial as Config);
      useDefaultValidationTargets({
        schemaName: SchemaNameDict.EModelValidationScanConfig,
        config,
        setConfig,
      });
      return { config, setConfig, pill: useDefaultLookup(VALIDATION_TARGET_FIELD_PATH) };
    },
    { wrapper }
  );
  const patch = (value: Record<string, unknown>) =>
    act(() => view.result.current.setConfig((previous) => ({ ...previous, ...value }) as Config));
  return {
    pill: () => view.result.current.pill,
    targetId: () =>
      ((view.result.current.config.target_efeatures as Record<string, { id_str: string } | null>)
        ?.task_result?.id_str ?? null) as string | null,
    setEmodel: (id: string | null) => patch(emodel(id)),
    setTarget: (id: string | null) => patch(target(id)),
  };
}

const settle = () => act(() => new Promise((done) => setTimeout(done, 60)));

const defaults: Record<string, string | null> = {};

beforeEach(() => {
  resolve.mockReset();
  defaults[EM_A] = T_A;
  defaults[EM_B] = T_B;
  resolve.mockImplementation(async (id) => defaults[id] ?? null);
});

describe('useDefaultValidationTargets', () => {
  it('applies the e-model default to an empty target', async () => {
    const h = setup({ ...emodel(EM_A), ...target(null) });
    await waitFor(() => expect(h.targetId()).toBe(T_A));
  });

  it('replaces the applied default when the e-model changes', async () => {
    const h = setup({ ...emodel(EM_A), ...target(null) });
    await waitFor(() => expect(h.targetId()).toBe(T_A));

    h.setEmodel(EM_B);
    await waitFor(() => expect(h.targetId()).toBe(T_B));
  });

  it('shows the pill while the new e-model is looked up, with the field empty', async () => {
    let releaseB: (id: string) => void = () => {};
    resolve.mockImplementation((id) =>
      id === EM_B
        ? new Promise((done) => {
            releaseB = done as (id: string) => void;
          })
        : Promise.resolve(T_A)
    );
    const h = setup({ ...emodel(EM_A), ...target(null) });
    await waitFor(() => expect(h.targetId()).toBe(T_A));
    expect(h.pill()).toBeUndefined();

    h.setEmodel(EM_B);
    await waitFor(() => expect(h.pill()?.title).toBe('Finding target e-features'));
    expect(h.targetId()).toBeNull();

    await act(async () => releaseB(T_B));
    await waitFor(() => expect(h.targetId()).toBe(T_B));
    expect(h.pill()).toBeUndefined();
  });

  it('ignores a result still in flight for the previous e-model', async () => {
    let releaseA: (id: string) => void = () => {};
    resolve.mockImplementation((id) =>
      id === EM_A
        ? new Promise((done) => {
            releaseA = done as (id: string) => void;
          })
        : Promise.resolve(T_B)
    );
    const h = setup({ ...emodel(EM_A), ...target(null) });
    await settle();

    h.setEmodel(EM_B);
    await waitFor(() => expect(h.targetId()).toBe(T_B));

    await act(async () => releaseA(T_A));
    await settle();
    expect(h.targetId()).toBe(T_B);
  });

  it('clears the applied default when the new e-model has none', async () => {
    defaults[EM_B] = null;
    const h = setup({ ...emodel(EM_A), ...target(null) });
    await waitFor(() => expect(h.targetId()).toBe(T_A));

    h.setEmodel(EM_B);
    await waitFor(() => expect(h.targetId()).toBeNull());
    await settle();
    expect(h.targetId()).toBeNull();
  });

  it("does not overwrite the user's own pick, nor look anything up for it", async () => {
    const h = setup({ ...emodel(EM_A), ...target(null) });
    await waitFor(() => expect(h.targetId()).toBe(T_A));

    h.setTarget(T_X);
    h.setEmodel(EM_B);
    await settle();
    expect(h.targetId()).toBe(T_X);
    expect(callsFor(EM_B)).toHaveLength(0);
  });

  it('does not overwrite a saved value on load, nor look anything up', async () => {
    const h = setup({ ...emodel(EM_A), ...target(T_SAVED) });
    await settle();
    expect(h.targetId()).toBe(T_SAVED);
    expect(h.pill()).toBeUndefined();
    expect(resolve).not.toHaveBeenCalled();

    h.setEmodel(EM_B);
    await settle();
    expect(h.targetId()).toBe(T_SAVED);
  });

  it('does not re-apply the default after the user clears the field', async () => {
    const h = setup({ ...emodel(EM_A), ...target(null) });
    await waitFor(() => expect(h.targetId()).toBe(T_A));

    h.setTarget(null);
    await settle();
    expect(h.targetId()).toBeNull();
  });

  it('re-applies the first default when switching back', async () => {
    const h = setup({ ...emodel(EM_A), ...target(null) });
    await waitFor(() => expect(h.targetId()).toBe(T_A));
    h.setEmodel(EM_B);
    await waitFor(() => expect(h.targetId()).toBe(T_B));

    h.setEmodel(EM_A);
    await waitFor(() => expect(h.targetId()).toBe(T_A));
  });

  it('clears an applied default when the e-model is cleared', async () => {
    const h = setup({ ...emodel(EM_A), ...target(null) });
    await waitFor(() => expect(h.targetId()).toBe(T_A));

    h.setEmodel(null);
    await waitFor(() => expect(h.targetId()).toBeNull());
  });

  it('treats a failed lookup as no default: one attempt, no pill, picker usable', async () => {
    resolve.mockImplementation(async (id) => {
      if (id === EM_B) throw new Error('500');
      return T_A;
    });
    const h = setup({ ...emodel(EM_A), ...target(null) });
    await waitFor(() => expect(h.targetId()).toBe(T_A));

    h.setEmodel(EM_B);
    await waitFor(() => expect(h.targetId()).toBeNull());
    await settle();
    expect(h.pill()).toBeUndefined();
    expect(callsFor(EM_B)).toHaveLength(1);

    // the user can still pick a target by hand
    h.setTarget(T_X);
    await settle();
    expect(h.targetId()).toBe(T_X);
  });

  it('does not retry a failed lookup even when the client would', async () => {
    resolve.mockRejectedValue(new Error('500'));
    const client = makeQueryClient();
    client.setDefaultOptions({ queries: { retry: 3, retryDelay: 1 } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    renderHook(
      () => {
        const [config, setConfig] = useState({ ...emodel(EM_A), ...target(null) } as Config);
        useDefaultValidationTargets({
          schemaName: SchemaNameDict.EModelValidationScanConfig,
          config,
          setConfig,
        });
      },
      { wrapper }
    );
    await settle();
    expect(callsFor(EM_A)).toHaveLength(1);
  });
});

describe('decideTarget', () => {
  it('clears a stale applied value while the new default is pending', () => {
    expect(
      decideTarget({
        emodelId: EM_B,
        currentTargetId: T_A,
        applied: { emodelId: EM_A, targetId: T_A },
        defaultTargetId: undefined,
      })
    ).toEqual({ type: 'clear' });
  });

  it('leaves a value the hook did not write alone', () => {
    expect(
      decideTarget({
        emodelId: EM_B,
        currentTargetId: T_X,
        applied: { emodelId: EM_A, targetId: T_A },
        defaultTargetId: T_B,
      })
    ).toEqual({ type: 'none' });
  });
});
