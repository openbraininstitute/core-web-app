import { Modal } from 'antd';
import { useSetAtom } from 'jotai';

import ExploreSectionListingView from '@/components/explore-section/ExploreSectionListingView';
import { DataType } from '@/constants/explore-section/list-views';
import { RenderButtonProps } from '@/components/explore-section/ExploreSectionListingView/useRowSelection';
import { eModelUIConfigAtom } from '@/state/brain-model-config/cell-model-assignment/e-model';
import { ExploreESHit } from '@/types/explore-section/es';
import { ReconstructedNeuronMorphology } from '@/types/explore-section/es-experiment';
import { ExploreDataScope } from '@/types/explore-section/application';
import { convertESMorphologyForUI } from '@/services/e-model';

type Props = {
  isOpen: boolean;
  onCancel: () => void;
  onOk: () => void;
};

const pickButtonStyle =
  'font-semibold mt-2 px-14 py-4 text-primary-8 bg-white sticky bottom-0 self-end border border-primary-8';

export default function PickMorphology({ isOpen, onCancel, onOk }: Props) {
  const width = typeof window !== 'undefined' ? window.innerWidth - 50 : undefined;
  const setEModelUIConfig = useSetAtom(eModelUIConfigAtom);

  const onMorphologyAdd = (selectedRows: ExploreESHit<ReconstructedNeuronMorphology>[]) => {
    setEModelUIConfig((oldAtomData) => {
      const savedMorphs = oldAtomData?.morphologies?.length ? [...oldAtomData.morphologies] : [];
      const savedMorphIds = savedMorphs.map((t) => t['@id']);
      const newRows = selectedRows.filter((row) => !savedMorphIds.includes(row._source['@id']));
      const selectedMorphs = newRows.map((row) => convertESMorphologyForUI(row._source));

      return {
        ...oldAtomData,
        morphologies: [...savedMorphs, ...selectedMorphs],
      };
    });
    onOk();
  };

  const pickMorphButtonFn = ({ selectedRows }: RenderButtonProps) => (
    <button
      type="button"
      className={pickButtonStyle}
      onClick={() => onMorphologyAdd(selectedRows as ExploreESHit<ReconstructedNeuronMorphology>[])}
    >
      Assign morphology
    </button>
  );

  return (
    <div>
      <Modal
        open={isOpen}
        title={null}
        onOk={onOk}
        onCancel={onCancel}
        footer={null}
        centered
        width={width}
      >
        <ExploreSectionListingView
          dataType={DataType.ExperimentalNeuronMorphology}
          renderButton={pickMorphButtonFn}
          dataScope={ExploreDataScope.NoScope}
          dataKey={DataType.ExperimentalNeuronMorphology}
        />
      </Modal>
    </div>
  );
}
