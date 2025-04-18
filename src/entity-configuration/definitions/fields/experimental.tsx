import find from 'lodash/find';

import getMeasurements, {
  EmptyValue,
  renderArray,
  renderEmptyOrValue,
  renderMeanStd,
} from '@/entity-configuration/definitions/renderer';
import { CoreFieldFilterTypeEnum } from '@/entity-configuration/definitions/fields/enums';
import { EntityCoreFields } from '@/constants/explore-section/fields-config/enums';
import { CoreFieldType } from '@/entity-configuration/definitions/types';
import { ensureArray } from '@/utils/array';

import type { IExperimentalSynapsesPerConnection } from '@/api/entitycore/types/entities/synapses-per-connection';
import type { EntityCoreDensityObjectTypes, EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { CoreFieldDefinitionRegistry } from '@/entity-configuration/definitions/types';
import type { IEType, IMType } from '@/api/entitycore/types/shared/global';

export const FieldConfiguration: CoreFieldDefinitionRegistry<EntityCoreObjectTypes> = {
  [EntityCoreFields.License]: {
    title: 'License',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) => renderEmptyOrValue(r.license?.name),
    vocabulary: {
      plural: 'Licenses',
      singular: 'License',
    },
  },
  [EntityCoreFields.BrainRegion]: {
    title: 'Brain Region',
    filter: null,
    render: (r) => renderEmptyOrValue(r.brain_region.name),
    vocabulary: {
      plural: 'Brain Regions',
      singular: 'Brain Region',
    },
    constraint: 'brain_region_id',
  },
  [EntityCoreFields.Species]: {
    title: 'Species',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) => {
      if ('species' in r)
        return renderEmptyOrValue(
          renderArray(ensureArray({ input: r.species }).map((s) => s.name))
        );
      else if ('species' in r.subject) return renderEmptyOrValue(r.subject.species.name);
      return EmptyValue;
    },
    vocabulary: {
      plural: 'Species',
      singular: 'Species',
    },
    constraint: 'species__name__in',
    order: {
      property: 'species__order_by',
      value: 'name',
    },
    isSortable: false,
  },
  [EntityCoreFields.MType]: {
    fieldType: CoreFieldType.CellType,
    title: 'M-Type',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) =>
      renderEmptyOrValue(
        renderArray(
          (r as EntityCoreObjectTypes & { mtypes: Array<IMType> | null }).mtypes?.map(
            (m) => m.pref_label
          ) || []
        )
      ),
    vocabulary: {
      plural: 'M-Types',
      singular: 'M-Type',
    },
    constraint: 'mtype__pref_label__in',
    order: {
      property: 'mtype__order_by',
      value: 'pref_label',
    },
    isSortable: false,
  },
  [EntityCoreFields.EType]: {
    fieldType: CoreFieldType.CellType,
    title: 'E-Type',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) =>
      renderEmptyOrValue(
        renderArray(
          (r as EntityCoreObjectTypes & { etype: Array<IEType> | null }).mtypes?.map(
            (m) => m.pref_label
          ) || []
        )
      ),
    vocabulary: {
      plural: 'E-Types',
      singular: 'E-Type',
    },
    constraint: 'etype__pref_label__in',
    order: {
      property: 'etype__order_by',
      value: 'pref_label',
    },
    isSortable: false,
  },
  [EntityCoreFields.NumberOfMeasurements]: {
    title: 'N° of Measurements',
    filter: CoreFieldFilterTypeEnum.ValueRange,
    render: (r) => {
      return renderEmptyOrValue(
        find(ensureArray({ input: (r as EntityCoreDensityObjectTypes).measurements }), {
          unit: 'dimensionless',
        })?.value
      );
    },
    vocabulary: {
      plural: 'Values',
      singular: 'Value',
    },
    isSortable: false,
  },
  [EntityCoreFields.SubjectAge]: {
    title: 'Age',
    filter: CoreFieldFilterTypeEnum.ValueRange,
    render: (r) => renderEmptyOrValue((r as EntityCoreDensityObjectTypes).subject.age_value),
    vocabulary: {
      plural: 'Ages',
      singular: 'Age',
    },
  },
  [EntityCoreFields.MeanSTD]: {
    title: 'Mean ± STD',
    unit: (
      <>
        µm<sup>-1</sup>
      </>
    ),
    filter: CoreFieldFilterTypeEnum.ValueRange,
    render: (r) => {
      const { mean, std } = getMeasurements(r as EntityCoreDensityObjectTypes);
      return renderMeanStd({ mean, std });
    },
    vocabulary: {
      plural: 'Values',
      singular: 'Value',
    },
  },
  [EntityCoreFields.Sem]: {
    title: 'SEM',
    description: 'Standard error of the mean',
    filter: CoreFieldFilterTypeEnum.ValueRange,
    render: (r) => {
      const { se } = getMeasurements(r as EntityCoreDensityObjectTypes);
      return renderEmptyOrValue(Number(se?.value));
    },
    vocabulary: {
      plural: 'Values',
      singular: 'Value',
    },
  },
  [EntityCoreFields.PreSynapticBrainRegion]: {
    title: 'Brain Region [From]',
    render: (r) => {
      return renderEmptyOrValue(
        (r as IExperimentalSynapsesPerConnection).synaptic_pathway.pre_region.name
      );
    },
    filter: CoreFieldFilterTypeEnum.CheckList,
    vocabulary: {
      plural: 'Brain Region [From]',
      singular: 'Brain Region [From]',
    },
  },
  [EntityCoreFields.PostSynapticBrainRegion]: {
    title: 'Brain Region [To]',
    render: (r) => {
      return renderEmptyOrValue(
        (r as IExperimentalSynapsesPerConnection).synaptic_pathway.post_region.name
      );
    },
    filter: CoreFieldFilterTypeEnum.CheckList,
    vocabulary: {
      plural: 'Brain Region [To]',
      singular: 'Brain Region [To]',
    },
  },
  [EntityCoreFields.PreSynapticCellType]: {
    title: 'Cell Type [From]',
    render: (r) => {
      return renderEmptyOrValue(
        (r as IExperimentalSynapsesPerConnection).synaptic_pathway.pre_mtype.pref_label
      );
    },
    filter: CoreFieldFilterTypeEnum.CheckList,
    vocabulary: {
      plural: 'Cell Type [From]',
      singular: 'Cell Type [From]',
    },
  },
  [EntityCoreFields.PostSynapticCellType]: {
    title: 'Cell Type [To]',
    render: (r) => {
      return renderEmptyOrValue(
        (r as IExperimentalSynapsesPerConnection).synaptic_pathway.post_mtype.pref_label
      );
    },
    filter: CoreFieldFilterTypeEnum.CheckList,
    vocabulary: {
      plural: 'Cell Type [To]',
      singular: 'Cell Type [To]',
    },
  },
};
