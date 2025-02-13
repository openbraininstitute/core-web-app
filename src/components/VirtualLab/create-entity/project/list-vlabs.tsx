import { Button } from 'antd';
import { Select } from '@/components/VirtualLab/create-entity/common/inputs';
import { classNames } from '@/util/utils';

type Props = {
  id: string | null;
  disableNext: boolean;
  list: Array<{ label: string; value: string }>;
  onSelect: (id: string) => void;
  onNextStep: () => void;
  onClose: () => void;
};

export default function List({ id, list, disableNext, onSelect, onNextStep, onClose }: Props) {
  return (
    <div className="flex h-full flex-grow flex-col">
      <div className="flex h-full flex-grow flex-col">
        <span className="my-3 block font-bold text-primary-8">
          Please select a virtual lab for this project:
        </span>
        <Select options={list} value={id} onChange={onSelect} />
      </div>
      <div className="mt-auto flex items-end justify-end gap-3">
        <Button
          key="cancel-information-btn"
          className="h-14 rounded-none bg-white px-6 text-gray-500 hover:bg-gray-200"
          type="text"
          size="large"
          htmlType="button"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          key="next-to-members-btn"
          className={classNames(
            'h-14 rounded-none border-primary-8 bg-primary-8 px-10 text-white hover:!text-white',
            'disabled:bg-gray-200 hover:disabled:bg-gray-200 hover:disabled:!text-gray-400'
          )}
          type="default"
          size="large"
          htmlType="button"
          onClick={onNextStep}
          disabled={disableNext}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
