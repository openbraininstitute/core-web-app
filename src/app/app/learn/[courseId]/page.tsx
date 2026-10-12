import { notFound } from 'next/navigation';

import { config } from '@/config';
import { getAllFlags, learnFlag } from '@/features/feature-flags';
import { getLearnCourse, learnHome } from '@/features/learn/catalogue';
import InlineScript from '@/features/learn/components/ui/InlineScript';
import Settings from '@/features/learn/components/ui/Settings';
import SiteBar from '@/features/learn/components/ui/SiteBar';
import { learnFonts } from '@/features/learn/fonts';
import { getLearnSettings } from '@/features/learn/learn-settings-server';
import { SETTINGS_SCRIPT } from '@/features/learn/lib/settings';
import { CourseDeck } from '@/features/learn/ui/course-deck';

import type { Metadata } from 'next';

type Props = {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const course = getLearnCourse((await params).courseId);
  return { title: course ? `${course.title} · Learn` : 'Learn' };
}

/** A Learn course, full screen and drawn as the learn app draws it, outside the project's chrome. */
export default async function Page({ params, searchParams }: Props) {
  const { courseId } = await params;
  const { from, slide } = await searchParams;
  const course = getLearnCourse(courseId);
  const flags = await getAllFlags();
  const { hiddenCourses } = await getLearnSettings();
  if (!course || !flags[learnFlag.key] || hiddenCourses.includes(course.id)) notFound();

  const home = learnHome(config.ROOT_ROUTE, from);
  const startAt = Math.max(0, Math.min(course.slides.length - 1, Number(slide) - 1 || 0));

  return (
    <div
      data-learn-root
      // the inline script puts the saved settings on this element before React hydrates
      suppressHydrationWarning
      className={`learn-root ${learnFonts}`}
    >
      <InlineScript html={SETTINGS_SCRIPT} />
      <SiteBar home={home} />
      <Settings />
      <CourseDeck courseId={course.id} home={home} startAt={startAt} />
    </div>
  );
}
