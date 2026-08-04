'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { getEtype } from '@/api/entitycore/queries/annotations/etype';
import { getMtype } from '@/api/entitycore/queries/annotations/mtype';
import { useDebouncedCallback } from '@/hooks/hooks';
import { Checkbox } from '@/ui/molecules/checkbox';
import { DateRangePicker } from '@/ui/molecules/date-picker';
import { Input } from '@/ui/molecules/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/molecules/select';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { cn } from '@/utils/css-class';

import {
  DEFAULT_FILTER_COMMIT_MODE,
  FilterCommitMode,
  FilterOptionsKind,
  FilterValueKind,
  freeEntryKind,
  GridActionType,
  isEmptyFilterValue,
  OperatorUiKind,
} from '../../core';
import {
  GRID_INPUT_CLASS,
  GRID_NESTED_OVERLAY_Z_CLASS,
  GRID_SELECT_CONTENT_MATCH_TRIGGER_CLASS,
  GRID_SELECT_ITEM_CLASS,
  GRID_SELECT_TRIGGER_CLASS,
} from '../molecules-theme';
import { useGridState } from '../use-grid-state';
import { dateRangeToFilterValue } from './date-range-value';
import { splitIdTokens } from './id-tokens';
import { FREE_ENTRY_SEPARATOR_HINT, resolveFilterPlaceholder } from './placeholder';
import { useSetOptions } from './use-set-options';

import type { ReactNode } from 'react';
import type { DateRange } from 'react-day-picker';
import type { IFilterTarget, TFilterOptionsSource, TFilterValue } from '../../core';
import type { IFilterEditorContext } from './context';
import type { IIdTokenSplit } from './id-tokens';

const COMMIT_DEBOUNCE_MS = 250;

const INPUT_CLASS = GRID_INPUT_CLASS;

export interface IFilterEditorProps {
  ctx: IFilterEditorContext;
  /** slot in `GridState.filters`: a column id, or an advanced filter's `adv:<group>:<filter>` key */
  filterKey: string;
  /** heading shown above the controls (the column header, or the filter's label) */
  label: string;
  /** replaces the plain heading, keeping the target's description beneath it */
  titleSlot?: ReactNode;
  /** fields this filter can be matched by; the "match by" switch shows only when >1 */
  targets: ReadonlyArray<IFilterTarget>;
  /** close the popover (Apply / done) */
  onClose: () => void;
}

function emptyForUiKind(kind: string): TFilterValue {
  switch (kind) {
    case 'number':
      return { kind: FilterValueKind.Number, value: null };
    case 'range':
      return { kind: FilterValueKind.Range, min: null, max: null };
    case 'dateRange':
      return { kind: FilterValueKind.DateRange, from: null, to: null };
    case 'set':
      return { kind: FilterValueKind.Set, values: [] };
    case 'boolean':
      return { kind: FilterValueKind.Boolean, value: null };
    default:
      return { kind: FilterValueKind.Text, text: '' };
  }
}

function toNumber(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toDateOrUndefined(iso: string | null): Date | undefined {
  return iso ? new Date(iso) : undefined;
}

/**
 * The single filter editor behind both surfaces — the column header popover and the
 * toolbar's advanced-filter menubar. Drives the headless store directly (no AG Grid
 * filter model) and only ever reads/writes one {@link IFilterEditorProps.filterKey} slot.
 */
export function FilterEditor({
  ctx,
  filterKey,
  label,
  titleSlot,
  targets,
  onClose,
}: IFilterEditorProps) {
  const state = useGridState(ctx.controller);
  const current = state.filters[filterKey];

  // An entry naming a target that is no longer offered falls back to the first target.
  const [targetId, setTargetId] = useState<string>(() =>
    current?.targetId && targets.some((t) => t.id === current.targetId)
      ? current.targetId
      : targets[0].id
  );
  const target = targets.find((t) => t.id === targetId) ?? targets[0];
  const operatorIds = target.operators;
  const facetKey = target.facetKey ?? target.field;
  const optionsSource = target.options;
  const description = target.description;
  // A target with no option source collects pasted values instead of facet checkboxes.
  const freeKind = freeEntryKind(target);
  const freeEntry = freeKind !== null;

  // The current entry's operator only applies while its target is the active one.
  const [operator, setOperator] = useState<string>(() =>
    current && (current.targetId ?? targets[0].id) === target.id ? current.operator : operatorIds[0]
  );
  const operatorDef = ctx.operators.get(operator);
  const uiKind = operatorDef.uiKind;
  const commitMode = operatorDef.commitMode ?? DEFAULT_FILTER_COMMIT_MODE;

  // Working value. In `apply` mode nothing reaches the grid until Apply.
  const [pending, setPending] = useState<TFilterValue>(() =>
    current && current.operator === operator ? current.value : emptyForUiKind(uiKind)
  );

  // Chips and committed value are derived from this raw draft, so a malformed token
  // stays visible (and blocks Apply) instead of being silently dropped.
  const [idDraft, setIdDraft] = useState<string>(() =>
    current?.value.kind === FilterValueKind.Set &&
    (current.targetId ?? targets[0].id) === target.id &&
    freeEntry
      ? current.value.values.join('\n')
      : ''
  );
  const idTokens = useMemo(
    () => splitIdTokens(idDraft, freeKind ?? undefined),
    [idDraft, freeKind]
  );
  const placeholder = resolveFilterPlaceholder(target, operatorDef);

  const commit = (v: TFilterValue | null) => {
    if (v === null || isEmptyFilterValue(v)) {
      ctx.controller.store.dispatch({
        type: GridActionType.SetFilter,
        columnId: filterKey,
        entry: null,
      });
    } else {
      ctx.controller.store.dispatch({
        type: GridActionType.SetFilter,
        columnId: filterKey,
        entry: { columnId: filterKey, operator, targetId: target.id, value: v },
      });
    }
  };
  const debouncedCommit = useDebouncedCallback(
    commit,
    [filterKey, operator, target.id],
    COMMIT_DEBOUNCE_MS
  );

  // Typed inputs debounce so we don't refetch on every keystroke.
  const change = (v: TFilterValue, opts?: { debounce?: boolean }) => {
    setPending(v);
    if (commitMode === FilterCommitMode.Immediate) {
      if (opts?.debounce) debouncedCommit(v);
      else commit(v);
    }
  };

  const onOperatorChange = (op: string) => {
    debouncedCommit.cancel();
    setOperator(op);
    setPending(emptyForUiKind(ctx.operators.get(op).uiKind));
    setIdDraft('');
    ctx.controller.store.dispatch({
      type: GridActionType.SetFilter,
      columnId: filterKey,
      entry: null,
    });
  };

  /** Switching the matched field starts over: a UUID is meaningless as a name chip. */
  const onTargetChange = (id: string) => {
    if (id === target.id) return;
    const next = targets.find((t) => t.id === id) ?? targets[0];
    const nextOperator = next.operators[0];
    debouncedCommit.cancel();
    setTargetId(next.id);
    setOperator(nextOperator);
    setPending(emptyForUiKind(ctx.operators.get(nextOperator).uiKind));
    setIdDraft('');
    ctx.controller.store.dispatch({
      type: GridActionType.SetFilter,
      columnId: filterKey,
      entry: null,
    });
  };

  // A malformed id must never reach the API.
  const applyBlocked = freeEntry && idTokens.invalid.length > 0;

  const onApply = () => {
    if (applyBlocked) return;
    debouncedCommit.cancel();
    commit(isEmptyFilterValue(pending) ? null : pending);
    onClose();
  };

  const onReset = () => {
    debouncedCommit.cancel();
    setPending(emptyForUiKind(uiKind));
    setIdDraft('');
    commit(null);
  };

  const pendingDateRange: DateRange | undefined =
    pending.kind === FilterValueKind.DateRange
      ? { from: toDateOrUndefined(pending.from), to: toDateOrUndefined(pending.to) }
      : undefined;

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        {titleSlot ?? (
          <span className="text-[13px] font-semibold text-primary-8">{label || 'Filter'}</span>
        )}
        {description ? <span className="text-xs text-gray-400">{description}</span> : null}
      </div>

      {targets.length > 1 && (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium tracking-wide text-gray-400 uppercase">
            Match by
          </span>
          <div className="flex items-center gap-0.5 rounded-xl bg-gray-100 p-0.5">
            {targets.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={t.id === target.id}
                onClick={() => onTargetChange(t.id)}
                className={cn(
                  'flex-1 rounded-[10px] px-2 py-1 text-xs font-medium transition-colors',
                  t.id === target.id
                    ? 'bg-white text-primary-8 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {operatorIds.length > 1 && (
        <Select value={operator} onValueChange={onOperatorChange}>
          <SelectTrigger className={cn('h-9 w-full', GRID_SELECT_TRIGGER_CLASS)}>
            <SelectValue>{ctx.operators.get(operator).label}</SelectValue>
          </SelectTrigger>
          <SelectContent className={GRID_SELECT_CONTENT_MATCH_TRIGGER_CLASS}>
            {operatorIds.map((id) => (
              <SelectItem key={id} value={id} className={GRID_SELECT_ITEM_CLASS}>
                {ctx.operators.get(id).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/*
        A text operator with a STATIC option list is an exact-match enum, not free text,
        so it picks from the list. The committed value is still a plain text value.
      */}
      {uiKind === OperatorUiKind.Text &&
        (optionsSource?.kind === FilterOptionsKind.Static ? (
          <Select
            value={pending.kind === FilterValueKind.Text ? pending.text : ''}
            onValueChange={(v) => change({ kind: FilterValueKind.Text, text: v })}
          >
            <SelectTrigger
              className={cn(
                'h-9 w-full',
                GRID_SELECT_TRIGGER_CLASS,
                !(pending.kind === FilterValueKind.Text && pending.text) && 'text-gray-300'
              )}
            >
              <SelectValue placeholder={placeholder}>
                {optionsSource.items.find(
                  (i) => pending.kind === FilterValueKind.Text && i.id === pending.text
                )?.label ?? placeholder}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className={GRID_SELECT_CONTENT_MATCH_TRIGGER_CLASS}>
              {optionsSource.items.map((item) => (
                <SelectItem key={item.id} value={item.id} className={GRID_SELECT_ITEM_CLASS}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            autoFocus
            className={INPUT_CLASS}
            placeholder={placeholder}
            value={pending.kind === FilterValueKind.Text ? pending.text : ''}
            onChange={(e) =>
              change({ kind: FilterValueKind.Text, text: e.target.value }, { debounce: true })
            }
          />
        ))}

      {uiKind === OperatorUiKind.Number && (
        <Input
          type="number"
          className={INPUT_CLASS}
          placeholder={placeholder}
          value={
            pending.kind === FilterValueKind.Number && pending.value != null
              ? String(pending.value)
              : ''
          }
          onChange={(e) =>
            change(
              { kind: FilterValueKind.Number, value: toNumber(e.target.value) },
              { debounce: true }
            )
          }
        />
      )}

      {uiKind === OperatorUiKind.Range && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            className={INPUT_CLASS}
            placeholder="Min"
            value={
              pending.kind === FilterValueKind.Range && pending.min != null
                ? String(pending.min)
                : ''
            }
            onChange={(e) =>
              change(
                {
                  kind: FilterValueKind.Range,
                  min: toNumber(e.target.value),
                  max: pending.kind === FilterValueKind.Range ? pending.max : null,
                },
                { debounce: true }
              )
            }
          />
          <span className="text-gray-300">–</span>
          <Input
            type="number"
            className={INPUT_CLASS}
            placeholder="Max"
            value={
              pending.kind === FilterValueKind.Range && pending.max != null
                ? String(pending.max)
                : ''
            }
            onChange={(e) =>
              change(
                {
                  kind: FilterValueKind.Range,
                  min: pending.kind === FilterValueKind.Range ? pending.min : null,
                  max: toNumber(e.target.value),
                },
                { debounce: true }
              )
            }
          />
        </div>
      )}

      {uiKind === OperatorUiKind.DateRange && (
        <DateRangePicker
          value={pendingDateRange}
          onChange={(dr) => change(dateRangeToFilterValue(dr))}
          // the calendar portals to the body: it has to clear the popover that opened it
          contentClassName={GRID_NESTED_OVERLAY_Z_CLASS}
        />
      )}

      {uiKind === OperatorUiKind.Boolean &&
        (() => {
          const boolValue =
            pending.kind === FilterValueKind.Boolean && pending.value != null
              ? pending.value
                ? 'yes'
                : 'no'
              : 'any';
          return (
            <Select
              value={boolValue}
              onValueChange={(v) =>
                change({ kind: FilterValueKind.Boolean, value: v === 'any' ? null : v === 'yes' })
              }
            >
              <SelectTrigger className={cn('h-9 w-full', GRID_SELECT_TRIGGER_CLASS)}>
                <SelectValue>{{ any: 'Any', yes: 'Yes', no: 'No' }[boolValue]}</SelectValue>
              </SelectTrigger>
              <SelectContent className={GRID_SELECT_CONTENT_MATCH_TRIGGER_CLASS}>
                <SelectItem value="any" className={GRID_SELECT_ITEM_CLASS}>
                  Any
                </SelectItem>
                <SelectItem value="yes" className={GRID_SELECT_ITEM_CLASS}>
                  Yes
                </SelectItem>
                <SelectItem value="no" className={GRID_SELECT_ITEM_CLASS}>
                  No
                </SelectItem>
              </SelectContent>
            </Select>
          );
        })()}

      {uiKind === OperatorUiKind.Set &&
        (freeEntry ? (
          <IdTokenEditor
            draft={idDraft}
            tokens={idTokens}
            placeholder={placeholder}
            onDraftChange={(text) => {
              setIdDraft(text);
              change({
                kind: FilterValueKind.Set,
                values: splitIdTokens(text, freeKind ?? undefined).valid,
              });
            }}
          />
        ) : (
          <SetEditor
            facetKey={facetKey}
            optionsSource={optionsSource}
            ctx={ctx}
            selected={pending.kind === FilterValueKind.Set ? pending.values : []}
            onChange={(values) => change({ kind: FilterValueKind.Set, values })}
          />
        ))}

      <div className="mt-0.5 flex items-center justify-between border-t border-gray-100 pt-3">
        <button
          type="button"
          className="text-[13px] font-medium text-gray-500 underline-offset-2 hover:text-gray-800 hover:underline"
          onClick={onReset}
        >
          Reset
        </button>
        <button
          type="button"
          disabled={applyBlocked}
          className={cn(
            'rounded-xl px-4 py-1.5 text-[13px] font-semibold text-white shadow-sm transition-colors',
            applyBlocked ? 'cursor-not-allowed bg-gray-300' : 'bg-primary-8 hover:bg-primary-9'
          )}
          onClick={onApply}
        >
          Apply
        </button>
      </div>
    </div>
  );
}

/**
 * Free-entry value editor for id targets: ids pasted in any shape (whitespace / comma /
 * newline separated) become chips. Malformed tokens get a danger chip and block Apply.
 */
function IdTokenEditor({
  draft,
  tokens,
  placeholder,
  onDraftChange,
}: {
  draft: string;
  tokens: IIdTokenSplit;
  placeholder: string;
  onDraftChange: (text: string) => void;
}) {
  const remove = (token: string) =>
    onDraftChange(tokens.tokens.filter((t) => t !== token).join('\n'));

  return (
    <div className="flex flex-col gap-2">
      <textarea
        rows={3}
        // mirrors the `Input` molecule's base classes, which a raw <textarea> does not get
        className={cn(
          'placeholder:text-muted-foreground selection:bg-primary-0 selection:text-primary-9',
          'flex w-full min-w-0 border bg-transparent text-base shadow-xs outline-none md:text-sm',
          'transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50',
          INPUT_CLASS,
          'h-auto min-h-16 resize-y px-3 py-2 leading-5'
        )}
        placeholder={placeholder}
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
      />
      <span className="text-[11px] text-gray-400">{FREE_ENTRY_SEPARATOR_HINT}</span>

      {tokens.tokens.length > 0 && (
        <div className="flex max-h-32 flex-wrap gap-1 overflow-auto">
          {tokens.tokens.map((token) => {
            const invalid = tokens.invalid.includes(token);
            return (
              <span
                key={token}
                title={token}
                className={cn(
                  'flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[11px]',
                  invalid ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-primary-8'
                )}
              >
                <span className="truncate font-mono">{token}</span>
                <button
                  type="button"
                  aria-label={`Remove ${token}`}
                  className="shrink-0 text-gray-400 hover:text-gray-700"
                  onClick={() => remove(token)}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      {tokens.invalid.length > 0 && (
        <span className="text-[11px] text-red-600">
          {tokens.invalid.length} invalid id{tokens.invalid.length > 1 ? 's' : ''} — remove them to
          apply.
        </span>
      )}
    </div>
  );
}

function SetEditor({
  facetKey,
  optionsSource,
  ctx,
  selected,
  onChange,
}: {
  facetKey: string;
  optionsSource?: TFilterOptionsSource;
  ctx: IFilterEditorContext;
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const { options, loading } = useSetOptions(optionsSource, facetKey, ctx);
  const [query, setQuery] = useState('');
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const toggle = (id: string, checked: boolean) => {
    const next = new Set(selectedSet);
    if (checked) next.add(id);
    else next.delete(id);
    onChange([...next]);
  };

  return (
    <div className="flex max-h-72 w-full flex-col gap-2">
      <Input
        className={INPUT_CLASS}
        placeholder="Search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="flex justify-between text-xs font-medium">
        <button
          type="button"
          className="text-primary-6 hover:text-primary-7"
          onClick={() => onChange(visible.map((o) => o.value))}
        >
          Select all
        </button>
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600"
          onClick={() => onChange([])}
        >
          Clear
        </button>
      </div>
      <div className="-mx-1.5 flex flex-col overflow-auto">
        {loading ? (
          <div className="py-3 text-center text-xs text-gray-400">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="py-3 text-center text-xs text-gray-400">No options</div>
        ) : (
          visible.map((o) => (
            <div key={o.id} className="rounded-lg px-1.5 py-1 hover:bg-gray-50">
              {/* biome-ignore lint/a11y/noLabelWithoutControl: the checkbox is nested as the control */}
              <label
                className={cn('flex cursor-pointer items-center gap-2 text-sm')}
                title={o.label}
              >
                <Checkbox
                  checked={selectedSet.has(o.value)}
                  onCheckedChange={(checked) => toggle(o.value, checked === true)}
                  className="shrink-0 **:data-[slot=checkbox-indicator]:text-white!"
                />
                <span className="flex-1 truncate text-primary-8">{o.label}</span>
                {o.count != null && (
                  <span className="shrink-0 rounded-full bg-gray-100 px-1.5 text-[11px] text-gray-500">
                    {o.count}
                  </span>
                )}
              </label>
              {(o.type === 'mtype' || o.type === 'etype') && (
                <span className="block pl-6 text-[11px] text-gray-400">
                  <CheckListDescription id={o.id} type={o.type} />
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function CheckListDescription({ id, type }: { id: string; type: 'mtype' | 'etype' }) {
  const { data } = useQuery({
    queryKey: keyBuilder.annotation({ entityId: id }),
    queryFn: async () => {
      if (type === 'mtype') return await getMtype({ id });
      return await getEtype({ id });
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return (
    <span className="text-gray-600 text-left wrap-break-word hyphens-auto">{data?.definition}</span>
  );
}
