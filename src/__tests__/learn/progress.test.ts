import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { recordSlide, resetCourse, useLearnProgress } from '@/features/learn/progress';

const KEY = 'learn/progress/v1';
const stored = () => JSON.parse(window.localStorage.getItem(KEY) ?? '{}');

describe('learn progress', () => {
  beforeEach(() => window.localStorage.clear());

  it('keeps the slide shown and the furthest reached', () => {
    recordSlide('python', 4, 15);
    recordSlide('python', 2, 15);
    expect(stored().python).toMatchObject({ slide: 2, furthest: 4, done: false });
  });

  it('marks a course done on its last slide, and keeps it so', () => {
    recordSlide('python', 14, 15);
    recordSlide('python', 0, 15);
    expect(stored().python).toMatchObject({ slide: 0, furthest: 14, done: true });
  });

  it('forgets one course and keeps the others', () => {
    recordSlide('python', 3, 15);
    recordSlide('brain-modeling', 5, 27);
    resetCourse('python');
    expect(stored()).not.toHaveProperty('python');
    expect(stored()['brain-modeling']).toMatchObject({ slide: 5 });
  });

  it('survives what is stored being unreadable', () => {
    window.localStorage.setItem(KEY, '{not json');
    recordSlide('python', 1, 15);
    expect(stored().python).toMatchObject({ slide: 1 });
  });

  it('tells its readers when a slide is recorded', () => {
    const { result } = renderHook(() => useLearnProgress());
    expect(result.current).toEqual({});
    act(() => recordSlide('electrical-physics', 6, 23));
    expect(result.current['electrical-physics']).toMatchObject({ slide: 6, furthest: 6 });
  });
});
