import { getRTFContent } from '@/services/sanity/api/get-rtf-content';

import SanityContentRTF from '../components/sanity-content-rtf/sanity-content-rtf';
import { getSection } from '../utils';

import type { EnumSection } from './sections';

interface SectionGenericProps {
  section: EnumSection;
}

export default async function SectionGeneric({ section }: SectionGenericProps) {
  const sectionData = getSection(section);
  const slug = sectionData.slug.split('/').pop() || '/';
  const content = await getRTFContent(slug);

  // The public story ends with section 14, "Hosting Virtual Labs for All".
  const storyEnd =
    slug === 'the-real-digital-brain-story'
      ? content.findIndex(
          (item) => item._type === 'titleHeadline' && /^15[.\s]/.test(item.title.trim())
        )
      : -1;
  const visibleContent = storyEnd < 0 ? content : content.slice(0, storyEnd);

  return <SanityContentRTF sectionSlug={slug} value={visibleContent} />;
}
