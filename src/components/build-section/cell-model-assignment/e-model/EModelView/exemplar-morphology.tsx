import { useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { ColumnsType } from 'antd/es/table';
import { DeleteOutlined } from '@ant-design/icons';

import DefaultEModelTable from './DefaultEModelTable';
import Header from './Header';
import PickMorphology from './PickMorphology';
import ErrorMessageLine, { StandardFallback } from './ErrorMessageLine';

import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { getFieldsDefinition } from '@/entity-configuration/definitions';

import {
  eModelEditModeAtom,
  eModelUIConfigAtom,
} from '@/state/brain-model-config/cell-model-assignment/e-model';
import GenericButton from '@/components/Global/GenericButton';

import type {
  IReconstructionMorphology,
  IReconstructionMorphologyExpanded,
} from '@/api/entitycore/types';

const defaultColumnsFields = getFieldsDefinition([
  EntityCoreFields.Preview,
  EntityCoreFields.Name,
  EntityCoreFields.Description,
  EntityCoreFields.BrainRegion,
  EntityCoreFields.MType,
  EntityCoreFields.Contributions,
]);

const defaultColumns: ColumnsType<IReconstructionMorphology> = Object.entries(
  defaultColumnsFields
).map(([key, field]) => ({
  title: field.title.toUpperCase(),
  key,
  render: field.render,
}));

type Props = {
  exemplarMorphology: IReconstructionMorphology | IReconstructionMorphologyExpanded;
};

export default function ExemplarMorphology({ exemplarMorphology }: Props) {
  // const { id } = params;

  // const [orgProj] = from64(id).split('!/!');
  // const [org, proj] = orgProj.split('/');

  // const info = useResourceInfoFromPath();

  // const detail = useUnwrappedValue(detailFamily(info));

  // const eModelExemplarMorphology = useUnwrappedValue(
  //   eModelExemplarMorphologyFamily({
  //     eModelId: detail?.['@id'],
  //     projectId: proj,
  //     virtualLabId: org,
  //   })
  // );

  const eModelEditMode = useAtomValue(eModelEditModeAtom);
  const [eModelUIConfig, setEModelUIConfig] = useAtom(eModelUIConfigAtom);
  const [openPicker, setOpenPicker] = useState(false);
  // TODO: allow editing emodel
  // FIXME: find a better way to edit emodel

  // useEffect(() => {
  //   if (!eModelEditMode || !exemplarMorphology) return;

  //   setEModelUIConfig((oldAtomData) => ({
  //     ...oldAtomData,
  //     morphologies: [structuredClone(exemplarMorphology)],
  //   }));
  // }, [eModelEditMode, exemplarMorphology, setEModelUIConfig]);

  const onMorphologyDelete = (morphology: IReconstructionMorphology) => {
    setEModelUIConfig((oldAtomData) => {
      if (!oldAtomData?.morphologies) return oldAtomData;

      const results = oldAtomData.morphologies.filter((morph) => morph.id !== morphology.id);

      return {
        ...oldAtomData,
        morphologies: results,
      };
    });
  };

  const exemplarMorphologyAsList = exemplarMorphology ? [exemplarMorphology] : [];
  const morphologies = eModelEditMode ? eModelUIConfig?.morphologies : exemplarMorphologyAsList;

  const deleteColumn = {
    title: '',
    key: 'action',
    render: (morphology: IReconstructionMorphology) => (
      <button type="button" onClick={() => onMorphologyDelete(morphology)} aria-label="Delete">
        <DeleteOutlined />
      </button>
    ),
  };

  const columns = [...defaultColumns, ...(eModelEditMode ? [deleteColumn] : [])];

  let displayMorphologyError = null;

  const title = 'Exemplar morphology';

  if (!morphologies) {
    return <StandardFallback type="error">{title}</StandardFallback>;
  }

  if (exemplarMorphologyAsList.length > 0 && morphologies && morphologies.length !== 1) {
    if (morphologies.length > 1) {
      displayMorphologyError = 'Too many morphologies selected. Keep only one.';
    } else {
      displayMorphologyError = 'Select at least one morphology';
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Header>{title}</Header>

      <DefaultEModelTable<IReconstructionMorphology>
        dataSource={morphologies || []}
        columns={columns}
      />

      <ErrorMessageLine message={displayMorphologyError} />

      {eModelEditMode && (
        <>
          <GenericButton
            className="border-primary-7 text-primary-7 mt-2"
            text="Assign morphology"
            onClick={() => {
              setOpenPicker(true);
            }}
          />
          <PickMorphology
            isOpen={openPicker}
            onCancel={() => setOpenPicker(false)}
            onOk={() => setOpenPicker(false)}
          />
        </>
      )}
    </div>
  );
}
