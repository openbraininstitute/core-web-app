/**
 * Learn's own settings, set from the Dev settings on the Learn page: which courses it lists, and the
 * platform changes it is trying out — the Help button and page, the AI assistant's style and the
 * top bar's look. Kept in a cookie, like the feature flags, so that pages render with them on the
 * server and nothing flashes; written from the browser, so a change shows at once.
 */

export const LEARN_SETTINGS_COOKIE = 'learn-settings';

export type LearnSettings = {
  /** The courses left off the Learn page, by id. */
  hiddenCourses: string[];
  /** The top menu's Help button, and the Help page. */
  help: boolean;
  /** The AI assistant's new style: a round "AI" button in the top menu, rather than the side rail. */
  aiButton: boolean;
  /** The top bar drawn in the style of the Learn courses' bar. */
  courseToolbar: boolean;
};

export const DEFAULT_LEARN_SETTINGS: LearnSettings = {
  hiddenCourses: [],
  help: false,
  aiButton: true,
  courseToolbar: false,
};

const SWITCHES = ['help', 'aiButton', 'courseToolbar'] as const;

/**
 * The cookie's format. It holds only what differs from the defaults, so that a default changed later
 * reaches everyone who left that setting alone. Before it (no `v`), the cookie held every setting,
 * defaults included — Help among them, on, when that was the default — so Help is not read from one.
 */
const VERSION = 2;

/** The settings a cookie holds: the defaults, with whatever it has of the right kind over them. */
export function parseLearnSettings(value: string | undefined): LearnSettings {
  if (!value) return DEFAULT_LEARN_SETTINGS;
  try {
    const saved = JSON.parse(value) as Partial<Record<keyof LearnSettings | 'v', unknown>>;
    const settings: LearnSettings = { ...DEFAULT_LEARN_SETTINGS };
    if (Array.isArray(saved.hiddenCourses))
      settings.hiddenCourses = saved.hiddenCourses.filter((id) => typeof id === 'string');
    for (const key of SWITCHES) {
      if (key === 'help' && saved.v !== VERSION) continue;
      const on = saved[key];
      if (typeof on === 'boolean') settings[key] = on;
    }
    return settings;
  } catch {
    return DEFAULT_LEARN_SETTINGS;
  }
}

/** What the cookie keeps of the settings: only those that are not the defaults. */
export function serializeLearnSettings(settings: LearnSettings): string {
  const saved: Partial<LearnSettings> & { v: number } = { v: VERSION };
  if (settings.hiddenCourses.length) saved.hiddenCourses = settings.hiddenCourses;
  for (const key of SWITCHES)
    if (settings[key] !== DEFAULT_LEARN_SETTINGS[key]) saved[key] = settings[key];
  return JSON.stringify(saved);
}
