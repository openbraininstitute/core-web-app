'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { ExpandableText } from '@/ui/molecules/more-less-text';

type EntityNameDisplayProps = {
  name: string;
  description?: string | null;
  variant?: 'light' | 'onPrimary';
};

export function EntityNameDisplay({
  name,
  description,
  variant = 'onPrimary',
}: EntityNameDisplayProps) {
  const pathname = usePathname();

  // Extract section from pathname (last segment after the entity ID)
  const pathSegments = pathname.split('/').filter(Boolean);
  const currentSection = pathSegments[pathSegments.length - 1] || '';

  // Only show entity name for Overview section
  // Hide it for Analysis, RelatedPublications, and RelatedArtifacts
  const shouldHide =
    currentSection === DetailViewSectionsDict.Analysis ||
    currentSection === DetailViewSectionsDict.RelatedPublications ||
    currentSection === DetailViewSectionsDict.RelatedArtifacts;

  if (shouldHide) {
    return null;
  }

  if (variant === 'light') {
    return (
      <div className="mb-4">
        <div className="text-neutral-4 uppercase">Name</div>
        <div className="text-primary-8 line-clamp-3 text-2xl font-bold">{name}</div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="line-clamp-3 text-2xl font-bold text-white">{name}</div>
      {description && (
        <ExpandableText
          id="entity-description"
          text={description}
          collapsedLines={3}
          className="text-primary-3 mt-2 text-base leading-6"
          btnWrapperClassName="mt-1"
        >
          {({ isExpanded, toggle }) => (
            <button
              type="button"
              onClick={toggle}
              className="text-sm text-white/90 underline decoration-white/40 underline-offset-2 hover:text-white"
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </ExpandableText>
      )}
    </div>
  );
}

type EntityNameDisplayWrapperProps = {
  children: ReactNode;
  variant?: 'light' | 'onPrimary';
};

export function EntityNameDisplayWrapper({
  children,
  variant = 'onPrimary',
}: EntityNameDisplayWrapperProps) {
  const pathname = usePathname();

  // Extract section from pathname (last segment after the entity ID)
  const pathSegments = pathname.split('/').filter(Boolean);
  const currentSection = pathSegments[pathSegments.length - 1] || '';

  // Adjust height based on whether entity name is shown
  const shouldHide =
    currentSection === DetailViewSectionsDict.Analysis ||
    currentSection === DetailViewSectionsDict.RelatedPublications ||
    currentSection === DetailViewSectionsDict.RelatedArtifacts;

  return (
    <div
      className={
        shouldHide ? 'h-full' : variant === 'light' ? 'h-[calc(100%-7rem)]' : undefined
      }
    >
      {children}
    </div>
  );
}
