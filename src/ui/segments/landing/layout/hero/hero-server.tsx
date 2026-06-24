import { getHeroContent } from '@/services/sanity/api/get-hero-content';
import { getSection } from '@/ui/segments/landing/utils';

import HeroClient from './hero-client';

import type { EnumSection } from '@/ui/segments/landing/sections/sections';

interface HeroServerProps {
  className?: string;
  section: EnumSection;
}

export default async function HeroServer({ className, section }: HeroServerProps) {
  const sectionData = getSection(section);
  const slug = sectionData.slug.split('/').pop() || '/';
  const heroData = await getHeroContent(slug);

  return <HeroClient className={className} section={section} data={heroData} />;
}
