import { getEmailContent } from '@/services/sanity/api/get-email-content';
import { getHeroContent } from '@/services/sanity/api/get-hero-content';
import { EnumSection } from '@/ui/segments/landing/sections/sections';
import { getSection } from '@/ui/segments/landing/utils';

import HeroClient from './hero-client';

import type { HeroContactEmail } from './hero-client';

interface HeroServerProps {
  className?: string;
  section: EnumSection;
}

export default async function HeroServer({ className, section }: HeroServerProps) {
  const sectionData = getSection(section);
  const slug = sectionData.slug.split('/').pop() || '/';
  const [heroData, support, general] = await Promise.all([
    getHeroContent(slug),
    section === EnumSection.Contact ? getEmailContent('supportEmailButton') : null,
    section === EnumSection.Contact ? getEmailContent('infoEmailButton') : null,
  ]);
  const contactEmails: HeroContactEmail[] = [];
  if (support) contactEmails.push({ ...support, kind: 'support' });
  if (general) contactEmails.push({ ...general, kind: 'general' });

  return (
    <HeroClient
      className={className}
      section={section}
      data={heroData}
      contactEmails={contactEmails}
    />
  );
}
