// The logbook server's contract: its value sets (the same as its database CHECKs) and the shapes
// of its answers.

export type TValueOf<TDict> = TDict[keyof TDict];

export const ActorVia = { Ui: 'ui', Agent: 'agent' } as const;
export type TActorVia = TValueOf<typeof ActorVia>;

export const PageKind = { Main: 'main', Section: 'section' } as const;
export type TPageKind = TValueOf<typeof PageKind>;

export const CollaborationNotice = {
  Saved: 'saved',
  Peers: 'peers',
  Present: 'present',
  Writer: 'writer', // who an HTTPS change's Yjs clients are, sent before the change
  ReadOnly: 'read-only',
  Closing: 'closing',
} as const;
export type TCollaborationNotice = TValueOf<typeof CollaborationNotice>;

// Why a `read-only` notice was sent.
export const ReadOnlyReason = {
  UnsavedLimit: 'unsaved-limit', // too much not yet in Postgres (it is down or slow)
  PageFull: 'page-full', // the merged page would pass its size limit
  ReadAccess: 'read-access', // a token refresh found read access only
} as const;
export type TReadOnlyReason = TValueOf<typeof ReadOnlyReason>;

export const ProblemType = {
  Unauthenticated: 'unauthenticated',
  Forbidden: 'forbidden',
  NotFound: 'not-found',
  Validation: 'validation',
  MalformedBody: 'malformed-body', // a body that cannot be parsed as its content type
  MalformedQuery: 'malformed-query', // a query parameter that cannot be read (400)
  VersionMismatch: 'version-mismatch',
  Conflict: 'conflict',
  IdempotencyKeyMissing: 'idempotency-key-missing',
  IdempotencyKeyReused: 'idempotency-key-reused',
  RequestInProgress: 'request-in-progress',
  MalformedChange: 'malformed-change',
  ChangeNeedsMissingContent: 'change-needs-missing-content',
  PageFull: 'page-full', // the page is at its size limit: no more changes until it shrinks
  BlockMissing: 'block-missing', // a block edit names a block the page does not hold (409)
  BlockChanged: 'block-changed', // a block edit's rev is not the block's current one (409)
  TooLarge: 'too-large',
  RateLimited: 'rate-limited',
  Unavailable: 'unavailable',
  Overloaded: 'overloaded', // this task is at its limit and takes no new work now; try again later (503 + Retry-After)
  Internal: 'internal',
  // A collaboration join whose socket closed before the join was set up (recorded as 408).
  ClientClosed: 'client-closed',
} as const;
export type TProblemType = TValueOf<typeof ProblemType>;

export interface IPage {
  readonly id: string;
  readonly researchId: string;
  readonly kind: TPageKind;
  readonly title: string;
  readonly position: number;
  readonly version: number;
  readonly editedAt: string;
  readonly editedBy: number | null;
}

/** A research log on the server: its anchor and its pages, main page first. */
export interface IResearch {
  readonly id: string;
  readonly pages: readonly IPage[];
}

export interface IActivityEntry {
  readonly pageId: string;
  readonly actorId: number;
  readonly userId: string;
  readonly label: string;
  readonly via: string;
  readonly minute: string;
  readonly inserted: number;
  readonly deleted: number;
  /** The text removed in that minute (at most 500 characters); '' before the server kept it. */
  readonly removed: string;
}

export interface IActivityPage {
  readonly items: readonly IActivityEntry[];
  /** The server's cursor of the next page; null on the last. */
  readonly next: string | null;
}

export interface IContributor {
  readonly actorId: number;
  readonly userId: string;
  readonly label: string;
  readonly via: string;
  readonly lastAt: string;
}

export interface IResearchContributors {
  readonly items: readonly {
    readonly researchId: string;
    readonly contributors: readonly IContributor[];
  }[];
}

/** Who one Yjs client of a page is. */
export interface IWriter {
  readonly clientId: number;
  readonly actorId: number;
  readonly userId: string;
  readonly label: string;
  readonly via: string;
}

/** A presigned PUT: the address and the headers that go with it. */
export interface IUploadTarget {
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
}

/** The saved name of an upload, and where to PUT its bytes (null: saved already). */
export interface IUploadAnswer {
  readonly path: string;
  readonly upload: IUploadTarget | null;
}

export interface IUploadRequest {
  readonly name: string;
  readonly size: number;
  readonly sha256: string;
}
