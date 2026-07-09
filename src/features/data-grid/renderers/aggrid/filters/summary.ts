import type { FilterEntry } from '../../../core';

function fmtDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString() : '';
}

/** Short, human-readable summary of an active filter (shown in the floating row). */
export function summarizeFilter(entry: FilterEntry): string {
  const v = entry.value;
  switch (v.kind) {
    case 'text':
      return v.text.trim();
    case 'number':
      return v.value == null ? '' : String(v.value);
    case 'range': {
      if (v.min == null && v.max == null) return '';
      return `${v.min ?? '*'} – ${v.max ?? '*'}`;
    }
    case 'dateRange': {
      const from = fmtDate(v.from);
      const to = fmtDate(v.to);
      return from || to ? `${from || '*'} – ${to || '*'}` : '';
    }
    case 'set':
      return v.values.length ? `${v.values.length} selected` : '';
    case 'boolean':
      return v.value == null ? '' : v.value ? 'Yes' : 'No';
    default:
      return '';
  }
}
