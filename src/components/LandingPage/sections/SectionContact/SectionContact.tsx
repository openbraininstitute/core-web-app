import React from 'react';

import SectionGeneric from '../SectionGeneric';
import { EnumSection } from '../sections';
import Milestones from '../../widgets/milestones';

export default function SectionContact() {
  return (
    <>
      <Milestones />
      <SectionGeneric section={EnumSection.Contact} />
    </>
  );
}
