'use client';

import { createContext, useContext, useEffect, useRef } from 'react';

import { InvitationErrorDialog } from '@/ui/segments/invites/error-dialog';
import { classNames } from '@/util/utils';

import { EnumSection } from './sections/sections';

import styles from './landing-page.module.css';
import './global.css';

import type { ReactNode, RefObject } from 'react';

export type LandingPageError = {
  errorcode: string | undefined;
  originalCode: string | undefined;
  description: string | undefined;
};

const LandingScrollContainerContext = createContext<RefObject<HTMLElement | null> | undefined>(
  undefined
);

export function useLandingScrollContainer(): RefObject<HTMLElement | null> | undefined {
  return useContext(LandingScrollContainerContext);
}

interface LandingPageShellProps {
  className?: string;
  section: EnumSection;
  error?: LandingPageError;
  children: ReactNode;
}

export default function LandingPageShell({
  className,
  section,
  error,
  children,
}: LandingPageShellProps) {
  const isFeatures = section === EnumSection.Features;
  const containerRef = useRef<HTMLDivElement>(null);
  const contextValue = isFeatures ? (containerRef as RefObject<HTMLElement | null>) : undefined;

  useEffect(() => {
    const target = isFeatures ? containerRef.current : window;
    target?.scrollTo({ top: 0, behavior: 'instant' });
  }, [isFeatures]);

  return (
    <div
      ref={containerRef}
      className={classNames(className, styles.landingPage, isFeatures && styles.featuresSnap)}
    >
      <LandingScrollContainerContext.Provider value={contextValue}>
        {children}
      </LandingScrollContainerContext.Provider>
      {error?.errorcode && <InvitationErrorDialog error={error} />}
    </div>
  );
}
