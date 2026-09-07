'use client';

import { RiCheckLine, RiFileCopyLine } from '@remixicon/react';

import { isFromIdRef } from '@/features/scan-config/helpers';
import { getParamLabel } from '@/features/task-runner/expanded-view';
import { useCopyToClipboard } from '@/hooks/useCopyClipboard';
import { cn } from '@/utils/css-class';

import { EMPTY_PLACEHOLDER } from '../../../renderers/aggrid/empty-cell';
import { CampaignStatusBadge } from './campaign-status-badge';

import type { ReactNode } from 'react';
import type { ActivityStatus } from '@/api/entitycore/types/shared/activity';

/** One name → value pair shown inside a scan-parameter card. */
export interface IScanCardParam {
  name: string;
  label: string;
  value: string;
  /** set when the value is an entity reference, so the card offers a copy control */
  entityId?: string;
}

/** A single scan-parameter set rendered as a card in the popover grid. */
export interface IScanCard {
  id: string;
  title: string;
  status?: ActivityStatus;
  params: IScanCardParam[];
}

/** Loose shape of an expand-payload row (a simulation with its scan parameters). */
interface RawScanRow {
  id?: string | null;
  name?: string | null;
  status?: ActivityStatus;
  scan_parameters?: Record<string, unknown> | null;
}

/**
 * The entity uuid a scan-parameter value points at, for the reference shapes obi-one
 * writes: a `FromID` ref (`{ type, id_str }`) or a bare `{ id }` / `{ id_str }`.
 * `undefined` for anything else, including a plain uuid string, which needs no unwrapping.
 */
export function scanValueEntityId(value: unknown): string | undefined {
  if (isFromIdRef(value)) return value.id_str;
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const { id_str: idStr, id } = value as { id_str?: unknown; id?: unknown };
  const candidate = idStr ?? id;
  return typeof candidate === 'string' && candidate.trim() !== '' ? candidate : undefined;
}

/** Format an arbitrary scan-parameter value for compact display inside a card. */
export function formatScanValue(value: unknown): string {
  if (value == null) return EMPTY_PLACEHOLDER;
  if (Array.isArray(value))
    return value.length === 0 ? EMPTY_PLACEHOLDER : value.map(formatScanValue).join(', ');
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') return value.trim() === '' ? EMPTY_PLACEHOLDER : value;
  if (typeof value === 'object') {
    // an entity reference reads as its id; raw JSON is unusable in a card this narrow
    const entityId = scanValueEntityId(value);
    if (entityId) return entityId;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/** Shape expand-payload records into card view-models; non-array payloads yield `[]`. */
export function toScanCardData(records: unknown): IScanCard[] {
  if (!Array.isArray(records)) return [];
  return records.map((raw, index) => {
    const row = (raw ?? {}) as RawScanRow;
    const id = row.id ?? `scan-${index}`;
    const title = row.name || row.id || `Simulation ${index + 1}`;
    const scanParameters = row.scan_parameters ?? {};
    const params: IScanCardParam[] = Object.entries(scanParameters).map(([name, value]) => ({
      name,
      label: getParamLabel(name),
      value: formatScanValue(value),
      entityId: scanValueEntityId(value),
    }));
    return { id: String(id), title: String(title), status: row.status, params };
  });
}

const CARD_W_REM = 14; // w-56
const GAP_REM = 0.5; // gap-2
const MAX_COLS = 3;

/** Columns for N cards, capped at {@link MAX_COLS}. */
function scanCardColumns(count: number): number {
  return Math.min(Math.max(count, 1), MAX_COLS);
}

/** Popover content width for a column count — driven by the cards, not the title. */
function scanCardsWidth(cols: number): string {
  return `${cols * CARD_W_REM + (cols - 1) * GAP_REM}rem`;
}

const VALUE_CLASS = 'max-w-[70%] shrink-0 truncate text-right font-semibold text-primary-8';

/** An entity id, copied to the clipboard by clicking anywhere on it. */
function CopyableId({ id }: { id: string }): ReactNode {
  const [, copy, , copied] = useCopyToClipboard();

  return (
    <dd className={cn(VALUE_CLASS, 'min-w-0')}>
      <button
        type="button"
        title={copied ? 'Copied' : id}
        aria-label={`Copy ID ${id}`}
        onClick={() => void copy(id)}
        className={cn(
          'flex w-full min-w-0 cursor-pointer items-center justify-end gap-1',
          'text-primary-8 transition-colors hover:text-primary-6'
        )}
      >
        <span className="min-w-0 truncate">{id}</span>
        {copied ? (
          <RiCheckLine size={12} className="shrink-0 text-green-600" />
        ) : (
          <RiFileCopyLine size={12} className="shrink-0 opacity-60" />
        )}
      </button>
    </dd>
  );
}

function ScanParameterCard({ card }: { card: IScanCard }): ReactNode {
  return (
    <div className="flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-neutral-2 bg-white transition-colors hover:bg-gray-50">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-2 px-3 py-2">
        <span
          title={card.title}
          className="min-w-0 flex-1 truncate text-sm font-semibold text-primary-9"
        >
          {card.title}
        </span>
        {card.status ? <CampaignStatusBadge status={card.status} compact /> : null}
      </div>
      <div className="p-1.5">
        {card.params.length > 0 ? (
          <dl className="flex flex-col gap-0.5">
            {card.params.map((param) => (
              <div
                key={param.name}
                className="flex items-baseline justify-between gap-3 rounded px-1.5 py-0.5 text-xs transition-colors hover:bg-gray-50"
              >
                {/* The label may wrap; the VALUE must stay on one line — a number
                    broken across two lines reads as two numbers. It keeps its natural
                    width (so the label wraps first) and only ellipsizes past the cap. */}
                <dt className="min-w-0 break-words text-neutral-6">{param.label}</dt>
                {param.entityId ? (
                  <CopyableId id={param.entityId} />
                ) : (
                  <dd title={param.value} className={VALUE_CLASS}>
                    {param.value}
                  </dd>
                )}
              </div>
            ))}
          </dl>
        ) : (
          <span className="px-1.5 text-xs italic text-neutral-5">No scan parameters</span>
        )}
      </div>
    </div>
  );
}

interface CampaignScanCardsProps {
  records: unknown;
  /** popover heading, e.g. `"{sim_name} execution status"`. */
  title?: string;
  loading?: boolean;
  error?: unknown;
}

/**
 * Scan-parameter cards for the status popover. Width comes from the card count, not the
 * title, so a long heading wraps instead of stretching a one-card popover.
 */
export function CampaignScanCards({
  records,
  title,
  loading,
  error,
}: CampaignScanCardsProps): ReactNode {
  const cards = loading || error ? [] : toScanCardData(records);
  const cols = scanCardColumns(loading ? 2 : cards.length);
  const gridStyle = { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` };

  return (
    <div
      className="flex flex-col gap-2"
      style={{ width: scanCardsWidth(cols), maxWidth: 'min(88vw, 44rem)' }}
    >
      {title ? (
        <div
          className="break-words border-b border-neutral-2 px-1 pb-2 text-lg font-semibold text-primary-9"
          title={title}
        >
          {title}
        </div>
      ) : null}
      <div className="secondary-scrollbar max-h-80 overflow-y-auto pr-1">
        {error ? (
          <div className="px-2 py-6 text-center text-xs text-red-500">
            Failed to load scan parameters.
          </div>
        ) : loading ? (
          <div className="grid gap-2" style={gridStyle}>
            {Array.from({ length: cols }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
              <div key={i} className="h-24 animate-pulse rounded-xl bg-neutral-100" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="px-2 py-6 text-center text-xs text-neutral-5">
            No scan-parameter sets for this campaign.
          </div>
        ) : (
          <div className="grid gap-2" style={gridStyle}>
            {cards.map((card) => (
              <ScanParameterCard key={card.id} card={card} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
