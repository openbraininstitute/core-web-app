import * as React from 'react';
import { Select } from 'antd';
import { LineChartOutlined } from '@ant-design/icons';

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
  onRepetitionClicked: (stimulusType: string, rep: string) => () => void;
  imagePreview: React.FC<{ imageUrl: string }>;
}

interface ImageViewComponentProps {
  stimulusTypeMap: Map<string, number>;
  stimulusType: string;
  imageCollectionData: ImageCollection;
  imagePreview: React.FC<{ imageUrl: string }>;
  onStimulusChange: (value: string) => void;
  onRepetitionClicked: (stimulusType: string, rep: string) => () => void;
}

function ImageSetComponent({
  stimulusType,
  repetitions,
  onRepetitionClicked,
  imagePreview,
}: ImageSetComponentProps) {
  const repCount = Object.keys(repetitions).length;

  return (
    <div className="divide-neutral-2 flex flex-col gap-3 divide-y">
      <div className="text-primary-9 flex items-baseline gap-2 text-lg font-bold">
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
                <span className="text-dark indent-10 text-lg font-light">Repetition {repKey}</span>
                <button
                  className="bg-neutral-1 hover:bg-neutral-2 flex items-center rounded-sm p-3"
                  onClick={onRepetitionClicked(stimulusType, repKey)}
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
                  <span className="text-neutral-4 -rotate-90">
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

function ImageViewComponent({
  stimulusTypeMap,
  stimulusType,
  imageCollectionData,
  imagePreview,
  onStimulusChange,
  onRepetitionClicked,
}: ImageViewComponentProps) {
  const sortedImageCollectionData = React.useMemo(() => {
    const entries = Array.from(imageCollectionData.entries() || []);

    return entries.sort(([stimulusTypeA], [stimulusTypeB]) => {
      const textA = stimulusTypeA.toUpperCase();
      const textB = stimulusTypeB.toUpperCase();
      const AvB = textA > textB ? 1 : 0;
      return textA < textB ? -1 : AvB;
    });
  }, [imageCollectionData]);

  return (
    <div className="flex flex-col gap-10">
      {stimulusTypeMap.size > 1 && (
        <div className="flex flex-col gap-2">
          Select Stimulus ({stimulusTypeMap.size} available)
          <Select
            className="stimulus-select"
            placeholder="Select a stimulus"
            value={stimulusType}
            onChange={onStimulusChange}
          >
            <Option value="All">All</Option>
            {Array.from(stimulusTypeMap.entries()).map(([key, amount]) => (
              <Option value={key} key={key}>
                {key} {amount > 1 && `(${amount})`}
              </Option>
            ))}
          </Select>
        </div>
      )}
      <div className="flex flex-col gap-5">
        {sortedImageCollectionData.map(([itemStimulusType, { repetitions }]) => (
          <ImageSetComponent
            key={itemStimulusType}
            stimulusType={itemStimulusType}
            repetitions={repetitions}
            onRepetitionClicked={onRepetitionClicked}
            imagePreview={imagePreview}
          />
        ))}
      </div>
    </div>
  );
}

export default ImageViewComponent;
