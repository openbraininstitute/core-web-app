import { renderEmptyOrValue, renderArray } from './renderer';
import License from '@/components/explore-section/License';
import {
  selectorFnBasic,
  selectorFnBrainRegion,
  selectorFnLayer,
  selectorFnLayerThickness,
  selectorFnMeanStd,
  selectorFnSpecies,
  selectorFnStatistic,
  selectorFnSynaptic,
} from '@/util/explore-section/listing-selectors';
import {
  eTypeSelectorFn,
  mTypeSelectorFn,
  selectorFnStatisticDetail,
  semSelectorFn,
} from '@/util/explore-section/selector-functions';
import Species from '@/components/explore-section/Species';
import WeightField from '@/components/explore-section/Fields/WeightField';
import SubjectAgeField from '@/components/explore-section/Fields/SubjectAgeField';
import LayerThicknessField from '@/components/explore-section/Fields/LayerThicknessField';
import MeanStdField from '@/components/explore-section/Fields/MeanStdField';
import {
  ExploreFieldsConfigProps,
  FieldType,
} from '@/constants/explore-section/fields-config/types';
import { StructuralDomain } from '@/types/explore-section/es-experiment';
import {
  ExperimentalBoutonDensity,
  ExperimentalLayerThickness,
  ExperimentalNeuronDensity,
  ExperimentalSynapsesPerConnection,
  ExperimentalTrace,
  Experiment as DeltaExperiment,
  EntityCore,
} from '@/types/explore-section/delta-experiment';
import { SynapticPosition, SynapticType } from '@/types/explore-section/misc';
import { FilterTypeEnum } from '@/types/explore-section/filters';
import { EntityCoreFields, Field } from '@/constants/explore-section/fields-config/enums';
import { DisplayMessages } from '@/constants/display-messages';
import { getEtypeFromEModel, getMtypeFromMModel } from '@/util/modelMEtypes';
import { EModel, NeuronMorphology } from '@/types/e-model';
import { ensureArray } from '@/util/nexus';
import { renderEmptyOrValue, renderArray } from './renderer';
import { IReconstructionMorphologyExpanded } from '@/api/entitycore/types/entities/reconstruction-morphology';
import { renderMorphologyMeasurement } from '@/entity-configuration/definitions/renderer';

export const EXPERIMENTAL_DATA_FIELDS_CONFIG: ExploreFieldsConfigProps<DeltaExperiment> = {
  [Field.License]: {
    title: 'License',
    filter: FilterTypeEnum.CheckList,
    render: {
      deltaResourceViewFn: () => <License />,
    },
    vocabulary: {
      plural: 'Licenses',
      singular: 'License',
    },
  },
  [Field.BrainRegion]: {
    esTerms: {
      flat: {
        filter: 'brainRegion.label.keyword',
        aggregation: 'brainRegion.label.keyword',
        sort: 'brainRegion.label.keyword',
      },
    },
    title: 'Brain Region',
    filter: null,
    render: {
      esResourceViewFn: selectorFnBrainRegion,
      deltaResourceViewFn: (r) => selectorFnBasic(r.brainLocation?.brainRegion.label),
    },
    vocabulary: {
      plural: 'Brain Regions',
      singular: 'Brain Region',
    },
  },
  [Field.EType]: {
    fieldType: FieldType.CellType,
    esTerms: {
      flat: {
        filter: 'eType.label.keyword',
        aggregation: 'eType.label.keyword',
        sort: 'eType.label.keyword',
      },
    },
    title: 'E-Type',
    filter: FilterTypeEnum.CheckList,
    render: {
      esResourceViewFn: (_t, r) => selectorFnBasic(r._source?.eType?.label),
      deltaResourceViewFn: (resource) => {
        if ('linkedEModel' in resource) {
          return selectorFnBasic(getEtypeFromEModel(resource.linkedEModel as EModel));
        }
        return eTypeSelectorFn(
          resource as ExperimentalBoutonDensity | ExperimentalNeuronDensity | ExperimentalTrace
        );
      },
    },
    vocabulary: {
      plural: 'E-Types',
      singular: 'E-Type',
    },
  },
  [Field.MType]: {
    fieldType: FieldType.CellType,
    esTerms: {
      flat: {
        filter: 'mType.label.keyword',
        aggregation: 'mType.label.keyword',
        sort: 'mType.label.keyword',
      },
    },
    title: 'M-Type',
    filter: FilterTypeEnum.CheckList,
    render: {
      esResourceViewFn: (_t, r) => {
        return selectorFnBasic(r._source?.mType?.label);
      },
      deltaResourceViewFn: (resource) => {
        if ('linkedMModel' in resource) {
          return selectorFnBasic(getMtypeFromMModel(resource.linkedMModel as NeuronMorphology));
        }
        return mTypeSelectorFn(
          resource as ExperimentalBoutonDensity | ExperimentalNeuronDensity | ExperimentalTrace
        );
      },
    },
    vocabulary: {
      plural: 'M-Types',
      singular: 'M-Type',
    },
  },
  [Field.SubjectSpecies]: {
    esTerms: {
      flat: {
        filter: 'subjectSpecies.label.keyword',
        aggregation: 'subjectSpecies.label.keyword',
        sort: 'subjectSpecies.label.keyword',
      },
    },
    title: 'Species',
    filter: FilterTypeEnum.CheckList,
    render: {
      esResourceViewFn: (_t, r) => selectorFnSpecies(r._source?.subjectSpecies),
      deltaResourceViewFn: () => <Species />,
    },
    vocabulary: {
      plural: 'Species',
      singular: 'Species',
    },
  },
  [Field.Sem]: {
    esTerms: {
      nested: {
        nestedPath: 'series',
        filterTerm: 'series.statistic.keyword',
        filterValue: 'standard error of the mean',
        aggregationName: 'standard error of the mean',
        aggregationField: 'series.value',
      },
    },
    title: 'SEM',
    description: 'Standard error of the mean',
    filter: FilterTypeEnum.ValueRange,
    render: {
      esResourceViewFn: (_t, r) => selectorFnStatistic(r._source, 'standard error of the mean'),
      deltaResourceViewFn: (resource) =>
        semSelectorFn(
          resource as
            | ExperimentalBoutonDensity
            | ExperimentalLayerThickness
            | ExperimentalSynapsesPerConnection
        ),
    },
    vocabulary: {
      plural: 'Values',
      singular: 'Value',
    },
  },
  [Field.Weight]: {
    title: 'Weight',
    filter: FilterTypeEnum.CheckList,
    unit: 'gramms',
    render: {
      esResourceViewFn: (_t, r) => selectorFnBasic(r._source?.weight),
      deltaResourceViewFn: (resource) => <WeightField detail={resource} />,
    },
    vocabulary: {
      plural: 'Values',
      singular: 'Value',
    },
  },
  [Field.SubjectAge]: {
    title: 'Age',
    filter: FilterTypeEnum.ValueRange,
    esTerms: {
      flat: {
        filter: 'subjectAge.value',
        aggregation: 'subjectAge.value',
        sort: 'subjectAge.value.minValue',
      },
    },
    render: {
      esResourceViewFn: (_t, r) => selectorFnBasic(r._source?.subjectAge?.label),
      deltaResourceViewFn: () => <SubjectAgeField />,
    },
    vocabulary: {
      plural: 'Ages',
      singular: 'Age',
    },
  },
  [Field.NeuronDensity]: {
    esTerms: {
      nested: {
        nestedPath: 'series',
        filterTerm: 'series.statistic.keyword',
        filterValue: 'mean',
        aggregationName: 'mean',
        aggregationField: 'series.value',
      },
    },
    title: 'Density',
    filter: FilterTypeEnum.ValueRange,
    unit: '1/mm³',
    render: {
      esResourceViewFn: (_t, r) => selectorFnStatistic(r._source, 'mean'),
      deltaResourceViewFn: (resource) =>
        selectorFnStatisticDetail(
          resource as
            | ExperimentalBoutonDensity
            | ExperimentalLayerThickness
            | ExperimentalSynapsesPerConnection,
          'mean',
          true
        ),
    },
    vocabulary: {
      plural: 'Densities',
      singular: 'Density',
    },
  },
  [Field.Layer]: {
    title: 'Layer',
    filter: FilterTypeEnum.CheckList,
    render: {
      esResourceViewFn: selectorFnLayer,
      deltaResourceViewFn: (resource) => resource.brainLocation?.layer?.label,
    },
    vocabulary: {
      plural: 'Layers',
      singular: 'Layer',
    },
  },
  [Field.LayerThickness]: {
    esTerms: {
      flat: {
        filter: 'layerThickness.value',
        aggregation: 'layerThickness.value',
        sort: 'layerThickness.value',
      },
    },
    title: 'Thickness',
    filter: FilterTypeEnum.ValueRange,
    unit: 'μm',
    render: {
      esResourceViewFn: selectorFnLayerThickness,
      deltaResourceViewFn: (resource) => (
        <LayerThicknessField
          detail={
            resource as
              | ExperimentalBoutonDensity
              | ExperimentalLayerThickness
              | ExperimentalNeuronDensity
              | ExperimentalSynapsesPerConnection
          }
        />
      ),
    },
    vocabulary: {
      plural: 'Thicknesses',
      singular: 'Thickness',
    },
  },
  [Field.Reference]: {
    title: 'Reference',
    filter: FilterTypeEnum.CheckList,
    render: {
      esResourceViewFn: (_t, r) => selectorFnBasic(r._source?.reference),
    },
    vocabulary: {
      plural: 'References',
      singular: 'Reference',
    },
  },
  [Field.Conditions]: {
    title: 'Conditions',
    filter: FilterTypeEnum.CheckList,
    unit: 'Cº',
    render: {
      esResourceViewFn: (_t, r) => selectorFnBasic(r._source?.conditions),
    },
    vocabulary: {
      plural: 'Conditions',
      singular: 'Condition',
    },
  },
  [Field.MeanSTD]: {
    esTerms: {
      nested: {
        nestedPath: 'series',
        filterTerm: 'series.statistic.keyword',
        filterValue: 'mean',
        aggregationName: 'mean',
        aggregationField: 'series.value',
      },
    },
    title: 'Mean ± STD',
    unit: (
      <>
        µm<sup>-1</sup>
      </>
    ),
    filter: FilterTypeEnum.ValueRange,
    render: {
      esResourceViewFn: selectorFnMeanStd,
      deltaResourceViewFn: (resource) => (
        <MeanStdField
          detail={
            resource as
              | ExperimentalBoutonDensity
              | ExperimentalLayerThickness
              | ExperimentalNeuronDensity
              | ExperimentalSynapsesPerConnection
          }
        />
      ),
    },
    vocabulary: {
      plural: 'Values',
      singular: 'Value',
    },
  },
  [Field.NumberOfMeasurements]: {
    esTerms: {
      nested: {
        nestedPath: 'series',
        filterTerm: 'series.statistic.keyword',
        filterValue: 'N',
        aggregationName: 'N',
        aggregationField: 'series.value',
      },
    },
    title: 'N° of Measurements',
    filter: FilterTypeEnum.ValueRange,
    render: {
      esResourceViewFn: (_t, r) => selectorFnStatistic(r._source, 'N'),
      deltaResourceViewFn: (resource) =>
        selectorFnStatisticDetail(
          resource as
            | ExperimentalBoutonDensity
            | ExperimentalLayerThickness
            | ExperimentalSynapsesPerConnection,
          'N'
        ),
    },
    vocabulary: {
      plural: 'Values',
      singular: 'Value',
    },
  },
  [Field.NumberOfConnections]: {
    esTerms: {
      nested: {
        nestedPath: 'series',
        filterTerm: 'series.statistic.keyword',
        filterValue: 'N',
        aggregationName: 'N',
        aggregationField: 'series.value',
      },
    },
    title: 'N° of Connections',
    filter: FilterTypeEnum.ValueRange,
    render: {
      esResourceViewFn: (_t, r) => selectorFnStatistic(r._source, 'N synapses'),
      deltaResourceViewFn: (resource) =>
        selectorFnStatisticDetail(
          resource as
            | ExperimentalBoutonDensity
            | ExperimentalLayerThickness
            | ExperimentalSynapsesPerConnection,
          'N synapses'
        ),
    },
    vocabulary: {
      plural: 'Values',
      singular: 'Value',
    },
  },
  [Field.Length]: {
    title: 'length',
    filter: null,
    vocabulary: {
      plural: 'length',
      singular: 'length',
    },
  },
  [Field.MaximumLength]: {
    title: 'maximum length',
    filter: null,
    vocabulary: {
      plural: 'maximum length',
      singular: 'maximum length',
    },
  },
  [Field.TotalLength]: {
    title: 'total length',
    filter: null,
    vocabulary: {
      plural: 'total length',
      singular: 'total length',
    },
  },
  [Field.DendriteStemming]: {
    title: 'dendrites stemming from soma',
    filter: null,
    vocabulary: {
      plural: 'dendrites stemming from soma',
      singular: 'dendrite stemming from soma',
    },
  },
  [Field.Axon]: {
    title: 'axon',
    filter: null,
    vocabulary: {
      plural: 'axon',
      singular: 'axons',
    },
  },
  [Field.Bifurcations]: {
    title: 'bifurcations',
    filter: null,
    vocabulary: {
      plural: 'bifurcation',
      singular: 'bifurcations',
    },
  },
  [Field.PreSynapticBrainRegion]: {
    title: 'Brain Region [From]',
    render: {
      esResourceViewFn: (_text, r) =>
        selectorFnSynaptic(r._source, SynapticPosition.Pre, SynapticType.BrainRegion),
      deltaResourceViewFn: (resource) =>
        (resource as ExperimentalSynapsesPerConnection).synapticPathway?.preSynaptic.find(
          (synapse) => synapse.about === 'nsg:BrainRegion'
        )?.label,
    },
    filter: FilterTypeEnum.CheckList,
    esTerms: {
      nested: {
        nestedPath: 'preSynapticPathway',
        filterTerm: 'preSynapticPathway.about.keyword',
        filterValue: 'https://neuroshapes.org/BrainRegion',
        aggregationName: 'label',
        aggregationField: 'preSynapticPathway.label.keyword',
      },
    },
    vocabulary: {
      plural: 'Brain Region [From]',
      singular: 'Brain Region [From]',
    },
  },
  [Field.PostSynapticBrainRegion]: {
    title: 'Brain Region [To]',
    render: {
      esResourceViewFn: (_text, r) =>
        selectorFnSynaptic(r._source, SynapticPosition.Post, SynapticType.BrainRegion),
      deltaResourceViewFn: (resource) =>
        (resource as ExperimentalSynapsesPerConnection).synapticPathway?.postSynaptic.find(
          (synapse) => synapse.about === 'nsg:BrainRegion'
        )?.label,
    },
    filter: FilterTypeEnum.CheckList,
    esTerms: {
      nested: {
        nestedPath: 'postSynapticPathway',
        filterTerm: 'postSynapticPathway.about.keyword',
        filterValue: 'https://neuroshapes.org/BrainRegion',
        aggregationName: 'label',
        aggregationField: 'postSynapticPathway.label.keyword',
      },
    },
    vocabulary: {
      plural: 'Brain Region [To]',
      singular: 'Brain Region [To]',
    },
  },
  [Field.PreSynapticCellType]: {
    title: 'Cell Type [From]',
    render: {
      esResourceViewFn: (_text, r) =>
        selectorFnSynaptic(r._source, SynapticPosition.Pre, SynapticType.CellType),
      deltaResourceViewFn: (resource) =>
        (resource as ExperimentalSynapsesPerConnection).synapticPathway?.preSynaptic.find(
          (synapse) => synapse.about === 'BrainCell:Type'
        )?.label || DisplayMessages.NO_DATA_STRING,
    },
    filter: FilterTypeEnum.CheckList,
    esTerms: {
      nested: {
        nestedPath: 'preSynapticPathway',
        filterTerm: 'preSynapticPathway.about.keyword',
        filterValue: 'https://bbp.epfl.ch/ontologies/core/bmo/BrainCellType',
        aggregationName: 'label',
        aggregationField: 'preSynapticPathway.label.keyword',
      },
    },
    vocabulary: {
      plural: 'Cell Type [From]',
      singular: 'Cell Type [From]',
    },
  },
  [Field.PostSynapticCellType]: {
    title: 'Cell Type [To]',
    render: {
      esResourceViewFn: (_text, r) =>
        selectorFnSynaptic(r._source, SynapticPosition.Post, SynapticType.CellType),
      deltaResourceViewFn: (resource) =>
        (resource as ExperimentalSynapsesPerConnection).synapticPathway?.postSynaptic.find(
          (synapse) => synapse.about === 'BrainCell:Type'
        )?.label || DisplayMessages.NO_DATA_STRING,
    },
    filter: FilterTypeEnum.CheckList,
    esTerms: {
      nested: {
        nestedPath: 'postSynapticPathway',
        filterTerm: 'postSynapticPathway.about.keyword',
        filterValue: 'https://bbp.epfl.ch/ontologies/core/bmo/BrainCellType',
        aggregationName: 'label',
        aggregationField: 'postSynapticPathway.label.keyword',
      },
    },
    vocabulary: {
      plural: 'Cell Type [To]',
      singular: 'Cell Type [To]',
    },
  },

  // Morphometric fields
  [Field.AxonTotalLength]: {
    group: StructuralDomain.Axon,
    title: 'Total Length',
    description: 'Total length of the axon',
    filter: null,
    vocabulary: {
      plural: 'Total Length',
      singular: 'Total Length',
    },
    render: (r) =>
      renderMorphologyMeasurement(r, StructuralDomain.Axon, 'total_length', 'raw', true),
  },
  [Field.AxonStrahlerNumber]: {
    group: StructuralDomain.Axon,
    title: 'Strahler number',
    description: 'Strahler number',
    filter: null,
    vocabulary: {
      plural: 'Strahler number',
      singular: 'Strahler number',
    },
    render: (r) =>
      renderMorphologyMeasurement(r, StructuralDomain.Axon, 'section_strahler_orders', 'maximum'),
  },
  [Field.AxonArborAsymmetryIndex]: {
    group: StructuralDomain.Axon,
    title: 'Arbor Asymmetry Index',
    description: 'Arbor asymmetry index (if calculated)',
    filter: null,
    vocabulary: {
      plural: 'Arbor Asymmetry Index',
      singular: 'Arbor Asymmetry Index',
    },
    render: (r) =>
      renderMorphologyMeasurement(r, StructuralDomain.Axon, 'partition_asymmetry', 'mean'),
  },
  [Field.BasalDendriticTotalLength]: {
    group: StructuralDomain.BasalDendrite,
    title: 'Total Length',
    description: 'Total length of the basal dendrites',
    filter: null,
    vocabulary: {
      plural: 'Total Length',
      singular: 'Total Length',
    },
    render: (r) =>
      renderMorphologyMeasurement(r, StructuralDomain.BasalDendrite, 'total_length', 'raw', true),
  },
  [Field.BasalDendriteStrahlerNumber]: {
    group: StructuralDomain.BasalDendrite,
    title: 'Strahler number',
    description: 'Strahler number',
    filter: null,
    vocabulary: {
      plural: 'Strahler number',
      singular: 'Strahler number',
    },
    render: (r) =>
      renderMorphologyMeasurement(
        r,
        StructuralDomain.BasalDendrite,
        'section_strahler_orders',
        'maximum'
      ),
  },
  [Field.BasalArborAsymmetryIndex]: {
    group: StructuralDomain.BasalDendrite,
    title: 'Arbor Asymmetry Index',
    description: 'Basal Arbor asymmetry index (if calculated)',
    filter: null,
    vocabulary: {
      plural: 'Arbor Asymmetry Index',
      singular: 'Arbor Asymmetry Index',
    },
    render: (r) =>
      renderMorphologyMeasurement(r, StructuralDomain.BasalDendrite, 'partition_asymmetry', 'mean'),
  },
  [Field.ApicalDendriticTotalLength]: {
    group: StructuralDomain.ApicalDendrite,
    title: 'Total Length',
    description: 'Total length of the apical dendrites',
    filter: null,
    vocabulary: {
      plural: 'Total Length',
      singular: 'Total Length',
    },
    render: (r) =>
      renderMorphologyMeasurement(r, StructuralDomain.ApicalDendrite, 'Total Length', 'raw', true),
  },
  [Field.ApicalDendtriteStrahlerNumber]: {
    group: StructuralDomain.ApicalDendrite,
    title: 'Strahler number',
    description: 'Apical Dendrite Strahler number',
    filter: null,
    vocabulary: {
      plural: 'Strahler number',
      singular: 'Strahler number',
    },
    render: (r) =>
      renderMorphologyMeasurement(
        r,
        StructuralDomain.ApicalDendrite,
        'section_strahler_orders',
        'maximum'
      ),
  },
  [Field.ApicalArborAsymmetryIndex]: {
    group: StructuralDomain.ApicalDendrite,
    title: 'Arbor Asymmetry Index',
    description: 'Apical Arbor asymmetry index (if calculated)',
    filter: null,
    vocabulary: {
      plural: 'Arbor Asymmetry Index',
      singular: 'Arbor Asymmetry Index',
    },
    render: (r) =>
      renderMorphologyMeasurement(
        r,
        StructuralDomain.ApicalDendrite,
        'partition_asymmetry',
        'mean'
      ),
  },
  [Field.NeuronMorphologyWidth]: {
    group: StructuralDomain.NeuronMorphology,
    title: 'Total Width',
    description: 'Neuron morphology total width',
    filter: null,
    vocabulary: {
      plural: 'Total Width',
      singular: 'Total Width',
    },
    render: (r) =>
      renderMorphologyMeasurement(r, StructuralDomain.NeuronMorphology, 'total_width', 'raw', true),
  },
  [Field.NeuronMorphologyHeight]: {
    group: StructuralDomain.NeuronMorphology,
    title: 'Total Height',
    description: 'Neuron morphology total height',
    filter: null,
    vocabulary: {
      plural: 'Total Height',
      singular: 'Total Height',
    },
    render: (r) =>
      renderMorphologyMeasurement(
        r,
        StructuralDomain.NeuronMorphology,
        'total_height',
        'raw',
        true
      ),
  },
  [Field.NeuronMorphologyDepth]: {
    group: StructuralDomain.NeuronMorphology,
    title: 'Total Depth',
    description: 'Neuron morphology total depth',
    filter: null,
    vocabulary: {
      plural: 'Total Depth',
      singular: 'Total Depth',
    },
    render: (r) =>
      renderMorphologyMeasurement(r, StructuralDomain.NeuronMorphology, 'total_depth', 'raw', true),
  },
  [Field.SomaDiameter]: {
    group: StructuralDomain.Soma,
    title: 'Diameter',
    description: 'Diameter of the soma',
    filter: null,
    vocabulary: {
      plural: 'Diameter',
      singular: 'Diameter',
    },
    render: (r) => renderMorphologyMeasurement(r, 'Soma', 'soma_radius', 'raw', true),
  },
};

export const ENTITY_CORE_EXPERIMENTAL_DATA_FIELDS_CONFIG: ExploreFieldsConfigProps<EntityCore> = {
  [EntityCoreFields.License]: {
    title: 'License',
    filter: FilterTypeEnum.CheckList,
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
    filter: FilterTypeEnum.CheckList,
    render: (r) => renderEmptyOrValue(renderArray(ensureArray(r.species).map((s) => s.name))),
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
    fieldType: FieldType.CellType,
    title: 'M-Type',
    filter: FilterTypeEnum.CheckList,
    render: (r) => renderEmptyOrValue(renderArray(r.mtypes?.map((m) => m.pref_label) || [])),
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
};
