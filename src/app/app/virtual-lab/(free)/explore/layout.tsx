'use client';

import { ReactNode, useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useSetAtom } from 'jotai/index';
import dynamic from 'next/dynamic';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import { sectionAtom } from '@/state/application';

const LitteratureSuggestions = dynamic(() => import('@/components/literature-suggestions'));

import styles from './layout.module.css';

type GenericLayoutProps = {
  children: ReactNode;
};

export default function ExploreLayout({ children }: GenericLayoutProps) {
  const setSection = useSetAtom(sectionAtom);

  useEffect(() => setSection('explore'), [setSection]);

  return (
    <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
      <div className={styles.main}>
        <div className={styles.content}>{children}</div>
        <LitteratureSuggestions />
      </div>
    </ErrorBoundary>
  );
}
