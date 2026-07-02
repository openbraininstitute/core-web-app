'use client';

import { Select } from 'antd';
import { useEffect, useState, useTransition } from 'react';

import { notify } from '@/components/notification';
import { resetFlags, setFlag } from '@/features/feature-flags';
import { flags } from '@/features/feature-flags/flags';
import { useFlags } from '@/features/feature-flags/provider';
import { Button } from '@/ui/molecules/button';

export function ExperimentalFeatures() {
  const flagValues = useFlags();

  const [optimisticFlags, setOptimisticFlags] = useState<Record<string, unknown>>({});
  const [updatingFlags, setUpdatingFlags] = useState<Set<string>>(new Set());

  const [, startTransition] = useTransition();

  const visibleFlags = flags.filter((flag) =>
    typeof flag.visible === 'boolean' ? flag.visible : flag.visible?.()
  );

  // Clean up optimistic values after server update
  useEffect(() => setOptimisticFlags({}), []);

  const handleFlagChange = (key: string, value: unknown) => {
    setOptimisticFlags((prev) => ({ ...prev, [key]: value }));
    setUpdatingFlags((prev) => new Set(prev).add(key));

    startTransition(async () => {
      try {
        await setFlag(key as any, value as any);
      } catch {
        // Rollback on error
        setOptimisticFlags((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        notify.error({
          title: 'Failed to update feature flag',
          description: 'The feature flag could not be updated. Please try again.',
        });
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
    <div
      data-testid="experimental-features-list"
      className="flex h-full min-h-0 w-full flex-1 flex-col gap-3.5 rounded-2xl bg-white px-4 pt-0"
    >
      <div
        id="experimental-features-content"
        className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col p-4"
      >
        <div className="space-y-3">
          {visibleFlags.map(({ key, description, values, labels }) => (
            <div
              key={key}
              className="flex items-center justify-between gap-4 py-2 border border-gray-100 p-4 rounded-lg"
            >
              <div className="flex-1">
                <div className="font-bold text-lg">{description}</div>
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
        <div className="mt-4 text-right">
          <Button
            type="button"
            variant="destructive"
            rounded
            onClick={() => resetFlags()}
            className="mt-4 px-10 text-sm"
          >
            Reset All
          </Button>
        </div>
      </div>
    </div>
  );
}
