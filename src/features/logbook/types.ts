import type { HocuspocusProvider, WebSocketStatus } from '@hocuspocus/provider';
import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { JSONContent } from '@tiptap/core';
import type { DecorationSet } from '@tiptap/pm/view';
import type { Editor } from '@tiptap/react';
import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import type { LanguageInput } from 'shiki/core';
import type { IndexeddbPersistence } from 'y-indexeddb';
import type * as Y from 'yjs';
import type { IResearchLog, IResearchLogDraft } from '@/api/entitycore/types/entities/research-log';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreResponse } from '@/api/entitycore/types/shared/response';
import type { CollaborationNotice, IPage, TReadOnlyReason, TValueOf } from '@/api/logbook/types';
import type { ChangeFeed } from '@/features/logbook/collaboration/changes';
import type { LocalCopy } from '@/features/logbook/collaboration/local-copy';
import type { CollaborationNotices } from '@/features/logbook/collaboration/notices';
import type { TIconName } from '@/ui/molecules/icon';

export interface IActor {
  readonly key: string;
  readonly name: string;
  readonly initials: string;
  readonly colour: string;
  readonly agent: boolean;
  /** The person this is, or the agent works for; null when only an agent label is known. */
  readonly ownerId: string | null;
}

/** Which edge of its anchor a popover lines up with. */
export const PopoverAlign = { Start: 'start', End: 'end', Center: 'center' } as const;
export type TPopoverAlign = TValueOf<typeof PopoverAlign>;

export const PopoverSide = { Below: 'bottom', Above: 'top' } as const;
export type TPopoverSide = TValueOf<typeof PopoverSide>;

// One writer's rows on one page, merged while at most GAP_MS apart.
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

export interface IEntity {
  readonly id: string;
  readonly name: string;
  readonly type?: string;
  readonly creation_date?: string;
  readonly created_by?: { readonly pref_label: string };
  readonly brain_region?: { readonly name: string; readonly acronym?: string } | null;
  readonly subject?: { readonly species?: { readonly name: string } | null } | null;
}

export interface ILogFile {
  readonly path: string;
  readonly localPath: string; // saved name without the hash part
  readonly name: string;
  readonly size: number;
  readonly lastModified: string;
}

// A page's markdown copy written by the server's EntityCore sync; read-only here.
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
  readonly where: string; // folder, or 'synced' for a page's copy
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

// The key is made once per add, so a retry never makes two sections.
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

// Public: public logs of any project. Project: this project's. Both on: everything.
export interface ILogFilter {
  readonly public: boolean;
  readonly project: boolean;
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

// For packages that don't depend on Tiptap.
export type TBlockJson = JSONContent;

export interface IBoardProps {
  readonly me: IMe;
  readonly project: IProject;
  readonly logId: string | null;
  readonly pageId: string | null; // a section of the open log; null: its main page
}

export interface IEntityDetailProps {
  readonly target: IEntityTarget;
  readonly project: IProject;
  readonly narrow: boolean;
  readonly onClose: () => void;
}

export interface IHomeProps {
  readonly logs: readonly IResearchLog[];
  // All matches, loaded or not.
  readonly total: number;
  readonly more: IMore;
  readonly loading: boolean;
  readonly error: string | null;
  readonly project: IProject;
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

export const Layout = { Wide: 'wide', Compact: 'compact', Narrow: 'narrow' } as const;

export type TLayout = TValueOf<typeof Layout>;

export interface IPageOutlineProps {
  readonly project: IProject;
  readonly logId: string;
  readonly logName: string;
  readonly pageId: string | null; // the page the address names; null: the main page
  // `edit` opens it in the editor.
  readonly onOpen: (page: IPage, edit?: boolean) => void;
}

// No heading in a wide rail; a title and X in the phone drawer.
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

export interface IRailProps {
  // The pages read so far.
  readonly logs: readonly IResearchLog[];
  readonly more: IMore;
  readonly loading: boolean;
  readonly error: string | null;
  readonly activeId: string | null;
  readonly project: IProject;
  readonly scope: IScope;
  readonly search: string;
  readonly order: ILogOrder;
  readonly onOrder: (order: ILogOrder) => void;
  readonly heading: TRailHeading;
  readonly creating: boolean;
  readonly onScope: (scope: IScope) => void;
  readonly onSearch: (search: string) => void;
  readonly onPick: (id: string) => void;
  readonly onNew: () => void;
  // The open log's pages, shown under its card.
  readonly outline?: ReactNode;
  readonly onClose: () => void;
  // Each rejects with the reason shown on the card.
  readonly onRename: (id: string, name: string) => Promise<unknown>;
  readonly onDelete: (id: string) => Promise<unknown>;
}

export type TAwareness = NonNullable<HocuspocusProvider['awareness']>;

export interface IActorSources {
  readonly awareness: TAwareness;
  readonly peers: () => readonly IPeer[];
  readonly agents: () => readonly { readonly label: string }[];
  // The server's writer of a client: exact, and the only source for clients no longer online.
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
  readonly events: readonly IChange[]; // newest first
  readonly toast: IChange | null;
  readonly seen: Readonly<Record<string, number>>; // actor key → last change time
}

export interface IHighlight {
  readonly at: number;
}

export interface IPluginState {
  readonly decorations: DecorationSet;
  readonly change: IChange | null;
}

export interface ICollaborationChangesOptions {
  readonly doc: Y.Doc | null;
  readonly feed: ChangeFeed | null;
  readonly me: IActor;
  readonly resolve: (clientId: number) => IActor;
  readonly highlights: () => boolean;
  readonly ready: () => boolean; // false until first sync, so the loaded page isn't "new"
}

// Diff the docs: the Yjs binding replaces a whole paragraph per keystroke, so steps can't tell.
export interface IDiff {
  readonly from: number;
  readonly to: number; // in the new document
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

// Both throw an ApiError when refused.
export interface IPageDocs {
  readonly read: (pageId: string) => Promise<Uint8Array>;
  readonly send: (pageId: string, update: Uint8Array) => Promise<void>;
}

export const CopySync = {
  Clean: 'clean',
  Sent: 'sent',
  NothingToSend: 'nothing-to-send',
  Open: 'open', // its provider sends it
  Gone: 'gone', // 404
  Refused: 'refused', // 403
  Failed: 'failed', // kept, retried at the next start
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
  // own: this connection's changes are in that save; only then may the device copy go clean.
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

// Hand-written guards, not TypeBox, to keep the bundle small.
export type TRecord = Readonly<Record<string, unknown>>;

export interface IPresentAgent {
  readonly label: string;
  readonly blockIds: readonly string[];
  readonly until: number;
}

export interface ICollaborationSnapshot {
  readonly peersSeq: number;
  readonly peers: readonly IPeer[];
  readonly savedAt: number | null; // this connection's changes
  readonly pageSavedAt: number | null; // anyone's changes
  readonly agents: readonly IPresentAgent[];
  readonly readOnly: TReadOnlyReason | null;
  // When a refused join is retried; the editor is read-only until then.
  readonly rejoinAt: number | null;
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
  readonly project: IProject;
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
  // Tiptap shortcut like `Mod-b`.
  readonly keys: string | null;
  readonly run: (editor: Editor) => void;
}

export const TextStyle = {
  Paragraph: 'paragraph',
  Heading1: 'h1',
  Heading2: 'h2',
  Heading3: 'h3',
} as const;

export type TTextStyle = TValueOf<typeof TextStyle>;

// Left is the default: choosing it removes the attribute.
export const Align = {
  Left: 'left',
  Center: 'center',
  Right: 'right',
  Justify: 'justify',
} as const;

export type TAlign = TValueOf<typeof Align>;

// useEditorState compares this, so changes that alter none of it render nothing.
export interface IFormatState {
  readonly active: Readonly<Record<TFormat, boolean>>;
  readonly style: TTextStyle;
  readonly align: TAlign;
  // A list item's paragraph can align; a code block can't.
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
  readonly load: LanguageInput; // a getter: the grammar loads only when asked
}

export interface IArtifactLook {
  readonly badge: string;
  readonly bg: string;
  readonly fg: string;
}

export interface IView {
  readonly scale: number;
  readonly x: number; // offset from the box's centre, px
  readonly y: number;
}

export interface ILogContext {
  readonly project: IProject;
  readonly logId: string;
}

export interface IPickedEntity {
  readonly id: string;
  readonly type: string;
  readonly name: string;
}

/** Opens the link-entity picker; `onPick` gets the chosen entity. Null where the log can't be edited. */
export type TOpenEntityPicker = (onPick: (entity: IPickedEntity) => void) => void;

export interface IEntityTarget {
  readonly type: string;
  readonly entityId: string;
}

/** Opens core's detail panel for an entity, beside the log. */
export type TOpenEntityDetail = (target: IEntityTarget) => void;

export interface IDeleteLogDialogProps {
  readonly log: IResearchLog;
  readonly project: IProject;
  // Rejects with a reason the dialog shows; a 503 is safe to retry.
  readonly onDelete: () => Promise<unknown>;
  readonly onClose: () => void;
}

export interface IDeletePageDialogProps {
  readonly page: IPage;
  readonly logName: string;
  readonly onDelete: () => Promise<unknown>;
  readonly onClose: () => void;
}

export interface IPopAt {
  readonly top: number;
  readonly left: number;
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
  readonly pinned: boolean; // the main page: named after the log, never closed
}

export interface IEditorTabsProps {
  readonly tabs: readonly IEditorTab[];
  readonly active: ITabRef;
  readonly page: ITabRef; // the page behind the editor: its tab shows the save status
  readonly status: ReactNode;
  readonly canRename: boolean;
  readonly onRename: (name: string) => Promise<unknown>;
  readonly onSelect: (tab: ITabRef) => void;
  readonly onClose: (tab: ITabRef) => void;
}

// A type in the left navigator: a Data grid, or the name search for types core has no grid for.
export type TNavItem =
  | { readonly key: string; readonly label: string; readonly coreType: TExtendedEntitiesTypeDict }
  | { readonly key: string; readonly label: string; readonly blockType: TEntityType };

export interface INavSection {
  readonly id: string;
  readonly title: string;
  readonly icon: string;
  readonly look: Omit<ILook, 'label'>;
  readonly items: readonly TNavItem[];
}

export type TPicks = Readonly<Record<string, readonly IPickedEntity[]>>;

export interface IEntityGridPickerProps {
  /** One pick (replacing a card) or many (linking). */
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
  readonly onSave: (draft: IResearchLogDraft) => Promise<unknown>;
  readonly onClose: () => void;
}

export interface ILogViewProps {
  readonly me: IMe;
  readonly project: IProject;
  readonly logId: string;
  readonly pageId: string | null; // null: the main page
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
  // Deleted while open: shown read-only from the local copy.
  readonly deleted: boolean;
  readonly shown: boolean; // on screen; false: mounted but hidden (warm)
  readonly keepMs: number | null; // how long it stays mounted off screen; null: on screen
  readonly onCool: (pageId: string) => void;
  readonly tabs: readonly ITabRef[];
  readonly artifactId: string | null; // the file shown over the page
  readonly onOpenPage: (page: IPage) => void;
  readonly onOpenArtifact: (id: string) => void;
  readonly onSelectTab: (tab: ITabRef) => void;
  readonly onCloseTab: (tab: ITabRef) => void;
}

export interface IInsertMenuProps {
  readonly editor: Editor;
  readonly at: IPopAt;
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
  /** Tabs in strip order. The main page has no tab: it is always there. */
  readonly open: readonly ITabRef[];
  /** Mounted pages, the one on screen first, then the most recently left. */
  readonly live: readonly string[];
  /** The file shown over the page on screen, if any. */
  readonly artifactId: string | null;
  /** The address last acted on, and whether the log had its page; null before the first one. */
  readonly followed: { readonly pageId: string | null; readonly found: boolean } | null;
}

export interface INeighbours {
  readonly index: number; // -1 when deleted
  readonly previous: IPage | null;
  readonly next: IPage | null;
}

export interface IPageNavProps {
  readonly pages: readonly IPage[];
  readonly page: IPage; // may be deleted (not in the list)
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

export interface IKindLook {
  readonly icon: string;
  readonly badge: string; // tinted square behind the icon
  readonly bar: string; // the draining time bar
  readonly card: string;
  readonly lifeMs: number | null; // null: stays until closed
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
  readonly project: IProject;
  readonly client: QueryClient;
  readonly notify: (notice: INotice) => void;
}

export const ViewMode = { Read: 'read', Edit: 'edit' } as const;

export type TViewMode = TValueOf<typeof ViewMode>;

export interface IRoute {
  readonly project: IProject | null;
  readonly logId: string | null;
  readonly pageId: string | null; // null: the main page
}

export interface IProject {
  readonly virtualLabId: string;
  readonly projectId: string;
}

export interface IMe {
  readonly userId: string;
  readonly name: string;
  readonly initials: string;
  readonly colour: string;
  readonly projects: readonly IProject[];
}

export type TClaims = Readonly<Record<string, unknown>>;

// `failed` retries next start; `lost` were refused (404/403) and stay on the device.
export interface IUnsent {
  readonly failed: number;
  readonly lost: number;
}

export interface IUnsentCopiesProps {
  readonly userId: string;
  // Starts once the list of logs is on screen.
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

// Shared per tab; close waits a tick so React's dev double mount reuses the copy.
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
  // The server's label for the user id, never the awareness text.
  readonly caretName: (user: Record<string, unknown>) => string;
  readonly highlights: () => boolean;
  readonly ready: () => boolean;
}

export interface ILogPageProps extends IPageViewProps {
  readonly notices: CollaborationNotices;
  readonly feed: ChangeFeed;
  readonly copy: LocalCopy;
  // When this visit began (ISO): saved activity ends here, the live feed starts.
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
  readonly setNotice: (notice: INotice | null) => void;
  readonly openArtifact: (id: string) => void;
  readonly readOnly: TReadOnlyReason | null;
  readonly awarenessStates: () => Map<number, Record<string, unknown>>;
  readonly learnWriters: (clientIds: readonly number[]) => void;
}

export interface IPresenceButtonProps extends ILogShared {
  readonly expanded: boolean;
  readonly onToggle: (event: ReactMouseEvent<HTMLButtonElement>) => void;
}

export interface IHereNowProps extends ILogShared {
  readonly at: IPopAt;
  readonly states: () => Map<number, Record<string, unknown>>;
}
