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

  return <SanityContentRTF value={content} />;
}
