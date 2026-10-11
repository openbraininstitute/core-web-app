'use client';

import { useCallback } from 'react';

import { getLearnCourse } from '@/features/learn/catalogue';
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

  return (
    <Walkthrough
      slides={slides}
      typewriter="titles"
      startAt={startAt}
      home={home}
      onSlide={onSlide}
    />
  );
}
