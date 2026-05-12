import React from 'react';

import SectionGeneric from '../section-generic';
import { EnumSection } from '../sections';

export default function SectionContact() {
  return (
    <>
      <SectionGeneric section={EnumSection.Contact} />
    </>
  );
}
