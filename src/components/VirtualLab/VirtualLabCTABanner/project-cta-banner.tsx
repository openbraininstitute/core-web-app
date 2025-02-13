'use client';

import { useState } from 'react';
import CTABanner from '@/components/VirtualLab/VirtualLabCTABanner/cta-banner';
import CreationModal from '@/components/VirtualLab/create-entity/project/in-lab';

type Props = {
  id: string;
  title: string;
  subtitle: string;
};

export default function NewProjectCTABanner({ title, subtitle, id }: Props) {
  const [isOpen, setOpen] = useState(false);
  const onOpen = () => setOpen(true);
  const onClose = () => setOpen(false);

  return (
    <>
      <CTABanner title={title} subtitle={subtitle} onClick={onOpen} />
      <CreationModal isOpen={isOpen} virtualLabId={id} onClose={onClose} />
    </>
  );
}
