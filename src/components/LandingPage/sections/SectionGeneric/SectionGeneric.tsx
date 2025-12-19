import SanityContentRTF from '../../components/SanityContentRTF';
import { useSanityContentRTF } from '../../content/content';
import type { EnumSection } from '../sections';

interface GenericSectionProps {
  section: EnumSection;
}

export default function SectionGeneric({ section }: GenericSectionProps) {
  const content = useSanityContentRTF(section);

  return <SanityContentRTF value={content} />;
}
