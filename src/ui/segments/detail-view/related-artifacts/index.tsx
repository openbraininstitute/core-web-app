import { notFound } from 'next/navigation';
import { match, P } from 'ts-pattern';

import {
  ExtendedEntitiesTypeDict,
  type TExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';
import { ViewVariant } from '@/constants';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { RelatedEntities as EmodelRelatedEntities } from '@/ui/segments/detail-view/related-artifacts/e-model';
import { ICMRelatedArtifacts } from '@/ui/segments/detail-view/related-artifacts/ion-channel-model/index';
import { RelatedEntities as MEModelRelatedEntities } from '@/ui/segments/detail-view/related-artifacts/me-model';
import { RelatedEntities as SynaptomeRelatedEntities } from '@/ui/segments/detail-view/related-artifacts/single-neuron-synaptome';
import { RelatedEntities as SynthesizedMorphologyRelatedEntities } from '@/ui/segments/detail-view/related-artifacts/synthesized-morphology';
import { detailViewVariantFromGroup } from '@/ui/segments/detail-view/variant-styles';
import { RelatedCircuits } from '@/ui/segments/explore/circuit/elements/related-circuits';

import type { ICellMorphology } from '@/api/entitycore/types/entities/cell-morphology';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IEModel } from '@/api/entitycore/types/entities/e-model';
import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import type { IMEModel } from '@/api/entitycore/types/entities/me-model';
import type { ISingleNeuronSynaptome } from '@/api/entitycore/types/entities/single-neuron-synaptome';
import type { TRetrieveEntityOutput } from '@/entity-configuration/domain/requests';
import type { WorkspaceContext } from '@/types/common';

export default async function RelatedArtifacts({
  entity,
  extendedType,
  context,
}: {
  entity: TRetrieveEntityOutput;
  extendedType: TExtendedEntitiesTypeDict;
  context: WorkspaceContext;
}) {
  const entityConfig = getEntityByExtendedType({ type: extendedType });
  const fieldVariant = entityConfig
    ? detailViewVariantFromGroup(entityConfig.group)
    : ViewVariant.Light;

  return match({ entityConfig })
    .with({ entityConfig: { extendedType: ExtendedEntitiesTypeDict.Memodel } }, () => (
      <MEModelRelatedEntities
        memodel={entity as IMEModel}
        context={context}
        variant={fieldVariant}
      />
    ))
    .with(
      { entityConfig: { extendedType: ExtendedEntitiesTypeDict.SingleNeuronSynaptome } },
      () => (
        <SynaptomeRelatedEntities
          synaptome={entity as ISingleNeuronSynaptome}
          context={context}
          variant={fieldVariant}
        />
      )
    )
    .with(
      {
        entityConfig: {
          extendedType: P.union(
            ExtendedEntitiesTypeDict.Circuit,
            ExtendedEntitiesTypeDict.SingleNeuronCircuit,
            ExtendedEntitiesTypeDict.Microcircuit,
            ExtendedEntitiesTypeDict.SmallMicrocircuit,
            ExtendedEntitiesTypeDict.PairedNeuronCircuit,
            ExtendedEntitiesTypeDict.WholeBrain
          ),
        },
      },
      () => <RelatedCircuits circuit={entity as ICircuit} variant={fieldVariant} />
    )
    .with({ entityConfig: { extendedType: ExtendedEntitiesTypeDict.IonChannelModel } }, () => (
      <ICMRelatedArtifacts
        icm={entity as IonChannelModel}
        context={context}
        variant={fieldVariant}
      />
    ))
    .with({ entityConfig: { extendedType: ExtendedEntitiesTypeDict.Emodel } }, () => (
      <EmodelRelatedEntities emodel={entity as IEModel} variant={fieldVariant} />
    ))
    .with(
      { entityConfig: { extendedType: ExtendedEntitiesTypeDict.SynthesizedCellMorphology } },
      () => (
        <SynthesizedMorphologyRelatedEntities
          morphology={entity as ICellMorphology}
          variant={fieldVariant}
        />
      )
    )
    .otherwise(() => notFound());
}
