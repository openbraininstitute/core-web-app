import { isNil, isNotNil } from 'es-toolkit';
import { useSyncExternalStore } from 'react';
import { match } from 'ts-pattern';

import { CollaborationNotice, ReadOnlyReason } from '@/api/logbook/types';
import { NOTICES_MAX_WRITERS } from '@/features/logbook/constants';

import type { TCollaborationNotice, TReadOnlyReason } from '@/api/logbook/types';
import type {
  ICollaborationSnapshot,
  IPeer,
  IWriterActor,
  TNotice,
  TRecord,
} from '@/features/logbook/types';

const isRecord = (value: unknown): value is TRecord => typeof value === 'object' && isNotNil(value);
const isString = (value: unknown): value is string => typeof value === 'string';
const strings = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every(isString);
const isPeer = (value: unknown): value is IPeer =>
  isRecord(value) &&
  isString(value['joinId']) &&
  isString(value['userId']) &&
  isString(value['label']) &&
  isString(value['via']);
const numbers = (value: unknown): value is readonly number[] =>
  Array.isArray(value) && value.every(Number.isSafeInteger);
const isWriterActor = (value: unknown): value is IWriterActor =>
  isRecord(value) &&
  isString(value['userId']) &&
  isString(value['label']) &&
  isString(value['via']);
const readOnlyReasons: ReadonlySet<string> = new Set(Object.values(ReadOnlyReason));
const isReason = (value: unknown): value is TReadOnlyReason =>
  isString(value) && readOnlyReasons.has(value);
const noticeTypes: ReadonlySet<string> = new Set(Object.values(CollaborationNotice));
const isNoticeType = (value: unknown): value is TCollaborationNotice =>
  isString(value) && noticeTypes.has(value);

function toNotice(value: unknown): TNotice | null {
  if (!isRecord(value)) return null;
  const type = value['type'];
  if (!isNoticeType(type)) return null;
  return match<TCollaborationNotice, TNotice | null>(type)
    .with(CollaborationNotice.Peers, () => {
      const { seq, peers } = value;
      return typeof seq === 'number' && Array.isArray(peers) && peers.every(isPeer)
        ? { type: CollaborationNotice.Peers, seq, peers }
        : null;
    })
    .with(CollaborationNotice.Present, () => {
      const { actor, blockIds, ttlSeconds } = value;
      return isRecord(actor) &&
        isString(actor['label']) &&
        isString(actor['via']) &&
        strings(blockIds) &&
        typeof ttlSeconds === 'number'
        ? {
            type: CollaborationNotice.Present,
            actor: { label: actor['label'], via: actor['via'] },
            blockIds,
            ttlSeconds,
          }
        : null;
    })
    .with(CollaborationNotice.Writer, () => {
      const { clientIds, actor } = value;
      return numbers(clientIds) && isWriterActor(actor)
        ? {
            type: CollaborationNotice.Writer,
            clientIds,
            actor: { userId: actor.userId, label: actor.label, via: actor.via },
          }
        : null;
    })
    .with(CollaborationNotice.ReadOnly, () => ({
      type: CollaborationNotice.ReadOnly,
      reason: isReason(value['reason']) ? value['reason'] : ReadOnlyReason.ReadAccess,
    }))
    .with(CollaborationNotice.Saved, () => ({
      type: CollaborationNotice.Saved,
      own: value['own'] !== false,
    }))
    .with(CollaborationNotice.Closing, () => ({ type: CollaborationNotice.Closing }))
    .with(CollaborationNotice.Pages, () => ({ type: CollaborationNotice.Pages }))
    .exhaustive();
}

function noticeOf(payload: string): TNotice | null {
  try {
    return toNotice(JSON.parse(payload));
  } catch {
    return null;
  }
}

const EMPTY: ICollaborationSnapshot = {
  peersSeq: -1,
  peers: [],
  savedAt: null,
  pageSavedAt: null,
  agents: [],
  readOnly: null,
  rejoinAt: null,
  outdated: false,
};

export class CollaborationNotices {
  #state: ICollaborationSnapshot = EMPTY;
  readonly #listeners = new Set<() => void>();
  readonly #writers = new Map<number, IWriterActor>();

  readonly writerOf = (clientId: number): IWriterActor | undefined => this.#writers.get(clientId);

  readonly subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  readonly snapshot = (): ICollaborationSnapshot => this.#state;

  #set(next: Partial<ICollaborationSnapshot>): void {
    this.#state = { ...this.#state, ...next };
    for (const listener of this.#listeners) listener();
  }

  connected(): void {
    this.#set({ readOnly: null, peersSeq: -1 });
  }

  // Kept through a reconnect, unlike the server's read-only reasons: only a reload loads the schema.
  outdated(): void {
    if (!this.#state.outdated) this.#set({ outdated: true });
  }

  refused(at: number): void {
    this.#set({ rejoinAt: at });
  }

  joined(): void {
    if (isNotNil(this.#state.rejoinAt)) this.#set({ rejoinAt: null });
  }

  expire(now: number): void {
    if (this.#state.agents.some((agent) => agent.until <= now))
      this.#set({ agents: this.#state.agents.filter((agent) => agent.until > now) });
  }

  receive(payload: string, now = Date.now()): TNotice | null {
    const notice = noticeOf(payload);
    if (isNil(notice)) return null;
    match(notice)
      .with({ type: CollaborationNotice.Peers }, ({ seq, peers }) => {
        if (seq > this.#state.peersSeq) this.#set({ peersSeq: seq, peers });
      })
      .with({ type: CollaborationNotice.Saved }, ({ own }) => {
        this.#set(own ? { savedAt: now, pageSavedAt: now } : { pageSavedAt: now });
      })
      .with({ type: CollaborationNotice.Present }, ({ actor, blockIds, ttlSeconds }) => {
        const others = this.#state.agents.filter((agent) => agent.label !== actor.label);
        const until = now + ttlSeconds * 1000;
        this.#set({ agents: [...others, { label: actor.label, blockIds, until }] });
      })
      .with({ type: CollaborationNotice.Writer }, ({ clientIds, actor }) => {
        for (const clientId of clientIds) {
          this.#writers.delete(clientId);
          this.#writers.set(clientId, actor);
        }
        for (const oldest of this.#writers.keys()) {
          if (this.#writers.size <= NOTICES_MAX_WRITERS) break;
          this.#writers.delete(oldest);
        }
      })
      .with({ type: CollaborationNotice.ReadOnly }, ({ reason }) => {
        this.#set({ readOnly: reason });
      })
      .with({ type: CollaborationNotice.Closing }, () => {})
      .with({ type: CollaborationNotice.Pages }, () => {})
      .exhaustive();
    return notice;
  }
}

export const useCollaboration = <TSlice>(
  notices: CollaborationNotices,
  select: (state: ICollaborationSnapshot) => TSlice
): TSlice => useSyncExternalStore(notices.subscribe, () => select(notices.snapshot()));
