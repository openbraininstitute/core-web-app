import { Button } from 'antd';
import { classNames } from '@/util/utils';

type Props = {
  loading: boolean;
  activeTab: string;
  disableNext: boolean;
  disableCreate: boolean;
  onClose: () => void;
  onNextStep: () => void;
  onPreviousStep: () => void;
};

export default function Footer({
  loading,
  activeTab,
  disableNext,
  disableCreate,
  onClose,
  onNextStep,
  onPreviousStep,
}: Props) {
  return (
    <div className="mt-auto w-full">
      {activeTab === 'information' ? (
        <div className="mt-5 flex items-end justify-end gap-3">
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
      ) : (
        <div className="mt-5 flex items-end justify-end gap-3">
          <Button
            key="cancel-members-btn"
            className="h-14 rounded-none bg-white px-6 text-gray-500 hover:bg-gray-200"
            type="text"
            size="large"
            htmlType="button"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            key="back-to-information-btn"
            className="h-14 rounded-none bg-white px-6 text-gray-500 hover:bg-gray-200"
            type="text"
            size="large"
            htmlType="button"
            onClick={onPreviousStep}
          >
            Back
          </Button>
          <Button
            key="create-vlab-btn"
            className="h-14 rounded-none border-primary-8 bg-primary-8 px-10 text-white hover:!text-white"
            type="default"
            size="large"
            htmlType="submit"
            disabled={disableCreate}
            loading={loading}
          >
            Create
          </Button>
        </div>
      )}
    </div>
  );
}
