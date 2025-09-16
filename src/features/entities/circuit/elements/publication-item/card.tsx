import { Metadata } from '@/features/entities/circuit/elements/publication-item/metadata';
import { Abstract } from '@/features/entities/circuit/elements/publication-item/abstract';
import { Header } from '@/features/entities/circuit/elements/publication-item/header';
import { Authors } from '@/features/entities/circuit/elements/publication-item/authors';
import { Actions } from '@/features/entities/circuit/elements/publication-item/actions';

import type { IPublication } from '@/api/entitycore/types/entities/publication';
import type { ScientificArtifactBase } from '@/api/entitycore/types/entities/scientific-artifact';
import { EmptyValue } from '@/entity-configuration/definitions/renderer';

interface Props {
  publication: IPublication;
  scientificArtifact: ScientificArtifactBase;
}

export function Card({ publication, scientificArtifact }: Props) {
  return (
    <div className="w-full p-2">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <Header title={publication.title!} />
          <Actions doi={publication.DOI} url="" />
        </div>

        <div className="flex items-center gap-4">
          <Authors authors={publication.authors || []} />
          <Metadata
            publisher={scientificArtifact.published_in}
            date={
              scientificArtifact.experiment_date
                ? new Date(scientificArtifact.experiment_date)?.toISOString()
                : EmptyValue
            }
          />
        </div>

        {publication.abstract && <Abstract abstract={publication.abstract} />}
      </div>
    </div>
  );
}
