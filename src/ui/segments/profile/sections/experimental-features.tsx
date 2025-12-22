'use client';

import { useEffect, useState, useTransition } from 'react';
import { Select } from 'antd';

import { resetFlags, setFlag } from '@/features/feature-flags';
import { flags } from '@/features/feature-flags/flags';
import { useFlags } from '@/features/feature-flags/provider';
import { useAppNotification } from '@/components/notification';

export function ExperimentalFeatures() {
  const { error: errorNotify } = useAppNotification();

  const flagValues = useFlags();

  const [optimisticFlags, setOptimisticFlags] = useState<Record<string, unknown>>({});
  const [updatingFlags, setUpdatingFlags] = useState<Set<string>>(new Set());

  const [, startTransition] = useTransition();

  const visibleFlags = flags.filter((flag) =>
    typeof flag.visible === 'boolean' ? flag.visible : flag.visible?.()
  );

  // Clean up optimistic values after server update
  useEffect(() => setOptimisticFlags({}), [flagValues]);

  const handleFlagChange = (key: string, value: unknown) => {
    setOptimisticFlags((prev) => ({ ...prev, [key]: value }));
    setUpdatingFlags((prev) => new Set(prev).add(key));

    startTransition(async () => {
      try {
        await setFlag(key as any, value as any);
      } catch (error) {
        // Rollback on error
        setOptimisticFlags((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        errorNotify({ message: 'Failed to update feature flag', placement: 'topRight' });
      } finally {
        setUpdatingFlags((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    });
  };

  const getOptions = (values: readonly unknown[], labels?: readonly string[]) => {
    return values.map((value, i) => ({
      label: labels?.[i] ?? String(value),
      value,
    }));
  };

  return (
    <div className="mt-8 flex items-center justify-center text-gray-100">
      <div className="w-full max-w-3xl">
        <div className="space-y-3">
          {visibleFlags.map(({ key, description, values, labels }) => (
            <div key={key} className="flex items-start justify-between gap-4 py-2">
              <div className="flex-1">
                <div className="font-medium">{description}</div>
              </div>
              <Select
                value={optimisticFlags[key] ?? flagValues[key as keyof typeof flagValues]}
                onChange={(value) => handleFlagChange(key, value)}
                options={getOptions(values, labels)}
                loading={updatingFlags.has(key)}
                className="w-32"
              />
            </div>
          ))}
        </div>
        <div className="mt-8 text-right">
          <button
            type="button"
            onClick={() => resetFlags()}
            className="bg-destructive mt-4 rounded px-4 py-2 text-sm text-white hover:bg-red-600"
          >
            Reset All
          </button>
        </div>
      </div>
    </div>
  );
}
