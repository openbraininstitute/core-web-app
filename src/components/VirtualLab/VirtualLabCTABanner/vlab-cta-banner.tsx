'use client';

import { useState } from 'react';
import CreationModal from '@/components/VirtualLab/create-entity/virtual-lab';
import CTABanner from '@/components/VirtualLab/VirtualLabCTABanner/cta-banner';

type Props = {
  title: string;
  subtitle: string;
};

export default function NewVLabCTABanner({ title, subtitle }: Props) {
  const [isOpen, setOpen] = useState(false);
  const onOpen = () => setOpen(true);
  const onClose = () => setOpen(false);

  return (
    <>
      <CTABanner title={title} subtitle={subtitle} onClick={onOpen} />
      <CreationModal key="create-vlab-cta-banner" isOpen={isOpen} onClose={onClose} />
    </>
  );
}
