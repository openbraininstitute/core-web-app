'use client';

import { getParamLabel } from '@/features/task-runner/expanded-view';

import { CampaignStatusBadge } from './campaign-status-badge';

import type { ReactNode } from 'react';
import type { ActivityStatus } from '@/api/entitycore/types/shared/activity';

/** One name → value pair shown inside a scan-parameter card. */
export interface ScanCardParam {
  name: string;
  label: string;
  value: string;
}

/** A single scan-parameter set rendered as a card in the popover grid. */
export interface ScanCard {
  id: string;
  title: string;
  status?: ActivityStatus;
  params: ScanCardParam[];
}

/** Loose shape of an expand-payload row (a simulation with its scan parameters). */
interface RawScanRow {
  id?: string | null;
  name?: string | null;
  status?: ActivityStatus;
  scan_parameters?: Record<string, unknown> | null;
}

/** Format an arbitrary scan-parameter value for compact display inside a card. */
export function formatScanValue(value: unknown): string {
  if (value == null) return '—';
  if (Array.isArray(value)) return value.map(formatScanValue).join(', ');
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/**
 * Shape the expand-payload records (the same scan-parameter sets the legacy nested
 * table listed) into card view-models: a title (the simulation name/identifier) plus a
 * flat list of formatted scan-parameter rows. Non-object / empty payloads yield `[]`.
 * This is the unit under test for the "records → cards" shaping.
 */
export function toScanCardData(records: unknown): ScanCard[] {
  if (!Array.isArray(records)) return [];
  return records.map((raw, index) => {
    const row = (raw ?? {}) as RawScanRow;
    const id = row.id ?? `scan-${index}`;
    const title = row.name || row.id || `Simulation ${index + 1}`;
    const scanParameters = row.scan_parameters ?? {};
    const params: ScanCardParam[] = Object.entries(scanParameters).map(([name, value]) => ({
      name,
      label: getParamLabel(name),
      value: formatScanValue(value),
    }));
    return { id: String(id), title: String(title), status: row.status, params };
  });
}

/** Per-card column width (rem) + inter-card gap; popover width = cols × card + gaps. */
const CARD_W_REM = 14; // w-56
const GAP_REM = 0.5; // gap-2
const MAX_COLS = 3;

/** Columns for N cards: 1 → 1 (single card fills the popover), capped at {@link MAX_COLS}. */
function scanCardColumns(count: number): number {
  return Math.min(Math.max(count, 1), MAX_COLS);
}

/** Popover content width for a given column count — driven by the cards, NOT the title. */
function scanCardsWidth(cols: number): string {
  return `${cols * CARD_W_REM + (cols - 1) * GAP_REM}rem`;
}

function ScanParameterCard({ card }: { card: ScanCard }): ReactNode {
  return (
    // fills its grid column (single card → full popover width); hover greys the whole card
    <div className="flex w-full min-w-0 flex-col overflow-hidden rounded-xl border border-neutral-2 bg-white transition-colors hover:bg-gray-100">
      {/* header — title + status, separated from the body by a border (image style) */}
      <div className="flex items-center justify-between gap-2 border-b border-neutral-2 px-3 py-2">
        <span
          title={card.title}
          className="min-w-0 flex-1 truncate text-sm font-semibold text-primary-9"
        >
          {card.title}
        </span>
        {card.status ? <CampaignStatusBadge status={card.status} compact /> : null}
      </div>
      {/* body — scan parameters shown IN FULL (wrap) without widening the fixed card */}
      <div className="p-1.5">
        {card.params.length > 0 ? (
          <dl className="flex flex-col gap-0.5">
            {card.params.map((param) => (
              <div
                key={param.name}
                className="flex items-baseline justify-between gap-3 rounded px-1.5 py-0.5 text-xs transition-colors hover:bg-gray-50"
              >
                <dt className="min-w-0 break-words text-neutral-6">{param.label}</dt>
                <dd className="min-w-0 [overflow-wrap:anywhere] text-right font-semibold text-primary-8">
                  {param.value}
                </dd>
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
 * Scan-parameter cards for the status popover. The popover WIDTH is set from the card
 * count (1 → one card wide, up to {@link MAX_COLS} across) — NOT from the title, so a
 * long `{sim_name} execution status` heading wraps instead of stretching a one-card
 * popover. Height is capped (`max-h-80`) with a secondary scrollbar for long campaigns.
 */
export function CampaignScanCards({
  records,
  title,
  loading,
  error,
}: CampaignScanCardsProps): ReactNode {
  const cards = loading || error ? [] : toScanCardData(records);
  const cols = scanCardColumns(loading ? MAX_COLS : cards.length);
  const gridStyle = { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` };

  return (
    <div
      className="flex flex-col gap-2"
      style={{ width: scanCardsWidth(cols), maxWidth: 'min(88vw, 44rem)' }}
    >
      {title ? (
        <div className="break-words px-1 text-base font-semibold text-primary-9" title={title}>
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
