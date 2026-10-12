/**
 * Learn's own settings, set from the Dev settings on the Learn page: the courses it leaves off the
 * page, and two for Help - made lean, without what Learn now covers, or hidden altogether. Kept in a
 * cookie, so that pages render with them on the server and nothing flashes; written from the browser,
 * so a change shows at once. Each is off by default, so that without them the platform is as it is.
 * (The AI button and the top bar in the courses' style are feature flags.)
 */

export const LEARN_SETTINGS_COOKIE = 'learn-settings';

export type LearnSettings = {
  /** The courses left off the Learn page, by id. */
  hiddenCourses: string[];
  /** Help without what Learn now covers or does without: its overview, tutorials, glossary and AI chat tools. */
  leanHelp: boolean;
  /** No Help button in the top menu, and no Help page. */
  hideHelp: boolean;
};

export const DEFAULT_LEARN_SETTINGS: LearnSettings = {
  hiddenCourses: [],
  leanHelp: false,
  hideHelp: false,
};

const SWITCHES = ['leanHelp', 'hideHelp'] as const;

/**
 * The cookie's format. It holds only what differs from the defaults, so that a default changed later
 * reaches everyone who left that setting alone. Other keys, kept by older versions, are ignored.
 */
const VERSION = 2;

/** The settings a cookie holds: the defaults, with whatever it has of the right kind over them. */
export function parseLearnSettings(value: string | undefined): LearnSettings {
  if (!value) return DEFAULT_LEARN_SETTINGS;
  try {
    const saved = JSON.parse(value) as Partial<Record<keyof LearnSettings, unknown>>;
    const settings: LearnSettings = { ...DEFAULT_LEARN_SETTINGS };
    if (Array.isArray(saved.hiddenCourses))
      settings.hiddenCourses = saved.hiddenCourses.filter((id) => typeof id === 'string');
    for (const key of SWITCHES) {
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
