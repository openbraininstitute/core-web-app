export type TValueOf<TDict> = TDict[keyof TDict];

export const ActorVia = { Ui: 'ui', Agent: 'agent' } as const;
export type TActorVia = TValueOf<typeof ActorVia>;

export const PageKind = { Main: 'main', Section: 'section' } as const;
export type TPageKind = TValueOf<typeof PageKind>;

export const CollaborationNotice = {
  Saved: 'saved',
  Peers: 'peers',
  Present: 'present',
  Writer: 'writer',
  ReadOnly: 'read-only',
  Closing: 'closing',
} as const;
export type TCollaborationNotice = TValueOf<typeof CollaborationNotice>;

export const ReadOnlyReason = {
  UnsavedLimit: 'unsaved-limit',
  PageFull: 'page-full',
  ReadAccess: 'read-access',
} as const;
export type TReadOnlyReason = TValueOf<typeof ReadOnlyReason>;

export const ProblemType = {
  Unauthenticated: 'unauthenticated',
  Forbidden: 'forbidden',
  NotFound: 'not-found',
  Validation: 'validation',
  MalformedBody: 'malformed-body',
  MalformedQuery: 'malformed-query',
  VersionMismatch: 'version-mismatch',
  Conflict: 'conflict',
  IdempotencyKeyMissing: 'idempotency-key-missing',
  IdempotencyKeyReused: 'idempotency-key-reused',
  RequestInProgress: 'request-in-progress',
  MalformedChange: 'malformed-change',
  ChangeNeedsMissingContent: 'change-needs-missing-content',
  PageFull: 'page-full',
  BlockMissing: 'block-missing',
  BlockChanged: 'block-changed',
  TooLarge: 'too-large',
  RateLimited: 'rate-limited',
  Unavailable: 'unavailable',
  Overloaded: 'overloaded',
  Internal: 'internal',
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

export interface IWriter {
  readonly clientId: number;
  readonly actorId: number;
  readonly userId: string;
  readonly label: string;
  readonly via: string;
}

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
