import { useEffect, useMemo, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { Spin } from 'antd';
import CustomAnalysis from './CustomAnalysis';
import { SimulationCampaign } from '@/types/explore-section/delta-simulation-campaigns';
import DimensionSelector from '@/components/explore-section/Simulations/DimensionSelector';
import SimulationsDisplayGrid from '@/components/explore-section/Simulations/SimulationsDisplayGrid';
import {
  dimensionsAtom,
  initializeDimensionsFamily,
} from '@/components/explore-section/Simulations/state';
import { simulationsFamily } from '@/state/explore-section/simulation-campaign';
import SimulationOptionsDropdown from '@/components/explore-section/Simulations/DisplayDropdown';
import {
  displayOptions,
  showOnlyOptions,
} from '@/components/explore-section/Simulations/constants';
import { useAnalyses } from '@/app/app/virtual-lab/(free)/explore/(content)/simulation-campaigns/shared';
import { useEnsuredPath, useUnwrappedValue } from '@/hooks/hooks';

export default function Simulations({ resource }: { resource: SimulationCampaign }) {
  const [selectedDisplay, setSelectedDisplay] = useState<string>('raster');
  const [showStatus, setShowStatus] = useState<string>('all');
  const path = useEnsuredPath();
  const dimensions = useAtomValue(dimensionsAtom);
  const setDefaultDimensions = useSetAtom(initializeDimensionsFamily(path));
  const simulations = useUnwrappedValue(simulationsFamily(path));
  const [analyses] = useAnalyses('SimulationCampaign');

  const isCustom = useMemo(
    () => !displayOptions.map((o) => o.value).includes(selectedDisplay),
    [selectedDisplay]
  );

  useEffect(() => {
    if (dimensions?.length === 0) {
      setDefaultDimensions();
    }
  }, [dimensions, resource, setDefaultDimensions]);

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="text-primary-7 flex items-center justify-end gap-4">
        <div className="mr-auto flex items-baseline gap-2">
          <span className="text-xl font-bold">Simulations</span>
          <span className="text-xs">
            {simulations?.length ?? <Spin indicator={<LoadingOutlined />} />} simulations
          </span>
        </div>
        <div>
          <span className="text-primary-8 mr-2 font-light">Show:</span>
          <SimulationOptionsDropdown
            options={showOnlyOptions}
            setSelectedValue={setShowStatus}
            selectedValue={showStatus}
          />
        </div>
        <div>
          <span className="text-primary-8 mr-2 font-light">Display:</span>
          <SimulationOptionsDropdown
            setSelectedValue={setSelectedDisplay}
            selectedValue={selectedDisplay}
            options={[
              ...displayOptions,
              ...analyses.map((a) => ({ label: a.name, value: a['@id'] })),
            ]}
          />
          <Link
            href={`${path}/experiment-analysis?targetEntity=SimulationCampaign`}
            className="text-primary-8 ml-3 font-light"
          >
            Register new analysis
            <PlusOutlined className="ml-2 translate-y-[2px] border border-gray-200 text-2xl" />
          </Link>
        </div>
      </div>
      {!isCustom && simulations && (
        <>
          <DimensionSelector coords={resource.parameter?.coords} />
          <SimulationsDisplayGrid display={selectedDisplay} status={showStatus} />
        </>
      )}

      {isCustom && (
        <CustomAnalysis resource={resource} analysisId={selectedDisplay} key={selectedDisplay} />
      )}
    </div>
  );
}
