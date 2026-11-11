import { describe, expect, it, vi } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types';
import { ticketStore } from '@/features/entity-download/ticket-store';

vi.mock('@/utils/logger', () => ({ logError: vi.fn(), logInfo: vi.fn() }));

const ticket = {
  kind: 'entity-batch' as const,
  entityType: EntityTypeDict.CellMorphology,
  entityIds: ['x'],
};

describe('ticketStore', () => {
  it('keeps no ticket after it is used', () => {
    const ticketId = ticketStore.createTicket(ticket);
    if (!ticketId) throw new Error('ticket store was unexpectedly full');

    expect(ticketStore.getTicket(ticketId)).not.toBeNull();

    ticketStore.deleteTicket(ticketId);

    expect(ticketStore.getTicket(ticketId)).toBeNull();
    expect(ticketStore.all().has(ticketId)).toBe(false);
  });

  it('drops an expired ticket on read, so the map cannot fill with dead entries', () => {
    const ticketId = ticketStore.createTicket(ticket);
    if (!ticketId) throw new Error('ticket store was unexpectedly full');

    vi.setSystemTime(Date.now() + 61_000);
    try {
      expect(ticketStore.getTicket(ticketId)).toBeNull();
      expect(ticketStore.all().has(ticketId)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
