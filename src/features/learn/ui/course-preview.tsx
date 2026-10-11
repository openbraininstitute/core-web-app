'use client';

import MorphologyFigure from '@/features/learn/components/basics/MorphologyFigure';
import Cortex, { isCortexStep } from '@/features/learn/components/cortex/Cortex';
import CourseFigure from '@/features/learn/components/courses/CourseFigure';
import { isCourseWidget } from '@/features/learn/components/courses/registry';
import { Embedded } from '@/features/learn/components/embedded';
import Heuristics from '@/features/learn/components/heuristics/Heuristics';
import { isStage } from '@/features/learn/components/heuristics/shared';
import { learnFonts } from '@/features/learn/fonts';
import { cn } from '@/utils/css-class';

import type { LearnCourse } from '@/features/learn/catalogue';

/**
 * A course's figure outside its course, live: drawn and played as on its slide, in the OBI look,
 * but kept to its box. Unframed: the card frames it, and the small pictures on the left crop it.
 */
export function CourseFigureLive({
  widget,
  className,
}: {
  widget: LearnCourse['preview'];
  className?: string;
}) {
  return (
    <Embedded value>
      <div className={cn('learn-figure flex flex-col', learnFonts, className)}>
        {isStage(widget) && <Heuristics stage={widget} />}
        {isCourseWidget(widget) && <CourseFigure widget={widget} />}
        {isCortexStep(widget) && <Cortex step={widget} />}
        {widget === 'morphology' && <MorphologyFigure mode="gallery" />}
      </div>
    </Embedded>
  );
}

/** A course's figure on the Learn page's card: framed, so the part to play with reads as one thing. */
export function CoursePreview({ widget }: { widget: LearnCourse['preview'] }) {
  return (
    <CourseFigureLive
      widget={widget}
      className={
        // the Python course's figure is a code panel: it fills the frame, its own edges the frame's
        widget.startsWith('python:')
          ? 'overflow-hidden rounded-[12px] border border-[#d9d9d9] [&_.shadow-sm]:shadow-none'
          : 'rounded-[12px] border border-[#d9d9d9] p-[16px]'
      }
    />
  );
}
