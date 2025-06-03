'use client';

import { useSetAtom } from 'jotai/index';
import dynamic from 'next/dynamic';
import { ReactNode, useLayoutEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import { sectionAtom } from '@/state/application';

import styles from './layout.module.css';

const LiteratureSuggestions = dynamic(() => import('@/components/literature-suggestions'));

type GenericLayoutProps = {
  children: ReactNode;
};

export default function ExploreLayout({ children }: GenericLayoutProps) {
  const setSection = useSetAtom(sectionAtom);

  useLayoutEffect(() => {
    setSection('explore');
  }, []);

  return (
    <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
      <div className={styles.main}>
        <div className={styles.content}>{children}</div>
        <LiteratureSuggestions />
      </div>
    </ErrorBoundary>
  );
}
