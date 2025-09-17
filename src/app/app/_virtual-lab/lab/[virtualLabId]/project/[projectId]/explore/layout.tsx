'use client';

import { ReactNode, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from 'react-error-boundary';
import { useSetAtom } from 'jotai/index';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';
import { sectionAtom } from '@/state/application';

import styles from './layout.module.css';

const AiAssistant = dynamic(() => import('@/components/ai-assistant'));

type GenericLayoutProps = {
  children: ReactNode;
};

export default function ExploreLayout({ children }: GenericLayoutProps) {
  const setSection = useSetAtom(sectionAtom);

  useEffect(() => {
    setSection('explore');
  }, [setSection]);

  return (
    <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
      <div className={styles.main}>
        <div className={styles.content}>{children}</div>
        <HydrateWrapper>
          <AiAssistant section="explore" fullscreen={false} />
        </HydrateWrapper>
      </div>
    </ErrorBoundary>
  );
}
