import { LoadingOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import { useState } from 'react';
import { match, P } from 'ts-pattern';
import type { IMEModel } from '@/api/entitycore/types';
import { ErrorData } from '@/components/message-banners/error';
import AnalysisTab from '@/components/simulate/SimulationDetails/AnalysisTab';
import SimulationConfigurationTab from '@/components/simulate/SimulationDetails/configuration-tab';
import ResultsTab from '@/components/simulate/SimulationDetails/recording-tab';

import type { SimulationPayload } from '@/types/small-scale-simulator/single-neuron';
import { classNames } from '@/util/utils';

type TabKeys = 'configuration' | 'results' | 'analysis';
type Tab = { key: TabKeys; title: string };

const TABS: Tab[] = [
  {
    key: 'configuration',
    title: 'Simulation configuration',
  },
  {
    key: 'results',
    title: 'Results',
  },
  {
    key: 'analysis',
    title: 'Analysis',
  },
];

type Props = {
  experimentSetup: SimulationPayload | null;
  type: 'single-neuron-simulation' | 'synaptome-simulation';
  meModel: IMEModel | null;
  error: string | null;
  loading: boolean;
};

export default function ExperimentSetupTab({
  experimentSetup,
  error,
  loading,
  type,
  meModel,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKeys>('configuration');
  const component = match({ experimentSetup, error, loading })
    .with({ loading: true }, () => (
      <div className="flex h-full min-h-64 w-full flex-col items-center justify-center gap-3">
        <Spin indicator={<LoadingOutlined />} size="large" />
        <h2 className="text-primary-9 font-light">Loading experiment setup...</h2>
      </div>
    ))
    .with({ error: P.string }, () => (
      <ErrorData
        title="An error occurred"
        description={error}
        cls={{
          container: 'bg-white text-primary-9 border-primary-9! w-full! max-w-full! mt-4',
          title: 'text-primary-9',
          description: 'text-primary-9',
        }}
      />
    ))
    .with({ experimentSetup: P.nullish }, () => (
      <ErrorData
        title="No experiment setup found"
        description="The experiment configuration/results is not available for this simulation"
        cls={{
          container: 'bg-white text-primary-9 border-primary-9! w-full! max-w-full! mt-4',
          title: 'text-primary-9',
          description: 'text-primary-9',
        }}
      />
    ))
    .with({ experimentSetup: P.nonNullable.select() }, (_experimentSetup) => (
      <>
        {activeTab === 'configuration' && (
          <SimulationConfigurationTab type={type} simulation={_experimentSetup} />
        )}

        {activeTab === 'results' && <ResultsTab recordings={_experimentSetup.simulation} />}
        {activeTab === 'analysis' && type === 'single-neuron-simulation' && (
          <AnalysisTab meModel={meModel} />
        )}
      </>
    ))
    .otherwise(() => null);

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-primary-8 mt-6 mb-3 text-3xl font-bold">Experiment Setup</h1>
      <ul className="mt-4 flex w-full items-center justify-center">
        {(type === 'synaptome-simulation' ? TABS.filter((p) => p.key !== 'analysis') : TABS).map(
          ({ key, title }) => (
            <li
              title={title}
              key={key}
              className={classNames(
                'w-1/3 flex-[1_1_33%] border border-gray-300 py-3 text-center text-xl font-semibold transition-all duration-200 ease-out',
                activeTab === key
                  ? 'bg-primary-9 border-primary-9 text-white'
                  : 'text-primary-9 bg-white',
              )}
            >
              <button
                type="button"
                className="w-full"
                onClick={() => setActiveTab(key)}
                onKeyDown={() => setActiveTab(key)}
              >
                {title}
              </button>
            </li>
          ),
        )}
      </ul>
      {component}
    </div>
  );
}
