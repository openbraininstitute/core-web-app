import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSetAtom } from 'jotai/react';

import ExploreSectionListingView from '@/components/explore-section/ExploreSectionListingView';
import { DEFAULT_E_MODEL_STORAGE_KEY } from '@/constants/cell-model-assignment/e-model';
import { ExploreDataScope } from '@/types/explore-section/application';
import { DataType } from '@/constants/explore-section/list-views';
import { VirtualLabInfo } from '@/types/virtual-lab/common';
import { setInitializationValue } from '@/util/utils';
import { detailUrlBuilder } from '@/util/common';
import { EModelMenuItem } from '@/types/e-model';
import { ensureArray } from '@/utils/array';
import {
  eModelEditModeAtom,
  eModelUIConfigAtom,
  selectedEModelAtom,
} from '@/state/brain-model-config/cell-model-assignment/e-model';

import type { RenderButtonProps } from '@/components/explore-section/ExploreSectionListingView/useRowSelection';
import type { IEModel } from '@/api/entitycore/types/entities/e-model';

function buildEModelEntry(source: IEModel): EModelMenuItem {
  return {
    name: source.name,
    id: source.id,
    eType: ensureArray({ input: source.etypes }).at(0)?.pref_label,
    mType: ensureArray({ input: source.mtypes }).at(0)?.pref_label,
    isOptimizationConfig: false,
    brainRegion: String(source.brain_region.id),
  } as EModelMenuItem;
}

export default function ExploreEModelTable({
  dataType,
  dataScope,
  renderButton,
  virtualLabInfo,
}: {
  dataType: DataType;
  dataScope: ExploreDataScope;
  virtualLabInfo?: VirtualLabInfo;
  renderButton?: (props: RenderButtonProps<IEModel>) => ReactNode;
}) {
  const dataKey = `${virtualLabInfo?.projectId ?? ''}/explore/${dataType}`;

  const { push: navigate } = useRouter();
  const setSelectedEModel = useSetAtom(selectedEModelAtom);
  const setEModelUIConfig = useSetAtom(eModelUIConfigAtom);
  const setEModelEditMode = useSetAtom(eModelEditModeAtom);

  const onCellClick = (basePath: string, record: IEModel) => {
    const eModel = buildEModelEntry(record);
    const brainRegionId = record.brain_region.id;

    const exploreUrl = detailUrlBuilder(basePath, record);

    setSelectedEModel(eModel);
    setEModelUIConfig({});
    setEModelEditMode(false);
    setInitializationValue(DEFAULT_E_MODEL_STORAGE_KEY, {
      value: eModel,
      brainRegionId,
    });
    navigate(exploreUrl);
  };

  return (
    <ExploreSectionListingView<IEModel>
      {...{
        dataKey,
        dataType,
        dataScope,
        onCellClick,
        renderButton,
        virtualLabInfo,
      }}
    />
  );
}
