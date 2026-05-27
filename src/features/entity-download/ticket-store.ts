import { randomUUID } from 'crypto';

import { logError, logInfo } from '@/utils/logger';

import type { TEntityTypeDict } from '@/api/entitycore/types';

export type EntityBatchDownloadTicket = {
  kind: 'entity-batch';
  entityType: TEntityTypeDict;
  virtualLabId?: string | null;
  projectId?: string | null;
  entityIds: string[];
  createdAt: number;
};

export type AssetFolderDownloadTicket = {
  kind: 'asset-folder';
  entityType: TEntityTypeDict;
  entityId: string;
  assetId: string;
  prefix: string;
  filename: string;
  virtualLabId?: string | null;
  projectId?: string | null;
  createdAt: number;
};

export type DownloadTicket = EntityBatchDownloadTicket | AssetFolderDownloadTicket;

type DownloadTicketRequest =
  | Omit<EntityBatchDownloadTicket, 'createdAt'>
  | Omit<AssetFolderDownloadTicket, 'createdAt'>;

// Ticket expiration time in milliseconds (60 seconds)
const TICKET_EXPIRATION_MS = 60 * 1000;

// Maximum number of tickets to store
const MAX_TICKETS = 100;

/**
 * A simple in-memory store for download tickets with automatic expiration
 *
 * TODO: Replace with Redis if more than 1 container is used.
 */
class TicketStore {
  private tickets: Map<string, DownloadTicket> = new Map();

  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Run cleanup every minute to remove expired tickets
    this.cleanupInterval = setInterval(() => this.cleanupExpiredTickets(), 60 * 1000);
  }

  /**
   * Creates a new download ticket
   * @param ticketId Unique identifier for the ticket
   * @param ticket Ticket data
   * @returns true if ticket was created, false if store is full
   */
  createTicket(ticket: DownloadTicketRequest): string | null {
    // Check if we've reached the maximum number of tickets
    if (this.tickets.size >= MAX_TICKETS) {
      this.cleanupExpiredTickets();
      // If still at capacity after cleanup, reject new tickets
      if (this.tickets.size >= MAX_TICKETS) {
        return null;
      }
    }

    // Generate a unique ticket ID
    const ticketId = randomUUID();
    const newTicket = { ...ticket, createdAt: Date.now() } as DownloadTicket;
    this.tickets.set(ticketId, newTicket);

    return ticketId;
  }

  /**
   * Gets a ticket by ID and validates it's not expired
   * @param ticketId Ticket identifier
   * @returns The ticket if found and not expired, null otherwise
   */
  getTicket(ticketId: string): DownloadTicket | null {
    const ticket = this.tickets.get(ticketId);

    if (!ticket) {
      logError('No ticket with this id:', ticketId);
      logInfo(
        'Available ones are:',
        Array.from(this.tickets.keys()).join(', '),
        `(${this.tickets.size})`
      );
      return null;
    }

    // Check if ticket is expired
    if (Date.now() - ticket.createdAt > TICKET_EXPIRATION_MS) {
      this.deleteTicket(ticketId);
      return null;
    }

    return ticket;
  }

  /**
   * Deletes a ticket
   * @param ticketId Ticket identifier
   */
  deleteTicket(ticketId: string): void {
    this.tickets.delete(ticketId);
  }

  all() {
    return this.tickets;
  }

  /**
   * Removes all expired tickets from the store
   */
  private cleanupExpiredTickets(): void {
    const now = Date.now();
    for (const [ticketId, ticket] of this.tickets.entries()) {
      if (now - ticket.createdAt > TICKET_EXPIRATION_MS) {
        this.deleteTicket(ticketId);
      }
    }
  }

  /**
   * Stops the cleanup interval when the application shuts down
   */
  shutdown(): void {
    clearInterval(this.cleanupInterval);
  }
}

// Create a singleton instance
export const ticketStore = new TicketStore();
