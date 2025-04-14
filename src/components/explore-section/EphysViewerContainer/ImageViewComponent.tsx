import * as React from 'react';
import { Select } from 'antd';
import { LineChartOutlined } from '@ant-design/icons';
import NWBTrace from './nwb-trace';
import { useMemo } from 'react';

const { Option } = Select;

export type ImageCollection = Map<string, ImageItem>;

export type ImageItem = {
  stimulusType: string;
  repetitions: {
    [rep: number]: {
      imageSrc: string;
      fileName: string;
      about?: string;
    }[];
  };
};

interface ImageSetComponentProps {
  stimulusType: string;
  repetitions: {
    [rep: number]: {
      imageSrc: string;
      fileName: string;
      about?: string | undefined;
    }[];
  };
  onRepetitionClick: (stimulusType: string, rep: string) => () => void;
  imagePreview: React.FC<{ imageUrl: string }>;
}

interface TraceOverviewComponentProps {
  trace: NWBTrace;
  protocol: string;
  onStimulusChange: (value: string) => void;
  onRepetitionClick: (stimulusType: string, rep: string) => () => void;
}

function ImageSetComponent({
  stimulusType,
  repetitions,
  onRepetitionClick,
  imagePreview,
}: ImageSetComponentProps) {
  const repCount = Object.keys(repetitions).length;

  return (
    <div className="flex flex-col gap-3 divide-y divide-neutral-2">
      <div className="flex items-baseline gap-2 text-lg font-bold text-primary-9">
        {stimulusType}
        <small className="font-light">{`${repCount} ${
          repCount === 1 ? 'repetition' : 'repetitions'
        }`}</small>
      </div>

      <div className="grid grid-cols-4 gap-7 pt-5 2xl:grid-cols-6">
        {Object.keys(repetitions).map((repKey) => {
          const sweeps = repetitions[Number(repKey)]?.sort((a: any, b: any) => {
            const aType = (a.about || a.fileName).toLowerCase().includes('response');

            const bType = (b.about || b.fileName).toLowerCase().includes('response');

            if (aType && !bType) {
              return 1;
            }

            if (bType && !aType) {
              return -1;
            }

            return 0;
          });
          return (
            <div className="flex flex-col gap-2" key={`image-preview-${stimulusType}-${repKey}`}>
              <div className="flex items-center justify-between">
                <span className="indent-10 text-lg font-light text-dark">Repetition {repKey}</span>
                <button
                  className="flex items-center rounded bg-neutral-1 p-3 hover:bg-neutral-2"
                  onClick={onRepetitionClick(stimulusType, repKey)}
                  type="button"
                  aria-label="Toggle selection"
                >
                  <LineChartOutlined className="stroke-primary-8" />
                </button>
              </div>

              {sweeps.map((imgData: any, index: any) => (
                <div
                  className="flex items-center"
                  key={`image-preview-${stimulusType}-${repKey}-${imgData.imageSrc}`}
                >
                  <span className="-rotate-90 text-neutral-4">
                    {index === 0 ? 'Stimulus' : 'Recording'}
                  </span>
                  {imagePreview({ imageUrl: imgData.imageSrc })}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TraceOverviewComponent({
  trace,
  protocol,
  onStimulusChange,
  onRepetitionClick,
}: TraceOverviewComponentProps) {
  const protocols = useMemo(() => trace.getProtocols(), [trace]);

  const repetitionMap = useMemo(
    () =>
      protocols.reduce(
        (map, protocol) => map.set(protocol, trace.getRepetitions(protocol)),
        new Map<string, string[]>()
      ),
    [trace]
  );

  return (
    <div className="flex flex-col gap-10">
      {protocols.length > 1 && (
        <div className="flex flex-col gap-2">
          Select Stimulus ({protocols.length} available)
          <Select
            className="stimulus-select"
            placeholder="Select a stimulus"
            value={protocol}
            onChange={onStimulusChange}
          >
            <Option value="All">All</Option>
            {Array.from(repetitionMap.entries()).map(([protocol, repetitions]) => (
              <Option value={protocol} key={protocol}>
                {protocol} {repetitions.length > 1 && `(${repetitions.length})`}
              </Option>
            ))}
          </Select>
        </div>
      )}
      <div className="flex flex-col gap-5">
        {protocols.map((protocol) => (
          <h2>{protocol}</h2>
          // <ImageSetComponent
          //   key={protocol}
          //   stimulusType={protocol}
          //   repetitions={repetitionMap.get(protocol) ?? []}
          //   onRepetitionClick={onRepetitionClick}
          // />
        ))}
      </div>
    </div>
  );
}

export default TraceOverviewComponent;
