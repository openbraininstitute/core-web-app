import { Dispatch, SetStateAction } from 'react';
import { RightOutlined } from '@ant-design/icons';
import { JSONMorphologySchema, AtomsMap } from '../types';
import { classNames } from '@/util/utils';
import { ErrorObject } from 'ajv';
import { Config } from './components';

type Props = {
  k: string;
  schema: JSONMorphologySchema;
  sectionSchema: JSONMorphologySchema | undefined;
  atomsMap: AtomsMap;
  setAtomsMap: Dispatch<SetStateAction<AtomsMap>>; // Updated to Dispatch type
  configTab: string;
  setConfigTab: (tab: string) => void;
  config: Config;
  campaignId?: string;
  loading?: boolean;
  errors: ErrorObject<string, Record<string, unknown>, unknown>[] | null | undefined;
  selectedItemIdx?: number | null;
  setSelectedItemIdx: (idx: number | null) => void;
  setEditing: (editing: boolean) => void;
  setSelectedCategory: (category: string) => void;
};

export function Section({
  k,

  sectionSchema,
  atomsMap,
  setAtomsMap,
  configTab,
  setConfigTab,
  setSelectedItemIdx,
  setEditing,
  setSelectedCategory,
}: Props) {
  console.log(`Section ${k}:`, {
    key: k,
    sectionSchema: JSON.stringify(sectionSchema, null, 2),
    isSectionSchemaValid:
      sectionSchema && sectionSchema.type === 'object' && sectionSchema.properties,
  });

  const fallbackSchema: JSONMorphologySchema = {
    type: 'object',
    title: k,
    properties: {},
  };

  const schemaToUse =
    sectionSchema && sectionSchema.type === 'object' ? sectionSchema : fallbackSchema;

  const buttonText = k === 'subject' ? 'Subject' : schemaToUse.title || k;

  return (
    <div
      className={classNames(
        'flex h-[50px] min-h-[50px] w-full cursor-pointer items-center justify-between rounded-full border border-gray-200 px-5 py-2 drop-shadow hover:bg-white',
        configTab === k ? 'bg-white' : 'bg-gray-50'
      )}
      onClick={() => {
        console.log(`Clicked section: ${k}`);
        setConfigTab(k);
        setEditing(true);
        setSelectedCategory('');
        setSelectedItemIdx(null);

        if (!atomsMap[k]) {
          setAtomsMap({
            ...atomsMap,
            [k]: {},
          });
        }
      }}
    >
      <span className="text-primary-9 text-base">{buttonText}</span>
      <div className="flex gap-1">
        <RightOutlined className="text-primary-9" />
      </div>
    </div>
  );
}
