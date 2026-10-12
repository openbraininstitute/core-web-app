'use client';

import { useCallback } from 'react';

import { getLearnCourse, learnCoursePath } from '@/features/learn/catalogue';
import Walkthrough from '@/features/learn/components/walkthrough/Walkthrough';
import { recordSlide } from '@/features/learn/progress';

/** A course's slides, full screen, keeping the learner's place as they go. */
export function CourseDeck({
  courseId,
  home,
  startAt,
}: {
  courseId: string;
  home: string;
  startAt: number;
}) {
  const slides = getLearnCourse(courseId)?.slides ?? [];
  const onSlide = useCallback(
    (index: number) => recordSlide(courseId, index, slides.length),
    [courseId, slides.length]
  );
  // a closing slide's link: to another course, leading back to the Learn page with that one chosen;
  // or, naming none, to the Learn page itself
  const ctaHref = useCallback(
    (course?: string) => {
      if (!course) return home;
      const learnPage = home.split('?')[0];
      return learnCoursePath(
        course,
        learnPage.endsWith('/learn') ? `${learnPage}?course=${course}` : home
      );
    },
    [home]
  );

  return (
    <Walkthrough
      slides={slides}
      typewriter="titles"
      startAt={startAt}
      home={home}
      onSlide={onSlide}
      ctaHref={ctaHref}
    />
  );
}
