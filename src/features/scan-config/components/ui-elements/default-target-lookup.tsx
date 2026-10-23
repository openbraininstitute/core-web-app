'use client';

import { atom, useAtomValue, useSetAtom } from 'jotai';
import { useEffect } from 'react';

import { TaskResultType } from '@/api/entitycore/types/entities/task-result';

import type { ReactNode } from 'react';

/**
 * A field whose default is looked up asynchronously after another field is picked. While the
 * lookup runs, the field is replaced by a loading pill so it cannot be used half-resolved.
 *
 * To cover another field: add a slot, a `copy` entry, and a row in `slotOfField`; the code that
 * owns the lookup then calls `usePublishDefaultLookup(slot, isLoading)`.
 */
export const DefaultLookupSlot = {
  /** e-model validation: the e-features the picked e-model was optimised on */
  ValidationTargetEFeatures: 'validation-target-efeatures',
} as const;

export type TDefaultLookupSlot = (typeof DefaultLookupSlot)[keyof typeof DefaultLookupSlot];

type TLookupCopy = { title: string; detail?: string };

const copy: Record<TDefaultLookupSlot, TLookupCopy> = {
  [DefaultLookupSlot.ValidationTargetEFeatures]: {
    title: 'Finding target e-features',
    detail: "from this e-model's optimisation",
  },
};

/**
 * Which slot, if any, a field belongs to. Matched on the field schema so the generic element
 * renderer needs no workflow knowledge; fields that match nothing render untouched.
 */
export function slotOfField(paramSchema: unknown): TDefaultLookupSlot | undefined {
  const taskResultType = (paramSchema as { task_result_type?: string } | null)?.task_result_type;
  return taskResultType === TaskResultType.EFeatureExtractionResult
    ? DefaultLookupSlot.ValidationTargetEFeatures
    : undefined;
}

/** slots with a lookup in flight; written only by the code that owns each lookup */
const activeLookupsAtom = atom<ReadonlySet<TDefaultLookupSlot>>(new Set<TDefaultLookupSlot>());

/** Marks `slot` as looking up while `active` is true; cleared on change and unmount. */
export function usePublishDefaultLookup(slot: TDefaultLookupSlot, active: boolean) {
  const setActive = useSetAtom(activeLookupsAtom);
  useEffect(() => {
    if (!active) return;
    setActive((prev) => new Set(prev).add(slot));
    return () =>
      setActive((prev) => {
        const next = new Set(prev);
        next.delete(slot);
        return next;
      });
  }, [slot, active, setActive]);
}

/**
 * Wraps a field's picker. While its slot is looking up and nothing is selected it renders a
 * single shimmering pill in place of the picker; otherwise the picker, untouched.
 */
export function DefaultTargetLookup({
  slot,
  hasValue,
  children,
}: {
  slot: TDefaultLookupSlot | undefined;
  hasValue: boolean;
  children: ReactNode;
}) {
  const isLookingUp = useAtomValue(activeLookupsAtom).has(slot as TDefaultLookupSlot);
  if (!slot || !isLookingUp || hasValue) return <>{children}</>;

  const { title, detail } = copy[slot];
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="from-neutral-1 via-primary-0 to-neutral-1 animate-shimmer border-neutral-2 flex h-11 w-full cursor-progress items-center gap-3 overflow-hidden rounded-full border bg-gradient-to-r bg-[length:200%_100%] px-4"
    >
      <span
        aria-hidden
        className="border-primary-8/25 border-t-primary-8 size-4 shrink-0 animate-spin rounded-full border-2"
      />
      <span className="truncate text-sm">
        <span className="text-primary-9 font-medium">{title}</span>
        {detail ? <span className="text-gray-500"> · {detail}</span> : null}
      </span>
    </div>
  );
}
