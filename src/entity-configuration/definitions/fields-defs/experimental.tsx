import find from 'lodash/find';
import get from 'lodash/get';

import getMeasurements, {
  EmptyValue,
  renderArray,
  renderEmptyOrValue,
  renderLicense,
  renderMeanStd,
} from '@/entity-configuration/definitions/renderer';
import {
  CoreFieldFilterTypeEnum,
  EntityCoreFields,
} from '@/entity-configuration/definitions/fields-defs/enums';
import { isSingleNeuronSynaptome } from '@/api/entitycore/guards';
import { CoreFieldType } from '@/entity-configuration/definitions/types';
import { ensureArray } from '@/utils/array';

import type { IExperimentalSynapsesPerConnection } from '@/api/entitycore/types/entities/synapses-per-connection';
import type { EntityCoreDensityObjectTypes, EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { FieldsDefinitionRegistry } from '@/entity-configuration/definitions/types';
import type { IEType, IMType } from '@/api/entitycore/types/shared/global';

export const FieldsDefinition: FieldsDefinitionRegistry<EntityCoreObjectTypes> = {
  [EntityCoreFields.License]: {
    title: 'License',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) => {
      if ('license' in r) return renderEmptyOrValue(renderLicense({ license: r.license }));
      return EmptyValue;
    },
    vocabulary: {
      plural: 'Licenses',
      singular: 'License',
    },
    isFilterable: false,
    isDisplayable: true,
  },
  [EntityCoreFields.Species]: {
    title: 'Species',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) => {
      if ('species' in r)
        return renderEmptyOrValue(
          renderArray(ensureArray({ input: r.species }).map((s) => s.name))
        );
      else if ('subject' in r && 'species' in r.subject)
        return renderEmptyOrValue(r.subject.species.name);
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
    isFilterable: true,
    isDisplayable: true,
  },
  [EntityCoreFields.MType]: {
    fieldType: CoreFieldType.CellType,
    title: 'M-Type',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) => {
      if (isSingleNeuronSynaptome(r)) {
        return renderEmptyOrValue(renderArray(r.me_model.mtypes?.map((m) => m.pref_label) || []));
      }
      return renderEmptyOrValue(
        renderArray(
          (r as EntityCoreObjectTypes & { mtypes: Array<IMType> | null }).mtypes?.map(
            (m) => m.pref_label
          ) || []
        )
      );
    },
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
    isFilterable: true,
    isDisplayable: true,
  },
  [EntityCoreFields.EType]: {
    fieldType: CoreFieldType.CellType,
    title: 'E-Type',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) => {
      if (isSingleNeuronSynaptome(r)) {
        return renderEmptyOrValue(renderArray(r.me_model.etypes?.map((m) => m.pref_label) || []));
      }
      return renderEmptyOrValue(
        renderArray(
          (r as EntityCoreObjectTypes & { etypes: Array<IEType> | null }).etypes?.map(
            (m) => m.pref_label
          ) || []
        )
      );
    },
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
    isFilterable: true,
    isDisplayable: true,
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
    isFilterable: false,
    isDisplayable: false,
  },
  [EntityCoreFields.SubjectAge]: {
    title: 'Age',
    filter: CoreFieldFilterTypeEnum.ValueRange,
    render: (r) => renderEmptyOrValue((r as EntityCoreDensityObjectTypes).subject.age_value),
    vocabulary: {
      plural: 'Ages',
      singular: 'Age',
    },
    isFilterable: false,
    isDisplayable: false,
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
    isFilterable: false,
    isSortable: false,
    isDisplayable: true,
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
    isSortable: false,
    isFilterable: false,
    isDisplayable: false,
  },
  [EntityCoreFields.PreSynapticBrainRegion]: {
    title: 'Brain Region [From]',
    render: (r) => {
      return renderEmptyOrValue(
        (r as IExperimentalSynapsesPerConnection).synaptic_pathway.pre_region.name
      );
    },
    vocabulary: {
      plural: 'Brain Region [From]',
      singular: 'Brain Region [From]',
    },
    filter: CoreFieldFilterTypeEnum.CheckList,
    constraint: 'synaptic_pathway__pre_region',
    isFilterable: true,
    isDisplayable: true,
  },
  [EntityCoreFields.PostSynapticBrainRegion]: {
    title: 'Brain Region [To]',
    render: (r) => {
      return renderEmptyOrValue(
        (r as IExperimentalSynapsesPerConnection).synaptic_pathway.post_region.name
      );
    },
    vocabulary: {
      plural: 'Brain Region [To]',
      singular: 'Brain Region [To]',
    },
    filter: CoreFieldFilterTypeEnum.CheckList,
    constraint: 'synaptic_pathway__post_region',
    isFilterable: true,
    isDisplayable: true,
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
    isFilterable: true,
    isDisplayable: true,
  },
  [EntityCoreFields.PostSynapticCellType]: {
    title: 'Cell Type [To]',
    filter: CoreFieldFilterTypeEnum.CheckList,
    render: (r) => {
      return renderEmptyOrValue(
        (r as IExperimentalSynapsesPerConnection).synaptic_pathway.post_mtype.pref_label
      );
    },
    vocabulary: {
      plural: 'Cell Type [To]',
      singular: 'Cell Type [To]',
    },
    isFilterable: true,
    isDisplayable: true,
  },
  [EntityCoreFields.Weight]: {
    title: 'Weight',
    filter: CoreFieldFilterTypeEnum.CheckList,
    unit: 'gramms',
    render: (r) => {
      return renderEmptyOrValue(get(r, 'subject.weight', null));
    },
    vocabulary: {
      plural: 'Values',
      singular: 'Value',
    },
    isSortable: false,
    isFilterable: false,
    isDisplayable: false,
  },
  [EntityCoreFields.NeuronDensity]: {
    title: 'Density',
    filter: CoreFieldFilterTypeEnum.ValueRange,
    unit: '1/mm³',
    render: (r) => {
      const { mean } = getMeasurements(r as EntityCoreDensityObjectTypes);
      return renderEmptyOrValue(Number(mean?.value));
    },
    vocabulary: {
      plural: 'Densities',
      singular: 'Density',
    },
    isSortable: false,
    isFilterable: false,
    isDisplayable: false,
  },
};
