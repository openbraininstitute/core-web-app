'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { ExpandableText } from '@/ui/molecules/more-less-text';

type EntityNameDisplayProps = {
  name: string;
  description?: string | null;
};

export function EntityNameDisplay({ name, description }: EntityNameDisplayProps) {
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

  return (
    <div className="mb-4">
      <div className="text-primary-8 line-clamp-3 text-2xl font-bold">{name}</div>
      {description && (
        <ExpandableText
          id="entity-description"
          text={description}
          collapsedLines={3}
          className="text-neutral-6 mt-2 text-base leading-6"
          btnWrapperClassName="mt-1"
        >
          {({ isExpanded, toggle }) => (
            <button
              type="button"
              onClick={toggle}
              className="text-primary-7 text-sm underline underline-offset-2"
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
};

export function EntityNameDisplayWrapper({ children }: EntityNameDisplayWrapperProps) {
  const pathname = usePathname();

  // Extract section from pathname (last segment after the entity ID)
  const pathSegments = pathname.split('/').filter(Boolean);
  const currentSection = pathSegments[pathSegments.length - 1] || '';

  // Adjust height based on whether entity name is shown
  const shouldHide =
    currentSection === DetailViewSectionsDict.Analysis ||
    currentSection === DetailViewSectionsDict.RelatedPublications ||
    currentSection === DetailViewSectionsDict.RelatedArtifacts;

  return <div className={shouldHide ? 'h-full' : 'min-h-0 flex-1'}>{children}</div>;
}
