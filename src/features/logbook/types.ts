import type { HocuspocusProvider, WebSocketStatus } from '@hocuspocus/provider';
import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { Mapping } from '@tiptap/pm/transform';
import type { DecorationSet } from '@tiptap/pm/view';
import type { Editor } from '@tiptap/react';
import type { CSSProperties, ReactNode } from 'react';
import type { LanguageInput } from 'shiki/core';
import type { IndexeddbPersistence } from 'y-indexeddb';
import type * as Y from 'yjs';
import type { BrainRegionHierarchyBase } from '@/api/entitycore/types/entities/brain-region';
import type { IResearchLog, TResearchLogDraft } from '@/api/entitycore/types/entities/research-log';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type {
  EntityCoreIdentifiableNamed,
  EntityCoreResource,
  IAsset,
  IPlatformUser,
  NestedSpecies,
  Timestamps,
} from '@/api/entitycore/types/shared/global';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type {
  CollaborationNotice,
  IContributor,
  IPage,
  TReadOnlyReason,
  TValueOf,
} from '@/api/logbook/types';
import type { ChangeFeed } from '@/features/logbook/collaboration/changes';
import type { LocalCopy } from '@/features/logbook/collaboration/local-copy';
import type { CollaborationNotices } from '@/features/logbook/collaboration/notices';
import type { WorkspaceContext } from '@/types/common';
import type { TIconName } from '@/ui/molecules/icon';

export interface IActor {
  readonly key: string;
  readonly name: string;
  readonly initials: string;
  readonly colour: string;
  readonly agent: boolean;
  readonly ownerId: string | null;
}

export const PopoverAlign = { Start: 'start', End: 'end', Center: 'center' } as const;
export type TPopoverAlign = TValueOf<typeof PopoverAlign>;

export const PopoverSide = { Below: 'bottom', Above: 'top' } as const;
export type TPopoverSide = TValueOf<typeof PopoverSide>;

export interface IActivityRun {
  readonly key: string;
  readonly pageId: string;
  readonly userId: string;
  readonly label: string;
  readonly via: string;
  readonly from: number;
  readonly to: number;
  readonly inserted: number;
  readonly deleted: number;
  readonly removed: string;
}

export interface IEntity
  extends Readonly<Pick<EntityCoreIdentifiableNamed, 'id' | 'name'>>,
    Readonly<Partial<Pick<Timestamps, 'creation_date'>>>,
    Readonly<Partial<Pick<EntityCoreResource, 'type' | 'assets'>>> {
  readonly created_by?: Readonly<Pick<IPlatformUser, 'pref_label'>>;
  readonly brain_region?: Readonly<Pick<BrainRegionHierarchyBase, 'name'>> | null;
  readonly subject?: { readonly species?: Readonly<Pick<NestedSpecies, 'name'>> | null } | null;
}

/** Where an entity card's picture comes from: the thumbnail service draws it, or the entity holds one. */
export const ThumbnailFrom = { Service: 'service', Asset: 'asset' } as const;
export type TThumbnailSource =
  | { readonly from: typeof ThumbnailFrom.Service }
  | { readonly from: typeof ThumbnailFrom.Asset; readonly asset: IAsset };

export interface ILogFile {
  readonly path: string;
  readonly localPath: string;
  readonly name: string;
  readonly size: number;
  readonly lastModified: string;
}

export interface ILogDocument {
  readonly assetId: string;
  readonly path: string;
  readonly title: string;
  readonly pageId: string | null;
  readonly size: number;
}

export interface ILogFiles {
  readonly folderId: string | null;
  readonly files: readonly ILogFile[];
  readonly documents: readonly ILogDocument[];
}

export const ArtifactKind = {
  Image: 'image',
  Markdown: 'markdown',
  Table: 'table',
  Code: 'code',
  Pdf: 'pdf',
  Other: 'other',
} as const;

export type TArtifactKind = TValueOf<typeof ArtifactKind>;

export interface IArtifact {
  readonly id: string;
  readonly name: string;
  readonly where: string;
  readonly size: number;
  readonly savedAt: string | null;
  readonly kind: TArtifactKind;
  readonly path: string | null;
  readonly assetId: string | null;
  readonly pageId: string | null;
}

export interface IPlannedFile {
  readonly path: string;
  readonly size: number;
  readonly sha256: string;
}

export interface INewSection {
  readonly title: string;
  readonly key: string;
}

export const LogOrderField = {
  Name: 'name',
  Created: 'creation_date',
  Updated: 'update_date',
} as const;

export type TLogOrderField = TValueOf<typeof LogOrderField>;

export const OrderDirection = { Ascending: 'asc', Descending: 'desc' } as const;

export type TOrderDirection = TValueOf<typeof OrderDirection>;

export interface ILogOrder {
  readonly field: TLogOrderField;
  readonly direction: TOrderDirection;
}

export interface ILogFilter extends IScope {
  readonly search: string;
  readonly order: ILogOrder;
}

export type TLogPages = InfiniteData<EntityCoreResponse<IResearchLog>, number>;

export const EntityType = {
  Circuit: 'circuit',
  Morphology: 'morphology',
  Emodel: 'emodel',
  Simulation: 'simulation',
  IonChannelModel: 'ion_channel_model',
  Trace: 'trace',
  BrainRegion: 'brain_region',
} as const;

export type TEntityType = TValueOf<typeof EntityType>;

export interface ILook {
  readonly label: string;
  readonly colour: string;
  readonly tint: string;
}

export const FileLang = {
  Python: 'python',
  Notebook: 'notebook',
  Csv: 'csv',
  Json: 'json',
  Shell: 'shell',
  File: 'file',
} as const;

export type TFileLang = TValueOf<typeof FileLang>;

export interface IFileLook {
  readonly badge: string;
  readonly bg: string;
  readonly fg: string;
  readonly name: string;
}

export const CalloutKind = { Note: 'note', Tip: 'tip', Warning: 'warning' } as const;

export type TCalloutKind = TValueOf<typeof CalloutKind>;

/** A directive on its own line (`::entity[…]{…}`) or inside a line (`:page[…]{…}`). */
export const DirectiveLevel = { Block: 'block', Inline: 'inline' } as const;

export type TDirectiveLevel = TValueOf<typeof DirectiveLevel>;

export interface IBoardProps {
  readonly me: IMe;
  readonly project: WorkspaceContext;
  readonly logId: string | null;
  readonly pageId: string | null;
}

export interface IEntityDetailProps {
  readonly target: IEntityTarget;
  readonly project: WorkspaceContext;
  readonly narrow: boolean;
  readonly onClose: () => void;
}

export interface ILogListProps {
  readonly logs: readonly IResearchLog[];
  readonly more: IMore;
  readonly loading: boolean;
  readonly error: string | null;
  readonly project: WorkspaceContext;
  readonly scope: IScope;
  readonly search: string;
  readonly order: ILogOrder;
  readonly onOrder: (order: ILogOrder) => void;
  readonly creating: boolean;
  readonly onScope: (scope: IScope) => void;
  readonly onSearch: (search: string) => void;
  readonly onPick: (id: string) => void;
  readonly onNew: () => void;
}

export interface IHomeProps extends ILogListProps {
  readonly total: number;
}

export const Layout = { Wide: 'wide', Compact: 'compact', Narrow: 'narrow' } as const;

export type TLayout = TValueOf<typeof Layout>;

export interface IPageOutlineProps {
  readonly project: WorkspaceContext;
  readonly logId: string;
  readonly logName: string;
  readonly pageId: string | null;
  readonly onOpen: (page: IPage, edit?: boolean) => void;
}

export const RailHeading = { None: 'none', Drawer: 'drawer' } as const;

export type TRailHeading = TValueOf<typeof RailHeading>;

export interface IScope {
  readonly public: boolean;
  readonly project: boolean;
}

export interface IMore {
  readonly has: boolean;
  readonly loading: boolean;
  readonly failed: boolean;
  readonly onMore: () => void;
}

export interface IRailProps extends ILogListProps {
  readonly activeId: string | null;
  readonly heading: TRailHeading;
  readonly outline?: ReactNode;
  readonly onClose: () => void;
  readonly onRename: (id: string, name: string) => Promise<unknown>;
  readonly onDelete: (id: string) => Promise<unknown>;
}

export type TAwareness = NonNullable<HocuspocusProvider['awareness']>;

export interface IActorSources {
  readonly awareness: TAwareness;
  readonly peers: () => readonly IPeer[];
  readonly agents: () => readonly { readonly label: string }[];
  readonly written: (clientId: number) => IActor | undefined;
}

export interface IChange {
  readonly id: number;
  readonly actor: IActor;
  readonly local: boolean;
  readonly at: number;
  readonly from: number;
  readonly to: number;
  readonly blockId: string | null;
  readonly summary: string;
  readonly removed: string;
}

export interface IChangeSnapshot {
  readonly events: readonly IChange[];
  readonly toast: IChange | null;
  readonly seen: Readonly<Record<string, number>>;
}

export interface IHighlight {
  readonly at: number;
}

export interface IPluginState {
  readonly decorations: DecorationSet;
  readonly change: IChange | null;
  readonly mapping: Mapping;
}

export interface ICollaborationChangesOptions {
  readonly doc: Y.Doc | null;
  readonly feed: ChangeFeed | null;
  readonly me: IActor;
  readonly resolve: (clientId: number) => IActor;
  readonly highlights: () => boolean;
  readonly ready: () => boolean;
}

export interface IDiff {
  readonly from: number;
  readonly to: number;
  readonly removed: string;
}

export interface IPausableSocket {
  readonly status: WebSocketStatus;
  connect(): Promise<unknown>;
  disconnect(): void;
}

export interface IPageVisibility {
  readonly visibilityState: DocumentVisibilityState;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
  removeEventListener(type: 'visibilitychange', listener: () => void): void;
}

export interface IPausableProvider {
  readonly hasUnsyncedChanges: boolean;
  readonly configuration: { readonly websocketProvider: IPausableSocket };
}

export interface IPageDocs {
  readonly read: (pageId: string) => Promise<Uint8Array>;
  readonly send: (pageId: string, update: Uint8Array) => Promise<void>;
}

export const CopySync = {
  Clean: 'clean',
  Sent: 'sent',
  NothingToSend: 'nothing-to-send',
  Open: 'open',
  Gone: 'gone',
  Refused: 'refused',
  Failed: 'failed',
} as const;

export type TCopySync = TValueOf<typeof CopySync>;

export interface ICopyReport {
  readonly name: string;
  readonly pageId: string;
  readonly result: TCopySync;
}

export interface ISyncOptions {
  readonly skip?: ReadonlySet<string>;
  readonly pauseMs?: number;
}

export interface IPeer {
  readonly joinId: string;
  readonly userId: string;
  readonly label: string;
  readonly via: string;
}

export type TNotice =
  | {
      readonly type: typeof CollaborationNotice.Peers;
      readonly seq: number;
      readonly peers: readonly IPeer[];
    }
  | { readonly type: typeof CollaborationNotice.Saved; readonly own: boolean }
  | {
      readonly type: typeof CollaborationNotice.Present;
      readonly actor: { readonly label: string; readonly via: string };
      readonly blockIds: readonly string[];
      readonly ttlSeconds: number;
    }
  | {
      readonly type: typeof CollaborationNotice.Writer;
      readonly clientIds: readonly number[];
      readonly actor: IWriterActor;
    }
  | { readonly type: typeof CollaborationNotice.ReadOnly; readonly reason: TReadOnlyReason }
  | { readonly type: typeof CollaborationNotice.Closing };

export interface IWriterActor {
  readonly userId: string;
  readonly label: string;
  readonly via: string;
}

export type TRecord = Readonly<Record<string, unknown>>;

export interface IPresentAgent {
  readonly label: string;
  readonly blockIds: readonly string[];
  readonly until: number;
}

export interface ICollaborationSnapshot {
  readonly peersSeq: number;
  readonly peers: readonly IPeer[];
  readonly savedAt: number | null;
  readonly pageSavedAt: number | null;
  readonly agents: readonly IPresentAgent[];
  readonly readOnly: TReadOnlyReason | null;
  readonly rejoinAt: number | null;
  /** The page holds a block this build does not know: it stays read-only until a reload. */
  readonly outdated: boolean;
}

export interface IRejoinProvider {
  on(event: string, listener: (data: never) => void): unknown;
  off(event: string, listener: (data: never) => void): unknown;
  sendToken(): Promise<void>;
  startSync(): void;
  readonly configuration: { readonly websocketProvider: { readonly status: WebSocketStatus } };
}

export interface IShikiToken {
  readonly content: string;
  readonly color?: string | undefined;
}

export interface IViewer3dProps {
  readonly entityId: string;
  readonly project: WorkspaceContext;
}

export interface IToolProps {
  readonly label: string;
  readonly keys?: string | null;
  readonly icon: TIconName;
  readonly pressed?: boolean;
  readonly disabled: boolean;
  readonly onRun: () => void;
}

export const Format = {
  Bold: 'bold',
  Italic: 'italic',
  Underline: 'underline',
  Strike: 'strike',
  Code: 'code',
  Link: 'link',
  BulletList: 'bullet-list',
  OrderedList: 'ordered-list',
  Quote: 'quote',
  CodeBlock: 'code-block',
} as const;

export type TFormat = TValueOf<typeof Format>;

export interface IFormat {
  readonly key: TFormat;
  readonly label: string;
  readonly icon: TIconName;
  readonly keys: string | null;
  readonly run: (editor: Editor) => void;
}

export interface ILinkTarget {
  readonly from: number;
  readonly to: number;
  readonly text: string;
  readonly href: string;
  /** False when the range spans blocks or holds a chip, which a text edit would lose. */
  readonly textEditable: boolean;
}

export interface ILinkEdit {
  readonly text: string;
  readonly href: string;
}

export const TextStyle = {
  Paragraph: 'paragraph',
  Heading1: 'h1',
  Heading2: 'h2',
  Heading3: 'h3',
} as const;

export type TTextStyle = TValueOf<typeof TextStyle>;

export const Align = {
  Left: 'left',
  Center: 'center',
  Right: 'right',
  Justify: 'justify',
} as const;

export type TAlign = TValueOf<typeof Align>;

export interface IFormatState {
  readonly active: Readonly<Record<TFormat, boolean>>;
  readonly style: TTextStyle;
  readonly align: TAlign;
  readonly canAlign: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly canIndent: boolean;
  readonly canOutdent: boolean;
}

export const TokenKind = {
  Comment: 'comment',
  String: 'string',
  Number: 'number',
  Keyword: 'keyword',
  Text: 'text',
} as const;

export type TTokenKind = TValueOf<typeof TokenKind>;

export interface IToken {
  readonly kind: TTokenKind;
  readonly text: string;
  readonly from: number;
}

export interface IGrammar {
  readonly id: string;
  readonly load: LanguageInput;
}

export type TArtifactLook = Pick<IFileLook, 'badge' | 'bg' | 'fg'>;

export interface IView {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

export interface ILogContext {
  readonly project: WorkspaceContext;
  readonly logId: string;
}

/** What a key does in the open page list. */
export const ListKey = { Down: 'down', Up: 'up', Pick: 'pick', Close: 'close' } as const;

export type TListKey = TValueOf<typeof ListKey>;

/** The open page list's key handler: true when the list used the key. */
export type TPageListKeys = (event: KeyboardEvent) => boolean;

/** `[[name` typed at the caret: the range it covers and the name so far. */
export interface IPageQuery {
  readonly from: number;
  readonly to: number;
  readonly text: string;
}

export interface IPickedEntity {
  readonly id: string;
  readonly type: string;
  readonly name: string;
}

export type TOpenEntityPicker = (onPick: (entity: IPickedEntity) => void) => void;

export interface IEntityTarget {
  readonly type: string;
  readonly entityId: string;
}

export type TOpenEntityDetail = (target: IEntityTarget) => void;

export interface IDeleteLogDialogProps {
  readonly log: IResearchLog;
  readonly project: WorkspaceContext;
  readonly onDelete: () => Promise<unknown>;
  readonly onClose: () => void;
}

export interface IDeletePageDialogProps {
  readonly page: IPage;
  readonly logName: string;
  readonly onDelete: () => Promise<unknown>;
  readonly onClose: () => void;
}

export interface IClock {
  readonly top: number;
  readonly from: number;
  readonly to: number;
  readonly kind: string;
}

export interface IEditorCardProps extends ILogShared {
  readonly style: CSSProperties;
  readonly mTab: TMobileTab;
  readonly setMTab: (tab: TMobileTab) => void;
  readonly sideOpen: boolean;
  readonly rightTab: TRightTab;
  readonly canShut: boolean;
  readonly onShut: () => void;
}

export interface IEditorTab {
  readonly tab: ITabRef;
  readonly label: string;
  readonly hint: string;
  readonly icon: ReactNode;
  readonly pinned: boolean;
  /** Null when the tab's name cannot be changed (a file, or no write access). */
  readonly onRename: ((name: string) => Promise<unknown>) | null;
}

export interface IEditorTabsProps {
  readonly tabs: readonly IEditorTab[];
  readonly active: ITabRef;
  readonly page: ITabRef;
  readonly status: ReactNode;
  readonly onSelect: (tab: ITabRef) => void;
  readonly onClose: (tab: ITabRef) => void;
}

export type TNavItem = {
  readonly key: string;
  readonly label: string;
  readonly coreType: TExtendedEntitiesTypeDict;
};

export interface INavSection {
  readonly id: string;
  readonly title: string;
  readonly icon: TIconName;
  readonly look: Omit<ILook, 'label'>;
  readonly items: readonly TNavItem[];
}

export type TPicks = Readonly<Record<string, readonly IPickedEntity[]>>;

export interface IEntityGridPickerProps {
  readonly multiple: boolean;
  readonly onPick: (entities: readonly IPickedEntity[]) => void;
  readonly onClose: () => void;
}

export interface IPiece {
  readonly actor: IActor;
  readonly text: string;
}

export interface IRun {
  readonly client: number;
  readonly text: string;
}

export interface ILogDetailsDialogProps {
  readonly open: boolean;
  readonly name: string;
  readonly description: string;
  readonly saving: boolean;
  readonly onSave: (draft: TResearchLogDraft) => Promise<unknown>;
  readonly onClose: () => void;
}

export interface ILogViewProps {
  readonly me: IMe;
  readonly project: WorkspaceContext;
  readonly logId: string;
  readonly pageId: string | null;
  readonly log: IResearchLog | null;
  readonly layout: TLayout;
  readonly mode: TViewMode;
  readonly onMode: (mode: TViewMode) => void;
  readonly onBack: () => void;
  readonly onOpenList: () => void;
}

export interface IPageViewProps extends ILogViewProps {
  readonly page: IPage;
  readonly pages: readonly IPage[];
  readonly deleted: boolean;
  readonly shown: boolean;
  readonly keepMs: number | null;
  readonly onCool: (pageId: string) => void;
  readonly tabs: readonly ITabRef[];
  readonly artifactId: string | null;
  readonly onOpenPage: (page: IPage) => void;
  readonly onOpenArtifact: (id: string) => void;
  readonly onSelectTab: (tab: ITabRef) => void;
  readonly onCloseTab: (tab: ITabRef) => void;
}

export interface IInsertMenuProps {
  readonly editor: Editor;
  readonly onClose: () => void;
  readonly onPicker: () => void;
  readonly onNotice: (notice: INotice) => void;
}

export interface INotifyPopoverProps {
  readonly settings: INotifySettings;
  readonly onChange: (patch: Partial<INotifySettings>) => void;
  readonly onClose: () => void;
}

export const NoticeKind = {
  Success: 'success',
  Info: 'info',
  Warning: 'warning',
  Error: 'error',
} as const;

export type TNoticeKind = TValueOf<typeof NoticeKind>;

export interface INotice {
  readonly kind: TNoticeKind;
  readonly title: string;
  readonly description?: string;
}

export const ToastSource = { All: 'all', Mine: 'mine' } as const;

export type TToastSource = TValueOf<typeof ToastSource>;

export interface INotifySettings {
  readonly toasts: boolean;
  readonly from: TToastSource;
  readonly highlights: boolean;
  readonly flags: boolean;
}

export const TabKind = { Page: 'page', Artifact: 'artifact' } as const;

export type TTabKind = TValueOf<typeof TabKind>;

export interface ITabRef {
  readonly kind: TTabKind;
  readonly id: string;
}

export interface IOpenTabs {
  readonly open: readonly ITabRef[];
  readonly live: readonly string[];
  readonly artifactId: string | null;
  readonly followed: { readonly pageId: string | null; readonly found: boolean } | null;
}

export interface INeighbours {
  readonly index: number;
  readonly previous: IPage | null;
  readonly next: IPage | null;
}

export interface IPageNavProps {
  readonly pages: readonly IPage[];
  readonly page: IPage;
  readonly onOpen: (page: IPage) => void;
}

export const Status = {
  Editing: 'editing',
  Writing: 'writing',
  Reading: 'reading',
  Idle: 'idle',
} as const;

export type TStatus = TValueOf<typeof Status>;

export interface IPresent {
  readonly actor: IActor;
  readonly status: TStatus;
  readonly active: boolean;
  readonly you: boolean;
  readonly sub: string;
}

export interface ISaveStatusProps {
  readonly notices: CollaborationNotices;
  readonly copy: LocalCopy;
  readonly iconOnly: boolean;
}

export interface ISidePaneProps extends ILogShared {
  readonly tab: TRightTab;
  readonly setTab: (tab: TRightTab) => void;
  readonly editorShut: boolean;
  readonly canShut: boolean;
  readonly onShut: () => void;
}

export interface IAgentToastProps {
  readonly feed: ChangeFeed;
  readonly settings: INotifySettings;
  readonly me: IMe;
  readonly onShow: (change: IChange) => void;
}

export const Menu = {
  None: 'none',
  Insert: 'insert',
  Who: 'who',
  Picker: 'picker',
} as const;

export type TMenu = TValueOf<typeof Menu>;

export const RightTab = {
  Preview: 'preview',
  History: 'history',
  Artifacts: 'artifacts',
} as const;

export type TRightTab = TValueOf<typeof RightTab>;

export const MobileTab = {
  Write: 'write',
  Preview: 'preview',
  History: 'history',
  Artifacts: 'artifacts',
} as const;

export type TMobileTab = TValueOf<typeof MobileTab>;

export interface ISelection {
  readonly from: number;
  readonly to: number;
}

export interface IUploadTarget {
  readonly editor: Editor;
  readonly logId: string;
  readonly project: WorkspaceContext;
  readonly client: QueryClient;
  readonly notify: (notice: INotice) => void;
}

export const ViewMode = { Read: 'read', Edit: 'edit' } as const;

export type TViewMode = TValueOf<typeof ViewMode>;

export interface IRoute {
  readonly project: WorkspaceContext | null;
  readonly logId: string | null;
  readonly pageId: string | null;
}

export interface IMe {
  readonly userId: string;
  readonly name: string;
  readonly initials: string;
  readonly colour: string;
}

export interface IContributorsWaiter {
  readonly resolve: (contributors: readonly IContributor[]) => void;
  readonly reject: (error: unknown) => void;
}

export interface IContributorsBatch {
  readonly project: WorkspaceContext;
  readonly waiters: Map<string, IContributorsWaiter[]>;
}

export interface IUnsent {
  readonly failed: number;
  readonly lost: readonly string[];
}

export interface IUnsentCopiesProps {
  readonly userId: string;
  readonly enabled: boolean;
}

export interface IEntityCoreSyncState {
  readonly isSynced: boolean;
  readonly hasUnsyncedChanges: boolean;
}

export interface ILocalCopyDeps {
  document: Y.Doc;
  persistence: IndexeddbPersistence | null;
  release?: () => void;
}

export interface IHeld {
  readonly copy: Promise<LocalCopy>;
  users: number;
  closing: ReturnType<typeof setTimeout> | null;
}

export interface ICaretUser {
  readonly userId: string;
  readonly name: string;
  readonly color: string;
}

export interface IEditorOptions {
  readonly provider: HocuspocusProvider;
  readonly me: IActor;
  readonly feed: ChangeFeed;
  readonly resolve: (clientId: number) => IActor;
  readonly caretName: (user: Record<string, unknown>) => string;
  readonly highlights: () => boolean;
  readonly ready: () => boolean;
  readonly onOutdated: () => void;
}

export interface ILogPageProps extends IPageViewProps {
  readonly notices: CollaborationNotices;
  readonly feed: ChangeFeed;
  readonly copy: LocalCopy;
  readonly openedAt: string;
}

export const SplitShut = { None: 'none', Editor: 'editor', Side: 'side' } as const;

export type TSplitShut = TValueOf<typeof SplitShut>;

export interface ILogShared extends ILogPageProps {
  readonly editor: Editor;
  readonly meActor: IActor;
  readonly resolve: (clientId: number) => IActor;
  readonly settings: INotifySettings;
  readonly menu: TMenu;
  readonly setMenu: (menu: TMenu) => void;
  readonly selection: ISelection | null;
  readonly setSelection: (selection: ISelection | null) => void;
  readonly showHistory: (range: ISelection | null) => void;
  readonly flash: (from: number, to: number) => void;
  readonly setNotice: (notice: INotice) => void;
  readonly openArtifact: (id: string) => void;
  readonly readOnly: TReadOnlyReason | null;
  readonly outdated: boolean;
  readonly awarenessStates: () => Map<number, Record<string, unknown>>;
  readonly learnWriters: (clientIds: readonly number[]) => void;
}
