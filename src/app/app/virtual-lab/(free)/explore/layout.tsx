'use client';

import { useSetAtom } from 'jotai/index';
import dynamic from 'next/dynamic';
import { ReactNode, useLayoutEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import { sectionAtom } from '@/state/application';

import styles from './layout.module.css';

const AIAssistant = dynamic(() => import('@/components/ai-assistant'));

type GenericLayoutProps = {
  children: ReactNode;
};

export default function ExploreLayout({ children }: GenericLayoutProps) {
  const setSection = useSetAtom(sectionAtom);

  useLayoutEffect(() => {
    setSection('explore');
  }, [setSection]);

  return (
    <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
      <div className={styles.main}>
        <div className={styles.content}>{children}</div>
        <AIAssistant />
      </div>
    </ErrorBoundary>
  );
}
