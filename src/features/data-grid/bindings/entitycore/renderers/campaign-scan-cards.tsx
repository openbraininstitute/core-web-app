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

/** Fixed card width so the popover sizes to its content (up to 3 cards per row). */
const CARD_WIDTH = 'w-56';

function ScanParameterCard({ card }: { card: ScanCard }): ReactNode {
  return (
    <div
      className={`flex ${CARD_WIDTH} shrink-0 flex-col overflow-hidden rounded-xl border border-neutral-2 bg-white`}
    >
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
      {/* body — the scan parameters */}
      <div className="px-3 py-2">
        {card.params.length > 0 ? (
          <dl className="flex flex-col gap-1">
            {card.params.map((param) => (
              <div key={param.name} className="flex items-baseline justify-between gap-3 text-xs">
                <dt title={param.name} className="truncate text-neutral-6">
                  {param.label}
                </dt>
                <dd
                  title={param.value}
                  className="max-w-[60%] truncate text-right font-medium text-primary-8"
                >
                  {param.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <span className="text-xs italic text-neutral-5">No scan parameters</span>
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
 * Scan-parameter cards for the status popover. The card row FITS ITS CONTENT — a
 * fixed card width, wrapping at most 3 per row (`max-w`), so a campaign with one or
 * two cards renders a compact popover rather than a fixed wide box. Height is capped
 * (`max-h-80`) with vertical scroll for long campaigns, and shrinks to content when
 * there are few cards. A `{sim_name} execution status` heading sits on top.
 */
export function CampaignScanCards({
  records,
  title,
  loading,
  error,
}: CampaignScanCardsProps): ReactNode {
  return (
    // w-fit → the popover width tracks the cards (1 → narrow, 3+ → capped at max-w)
    <div className="flex w-fit max-w-[min(88vw,44rem)] flex-col gap-2">
      {title ? (
        <div className="truncate px-1 text-sm font-semibold text-primary-9" title={title}>
          {title}
        </div>
      ) : null}
      <div className="max-h-80 overflow-y-auto pr-1">
        <CampaignScanCardsBody records={records} loading={loading} error={error} />
      </div>
    </div>
  );
}

function CampaignScanCardsBody({ records, loading, error }: CampaignScanCardsProps): ReactNode {
  if (error) {
    return (
      <div className="px-2 py-6 text-center text-xs text-red-500">
        Failed to load scan parameters.
      </div>
    );
  }
  if (loading) {
    return (
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholders
          <div
            key={i}
            className={`${CARD_WIDTH} h-24 shrink-0 animate-pulse rounded-xl bg-neutral-100`}
          />
        ))}
      </div>
    );
  }
  const cards = toScanCardData(records);
  if (cards.length === 0) {
    return (
      <div className="px-2 py-6 text-center text-xs text-neutral-5">
        No scan-parameter sets for this campaign.
      </div>
    );
  }
  return (
    // fixed-width cards + wrap → the row is exactly as wide as its cards (≤ 3 across)
    <div className="flex flex-wrap gap-2">
      {cards.map((card) => (
        <ScanParameterCard key={card.id} card={card} />
      ))}
    </div>
  );
}
