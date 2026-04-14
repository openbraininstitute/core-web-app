import {
  getExperimentalBoutonDensities,
  getExperimentalBoutonDensity,
} from '@/api/entitycore/queries/experimental/bouton-density';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { IExperimentalBoutonDensity } from '@/api/entitycore/types/entities/bouton-density';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const BoutonDensity: EntityCoreTypeConfig<IExperimentalBoutonDensity> = {
  group: EntityTypeGroup.Experimental,
  title: 'Bouton density',
  description:
    'Number of boutons per axonal length (usually per \u00b5m) for a given cell type. Buttons counts are determined by experimentalist by the number of varicosities observed on the reconstructed axonal branches of a reconstructed morphology. \u00a0This measurement could be used to model the probability of connectivity in a network.',
  extendedType: ExtendedEntitiesTypeDict.ExperimentalBoutonDensity,
  type: EntityTypeDict.ExperimentalBoutonDensity,
  slug: EntitySlug.ExperimentalBoutonDensity,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
    },
    query: {
      list: getExperimentalBoutonDensities,
      one: getExperimentalBoutonDensity,
    },
  },
  asset: {
    extension: 'application/json',
  },
  isBookmarkable: true,
  detailViewSections: [DetailViewSectionsDict.Overview],
  isCopyable: true,
  isSimulatable: false,
  isContributable: true,
  isSingleContributeSupport: true,
  isMultipleContributeSupport: false,
} as const;
