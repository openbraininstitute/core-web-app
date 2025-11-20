'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';

type EntityNameDisplayProps = {
  name: string;
};

export function EntityNameDisplay({ name }: EntityNameDisplayProps) {
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
      <div className="text-neutral-4 uppercase">Name</div>
      <div className="text-primary-8 line-clamp-3 text-2xl font-bold">{name}</div>
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

  return <div className={shouldHide ? 'h-full' : 'h-[calc(100%-7rem)]'}>{children}</div>;
}
