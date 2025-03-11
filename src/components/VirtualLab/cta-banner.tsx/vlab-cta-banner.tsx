'use client';

import Banner from '@/components/VirtualLab/cta-banner.tsx/banner';

type Props = {
  title: string;
  subtitle: string;
};

export default function NewVLabCTABanner({ title, subtitle }: Props) {
  return <Banner title={title} subtitle={subtitle} href="/app/virtual-lab/lab/create" />;
}
