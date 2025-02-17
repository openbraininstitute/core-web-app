import React from 'react';

// import VerticalRuler from '../../VerticalRuler';
// import Cards from './Cards';
import EmailButton from '../../components/buttons/EmailButton';
import VerticalRuler from '../../components/VerticalRuler';
import { styleBlockLarge } from '../../styles';
import SectionGeneric from '../SectionGeneric';
import { EnumSection } from '../sections';
import { classNames } from '@/util/utils';

import styles from './SectionContact.module.css';

export interface SectionContactProps {
  className?: string;
}

export default function SectionContact({ className }: SectionContactProps) {
  return (
    <>
      <VerticalRuler />
      <div className={classNames(className, styles.sectionContact, styleBlockLarge)}>
        <div className={styles.emails}>
          <EmailButton email="support@openbraininstitute.org">Need some support?</EmailButton>
          <EmailButton email="info@openbraininstitute.org">You have a general inquiry?</EmailButton>
        </div>
      </div>
      <SectionGeneric section={EnumSection.Contact} />
    </>
  );
}
