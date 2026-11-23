import { settings } from '@/features/logbook/settings';

/** One minute in milliseconds. */
export const MINUTE_MS = 60_000;

/** One hour in milliseconds. */
export const HOUR_MS = 60 * MINUTE_MS;

/** One day in milliseconds. */
export const DAY_MS = 24 * HOUR_MS;

/** How often `useNow` ticks by default. */
export const CLOCK_MS = 400;

/** Research logs per list page. */
export const LOGS_PAGE_SIZE = 10;

/** How often the page list is read again, so pages others add show up. */
export const PAGES_REFRESH_MS = 30_000;

/** Most Yjs client ids asked in one writers request. */
export const WRITERS_MAX_CLIENTS = 100;

/** Edits by one writer closer than this join one activity run. */
export const ACTIVITY_GAP_MS = 5 * MINUTE_MS;

/** Most removed characters kept as text on one activity run. */
export const ACTIVITY_REMOVED_MAX_CHARS = 1000;

/** Largest file a log accepts, in bytes; the whole file is hashed in memory. */
export const UPLOAD_MAX_BYTES = Number(settings.upload.maxMb) * 1024 * 1024;

/** Code longer than this is shown without highlighting. */
export const HIGHLIGHT_MAX_CHARS = 200_000;

/** Wait after the last keystroke before a log search runs. */
export const SEARCH_WAIT_MS = 250;

/** Default and widest log rail width, in px. */
export const RAIL_MAX = 364;

/** Narrowest open log rail width, in px. */
export const RAIL_FLOOR = 220;

/** Dragging the log rail narrower than this (px) closes it. */
export const RAIL_SHUT_BELOW = 110;

/** Window width (px) from which the wide layout is used. */
export const LAYOUT_WIDE_MIN = 1180;

/** Window width (px) from which the compact layout is used. */
export const LAYOUT_COMPACT_MIN = 820;

/** Width of the log order panel, in px. */
export const LOG_ORDER_WIDTH = 264;

/** Narrowest side of the editor split, in px. */
export const PANE_FLOOR = 300;

/** Dragging a side of the editor split narrower than this (px) closes it. */
export const PANE_SHUT_BELOW = 150;

/** Smallest artifact zoom. */
export const ZOOM_MIN = 0.05;

/** Largest artifact zoom. */
export const ZOOM_MAX = 16;

/** Zoom factor of one + or - step. */
export const ZOOM_STEP = 1.25;

/** Faces shown in the presence stack before +N. */
export const PRESENCE_STACK = 2;

/** A collaborator seen within this is shown as active. */
export const PRESENCE_ACTIVE_MS = 2500;

/** You are shown as active this long after your last edit. */
export const PRESENCE_YOU_ACTIVE_MS = 3000;

/** An agent that wrote within this is shown as present. */
export const PRESENCE_AGENT_MS = 30_000;

/** Most pieces shown for one history run. */
export const HISTORY_MAX_PIECES = 6;

/** How long an agent toast stays on screen. */
export const AGENT_TOAST_MS = 7000;

/** Disconnected this long, the save status shows offline. */
export const OFFLINE_AFTER_MS = 2000;

/** Wait for the server's saved notice before treating it as lost. */
export const OTHERS_SAVE_WAIT_MS = 5000;

/** Most brain regions listed for one search. */
export const REGION_SEARCH_MAX = 60;

/** Pages left recently stay mounted, so going back is instant. */
export const WARM_PAGES = 2;

/** How long a warm page keeps its editor and socket before they are freed. */
export const WARM_KEEP_MS = 60_000;

/** A hidden tab's page disconnects after this long. */
export const HIDDEN_PAUSE_MS = Number(settings.collaboration.hiddenPauseS) * 1000;

/** How often unacknowledged changes are checked again. */
export const RECHECK_MS = 10_000;

/** First rejoin wait after the server sheds a socket; matches the server's 10 s hold. */
export const REJOIN_FIRST_MS = 10_000;

/** Longest rejoin wait; the provider's own reconnect cap. */
export const REJOIN_MAX_MS = 30_000;

/** Shortest rejoin wait. */
export const REJOIN_MIN_MS = 5000;

/** How long another writer's change stays highlighted. */
export const CHANGE_HIGHLIGHT_MS = 5200;

/** Changes by one writer closer than this merge into one event. */
export const CHANGE_COALESCE_MS = 8000;

/** Most change events kept. */
export const CHANGE_MAX_EVENTS = 30;

/** Send attempts per local copy at start-up. */
export const LOCAL_SYNC_TRIES = 3;

/** Wait between those send attempts. */
export const LOCAL_SYNC_PAUSE_MS = 1000;

/** Value stored under a tab's dirty key. */
export const DIRTY_YES = 1;

/** Most Yjs clients remembered as writers. */
export const NOTICES_MAX_WRITERS = 1000;

/** FNV-1a 32-bit offset basis. */
export const FNV_OFFSET = 0x811c9dc5;

/** FNV-1a 32-bit prime. */
export const FNV_PRIME = 0x01000193;
