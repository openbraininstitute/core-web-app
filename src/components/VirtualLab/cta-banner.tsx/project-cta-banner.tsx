'use client';

import { useParams } from 'next/navigation';

import Banner from '@/components/VirtualLab/cta-banner.tsx/banner';

type Props = {
  title: string;
  subtitle: string;
};

export default function NewProjectCTABanner({ title, subtitle }: Props) {
  const { virtualLabId } = useParams<{ virtualLabId: string }>();
  return (
    <Banner
      title={title}
      subtitle={subtitle}
      href={`/app/virtual-lab/lab/${virtualLabId}/project/create`}
    />
  );
}
