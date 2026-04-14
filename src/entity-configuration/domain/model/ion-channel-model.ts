import {
  getIonChannelModel,
  getIonChannelModels,
} from '@/api/entitycore/queries/model/ion-channel-model';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { DetailViewSectionsDict } from '@/entity-configuration/definitions/types';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { EntitySlug } from '@/entity-configuration/domain/slug';

import type { IonChannelModel as IIonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import type { EntityCoreTypeConfig } from '@/entity-configuration/domain/types';

export const IonChannelModel: EntityCoreTypeConfig<IIonChannelModel> = {
  group: EntityTypeGroup.Models,
  title: 'Ion channel model',
  description:
    "Ion channel model is a computational model containing the differential equations representing the behavior of a particular ion channel type e.g. voltage-gated potassium channel 1.1 (Kv1.1). Models are built using different formalisms such as [Hodgkin-Huxley](https://en.wikipedia.org/wiki/Hodgkin%E2%80%93Huxley_model#Voltage-gated_ion_channels) formalism, [Markov Channel kinetic formalism](https://en.wikipedia.org/wiki/Markov_model), etc. The model file are built written in [NEURON](https://github.com/neuronsimulator/nrn) simulator's [NMODL](https://nrn.readthedocs.io/en/release-9.0/nmodl/language/nmodl.html) language and have a .mod extension. The model can be inserted into any neuronal model and on different sections of the neuron model such as soma, dendrites, axon, etc.",
  extendedType: ExtendedEntitiesTypeDict.IonChannelModel,
  type: EntityTypeDict.IonChannelModel,
  slug: EntitySlug.IonChannelModel,
  api: {
    config: {
      allowedFacets: true,
      ilikeSearchEnabled: true,
    },
    query: {
      list: (...params) => {
        return getIonChannelModels({
          ...params,
          context: params[0].context,
          withFacets: params[0].withFacets,
          filters: { ...params[0].filters },
        });
      },
      one: getIonChannelModel,
    },
  },
  asset: {
    extension: 'application/json',
  },
  detailViewSections: [DetailViewSectionsDict.Overview, DetailViewSectionsDict.RelatedArtifacts],
  isBookmarkable: false,
  isDownloadable: true,
  isCopyable: true,
  isSimulatable: false,
  isContributable: true,
  isSingleContributeSupport: false,
  isMultipleContributeSupport: false,
} as const;
