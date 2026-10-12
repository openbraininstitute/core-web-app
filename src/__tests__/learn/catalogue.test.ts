import { describe, expect, it } from 'vitest';

import {
  getLearnCourse,
  LEARN_COURSES,
  learnCoursePath,
  learnHome,
} from '@/features/learn/catalogue';
import { isCortexStep } from '@/features/learn/components/cortex/Cortex';
import { isCourseWidget } from '@/features/learn/components/courses/registry';
import { isStage } from '@/features/learn/components/heuristics/shared';

/** The basics widgets the walkthrough draws by name. */
const BASICS = [
  'charge',
  'nernst',
  'resting',
  'rc',
  'morphology',
  'excitation',
  'ais',
  'neuron',
  'synapse-short',
  'synapse-long',
];

const ROOT = '/app/virtual-lab';
const LEARN_PAGE = `${ROOT}/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222/learn`;

describe('LEARN_COURSES', () => {
  it("gives every course its own id, which Learn's settings hide it by", () => {
    const ids = LEARN_COURSES.map((course) => course.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(
    LEARN_COURSES.map((course) => [course.id, course])
  )('%s only names figures the deck can draw', (_, course) => {
    for (const slide of course.slides) {
      if (slide.widget)
        expect(
          isStage(slide.widget) ||
            isCourseWidget(slide.widget) ||
            isCortexStep(slide.widget) ||
            BASICS.includes(slide.widget)
        ).toBe(true);
    }
  });

  it.each(
    LEARN_COURSES.map((course) => [course.id, course])
  )('%s previews a figure from its own slides', (_, course) => {
    expect(course.slides.map((slide) => slide.widget)).toContain(course.preview);
  });

  it('finds a course by id, and nothing for an unknown one', () => {
    expect(getLearnCourse('python')?.title).toBe('How to code in Python');
    expect(getLearnCourse('nope')).toBeUndefined();
  });
});

describe('learnHome', () => {
  it('leads back to the Learn page a course was opened from', () => {
    expect(learnHome(ROOT, LEARN_PAGE)).toBe(LEARN_PAGE);
    expect(learnHome(ROOT, `${LEARN_PAGE}?course=python`)).toBe(`${LEARN_PAGE}?course=python`);
  });

  it('falls back to the platform for anything that is not a Learn page', () => {
    for (const from of [
      undefined,
      ['a', 'b'],
      'https://example.com/learn',
      '//example.com/app/virtual-lab/a/b/learn',
      `${ROOT}/a/b/data`,
      `${LEARN_PAGE}?course=python&next=https://example.com`,
    ]) {
      expect(learnHome(ROOT, from)).toBe(ROOT);
    }
  });
});

describe('learnCoursePath', () => {
  it('carries the way back, and the slide to resume on past the first', () => {
    expect(learnCoursePath('python', LEARN_PAGE)).toBe(
      `/app/learn/python?from=${encodeURIComponent(LEARN_PAGE)}`
    );
    expect(learnCoursePath('python', LEARN_PAGE, 1)).toBe(
      `/app/learn/python?from=${encodeURIComponent(LEARN_PAGE)}`
    );
    expect(learnCoursePath('python', LEARN_PAGE, 7)).toBe(
      `/app/learn/python?from=${encodeURIComponent(LEARN_PAGE)}&slide=7`
    );
  });
});
