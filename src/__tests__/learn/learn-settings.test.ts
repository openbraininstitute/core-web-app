import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LEARN_SETTINGS,
  parseLearnSettings,
  serializeLearnSettings,
} from '@/features/learn/learn-settings';

describe('parseLearnSettings', () => {
  it('gives the defaults - every course listed, Help as it is - with no cookie or one that cannot be read', () => {
    expect(DEFAULT_LEARN_SETTINGS).toEqual({ hiddenCourses: [], leanHelp: false });
    expect(parseLearnSettings(undefined)).toEqual(DEFAULT_LEARN_SETTINGS);
    expect(parseLearnSettings('not json')).toEqual(DEFAULT_LEARN_SETTINGS);
  });

  it('keeps what the cookie holds of the right kind, and ignores what older versions kept there', () => {
    expect(
      parseLearnSettings(
        JSON.stringify({
          hiddenCourses: ['python', 3],
          leanHelp: 'yes',
          help: true,
          // Help hidden altogether, a setting until it became the hide-help flag
          hideHelp: true,
        })
      )
    ).toEqual({ hiddenCourses: ['python'], leanHelp: false });
  });
});

describe('serializeLearnSettings', () => {
  it('keeps only what differs from the defaults', () => {
    expect(JSON.parse(serializeLearnSettings(DEFAULT_LEARN_SETTINGS))).toEqual({ v: 2 });
    const changed = { ...DEFAULT_LEARN_SETTINGS, hiddenCourses: ['misc'], leanHelp: true };
    expect(JSON.parse(serializeLearnSettings(changed))).toEqual({
      v: 2,
      hiddenCourses: ['misc'],
      leanHelp: true,
    });
    expect(parseLearnSettings(serializeLearnSettings(changed))).toEqual(changed);
  });
});
