import { PrimitiveAtom, useAtom } from 'jotai';
import { loadable } from 'jotai/utils';
import { Select } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useCustomAnalysisConfig } from '@/hooks/experiment-designer';
import { useAnalyses } from '@/app/app/explore/(content)/simulation-campaigns/shared';
import {
  ExpDesignerCustomAnalysisParameter,
  ExpDesignerParam,
  AnalysisConfig,
} from '@/types/experiment-designer';
import { useLoadable } from '@/hooks/hooks';
import { targetListAtom } from '@/state/experiment-designer';
import Link from '@/components/Link';

export default function CustomAnalysisSelector({
  focusedAtom,
}: {
  focusedAtom: PrimitiveAtom<ExpDesignerParam[]>;
}) {
  const customAnalysis = useCustomAnalysisConfig();
  const targetList = useLoadable(loadable(targetListAtom), null);

  const [analyses] = useAnalyses('SimulationCampaign');
  const setCustomAnalysis = useSetCustomAnalysis(focusedAtom);
  const nodeSetsFound = !!targetList && targetList.length > 0;

  return (
    <>
      <div className="mb-2 ml-4 text-gray-400">CUSTOM ANALYSIS</div>

      {nodeSetsFound &&
        customAnalysis?.value.map((a, i) => (
          <AnalysisSelector key={a.id} analysis={a} index={i} focusedAtom={focusedAtom} />
        ))}

      {nodeSetsFound && (
        <Select
          className="mt-3 pl-3"
          value=""
          options={[
            { label: '―', value: '' },
            ...analyses.map((a) => ({ label: a.name, value: a['@id'] })),
          ]}
          style={{ minWidth: '200px' }}
          onSelect={(v) => {
            const analysis = analyses.find((a) => a['@id'] === v);
            if (!analysis || !customAnalysis) return;
            const newCustomAnalysis = { id: v, name: analysis.name, value: ['AAA'] };
            setCustomAnalysis({
              ...customAnalysis,
              value: [...customAnalysis.value, newCustomAnalysis],
            });
          }}
          size="small"
        />
      )}

      {!nodeSetsFound && <span className="ml-4 text-primary-7">No node_sets were found</span>}

      <div>
        <div className="mt-3 block pl-3 text-primary-8">
          <Link
            className="block flex items-center"
            href={`${window.location.protocol}//${window.location.host}/mmb-beta/simulate/experiment-analysis?targetEntity=SimulationCampaign`}
          >
            <PlusOutlined className="mr-3 inline-block border" />
            Add analysis
          </Link>
        </div>
      </div>
    </>
  );
}

function AnalysisSelector({
  analysis,
  index,
  focusedAtom,
}: {
  analysis: AnalysisConfig;
  index: number;
  focusedAtom: PrimitiveAtom<ExpDesignerParam[]>;
}) {
  const targetList = useLoadable(loadable(targetListAtom), null);
  const customAnalysis = useCustomAnalysisConfig();

  const setCustomAnalysis = useSetCustomAnalysis(focusedAtom);

  function onDeselect(target: string) {
    if (!target || !customAnalysis) return;

    setCustomAnalysis({
      ...customAnalysis,
      value: [
        ...customAnalysis.value.slice(0, index),
        { ...analysis, value: analysis.value.filter((t) => t !== target) },
        ...customAnalysis.value.slice(index + 1),
      ],
    });
  }

  function onSelect(target: string) {
    if (!target || !customAnalysis) return;

    setCustomAnalysis({
      ...customAnalysis,
      value: [
        ...customAnalysis.value.slice(0, index),
        { ...analysis, value: [...analysis.value, target] },
        ...customAnalysis.value.slice(index + 1),
      ],
    });
  }

  if (!targetList) return null;

  return (
    <div key={analysis.id} className="ml-4 mr-5 flex justify-between">
      <div className="mr-3 text-primary-8">{analysis.name}</div>

      <Select
        mode="multiple"
        value={analysis.value}
        size="small"
        options={targetList.map((t) => ({ label: t, value: t }))}
        onSelect={(target) => onSelect(target)}
        onDeselect={(target) => onDeselect(target)}
        style={{ width: 150 }}
        showSearch
        filterOption={(input, option) =>
          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
        }
      />

      <DeleteOutlined
        className=""
        onClick={() => {
          if (!customAnalysis) return;
          setCustomAnalysis({
            ...customAnalysis,
            value: customAnalysis.value.filter((ca) => ca.id !== analysis.id),
          });
        }}
      />
    </div>
  );
}

export function useSetCustomAnalysis(focusedAtom: PrimitiveAtom<ExpDesignerParam[]>) {
  const [analysisConfig, setAnalysisConfig] = useAtom(focusedAtom);
  return (customAnalysis: ExpDesignerCustomAnalysisParameter) =>
    setAnalysisConfig([...analysisConfig.filter((c) => c.id !== 'custom'), customAnalysis]);
}
