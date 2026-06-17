import { Abstract } from '@/ui/segments/explore/circuit/elements/publication-item/abstract';
import { Actions } from '@/ui/segments/explore/circuit/elements/publication-item/actions';
import { Authors } from '@/ui/segments/explore/circuit/elements/publication-item/authors';
import { Header } from '@/ui/segments/explore/circuit/elements/publication-item/header';
import { Metadata } from '@/ui/segments/explore/circuit/elements/publication-item/metadata';

import type { IPublication } from '@/api/entitycore/types/entities/publication';
import type { ScientificArtifactBase } from '@/api/entitycore/types/entities/scientific-artifact';

interface Props {
  publication: IPublication;
  scientificArtifact: ScientificArtifactBase;
  className?: string;
}

export function Card({ publication, scientificArtifact, className }: Props) {
  return (
    <div className={className ?? 'w-full p-2'}>
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <Header title={publication.title!} />
          <Actions doi={publication.DOI} url="" />
        </div>

        <div className="flex items-center gap-4">
          <Authors authors={publication.authors || []} />
          <Metadata
            publisher={scientificArtifact.published_in}
            date={scientificArtifact.experiment_date}
          />
        </div>

        {publication.abstract && <Abstract abstract={publication.abstract} />}
      </div>
    </div>
  );
}
