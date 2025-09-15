import { Dispatch, SetStateAction, KeyboardEvent } from 'react';
import { RightOutlined } from '@ant-design/icons';
import isNil from 'lodash/isNil';
import { ErrorObject } from 'ajv';

import { AtomsMap, JSONMorphologySchema, Config } from '../types';
import { classNames } from '@/util/utils';

type Props = {
  k: string;
  sectionSchema: JSONMorphologySchema | undefined;
  schema: JSONMorphologySchema;
  config: Config;
  errors: ErrorObject<string, Record<string, unknown>, unknown>[]; // Fixed to avoid no-explicit-any
  atomsMap: AtomsMap;
  setAtomsMap: Dispatch<SetStateAction<AtomsMap>>;
  configTab: string;
  setConfigTab: (tab: string) => void;
  setSelectedItemIdx: (idx: number | null) => void;
  setEditing: (editing: boolean) => void;
  setSelectedCategory: (category: string) => void;
  campaignId: string;
  loading: boolean;
  selectedItemIdx: number | null;
};

export function Section({
  k,
  sectionSchema,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  schema,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  config,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  errors,
  atomsMap,
  setAtomsMap,
  configTab,
  setConfigTab,
  setSelectedItemIdx,
  setEditing,
  setSelectedCategory,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  campaignId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  loading,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  selectedItemIdx,
}: Props) {
  const fallbackSchema: JSONMorphologySchema = {
    type: 'object',
    title: k,
    properties: {},
  };

  const schemaToUse =
    sectionSchema && sectionSchema.type === 'object' ? sectionSchema : fallbackSchema;

  const buttonText = k === 'subject' ? 'Subject' : schemaToUse.title || k;

  const handleClick = () => {
    setConfigTab(k);
    setEditing(true);
    setSelectedCategory('');
    setSelectedItemIdx(null);

    if (isNil(atomsMap[k])) {
      setAtomsMap({
        ...atomsMap,
        [k]: {},
      });
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      className={classNames(
        'flex h-[50px] min-h-[50px] w-full cursor-pointer items-center justify-between rounded-full border border-gray-200 px-5 py-2 drop-shadow hover:bg-white',
        
        configTab === k ? 'bg-gradient-to-r from-[#003A8C] to-[#001026] text-white' : 'bg-gray-50'
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
     
            <span
        className={classNames('text-base', configTab === k ? 'text-white' : 'text-primary-9')}
      >
        {buttonText}
      </span>

      <div className="flex gap-1">
        <RightOutlined className="text-primary-9" />
      </div>
    </div>
  );
}
