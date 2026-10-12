import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LEARN_SETTINGS,
  parseLearnSettings,
  serializeLearnSettings,
} from '@/features/learn/learn-settings';

describe('parseLearnSettings', () => {
  it('gives the defaults with no cookie, or one that cannot be read', () => {
    expect(parseLearnSettings(undefined)).toEqual(DEFAULT_LEARN_SETTINGS);
    expect(parseLearnSettings('not json')).toEqual(DEFAULT_LEARN_SETTINGS);
  });

  it("has the AI assistant's new style and every course, but not Help, by default", () => {
    expect(DEFAULT_LEARN_SETTINGS).toEqual({
      hiddenCourses: [],
      help: false,
      aiButton: true,
      courseToolbar: false,
    });
  });

  it('keeps what the cookie holds of the right kind, and the defaults for the rest', () => {
    expect(
      parseLearnSettings(
        JSON.stringify({ v: 2, hiddenCourses: ['python', 3], aiButton: false, help: 'no', s: 1 })
      )
    ).toEqual({ hiddenCourses: ['python'], help: false, aiButton: false, courseToolbar: false });
  });

  it('reads Help from a cookie of this format, but not from an older one, which saved every default', () => {
    expect(parseLearnSettings(JSON.stringify({ v: 2, help: true })).help).toBe(true);
    const older = parseLearnSettings(
      JSON.stringify({ hiddenCourses: ['python'], help: true, aiButton: false })
    );
    expect(older).toEqual({
      hiddenCourses: ['python'],
      help: false,
      aiButton: false,
      courseToolbar: false,
    });
  });
});

describe('serializeLearnSettings', () => {
  it('keeps only what differs from the defaults, so a default changed later still reaches it', () => {
    expect(JSON.parse(serializeLearnSettings(DEFAULT_LEARN_SETTINGS))).toEqual({ v: 2 });
    const changed = { ...DEFAULT_LEARN_SETTINGS, hiddenCourses: ['misc'], help: true };
    expect(JSON.parse(serializeLearnSettings(changed))).toEqual({
      v: 2,
      hiddenCourses: ['misc'],
      help: true,
    });
    expect(parseLearnSettings(serializeLearnSettings(changed))).toEqual(changed);
  });
});
