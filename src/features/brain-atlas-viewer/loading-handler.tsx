import { useAtomValue } from 'jotai';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { ApplicationSection } from '@/types/common';
import { loadingAtom } from '@/features/brain-atlas-viewer/state';

type LoadingHandlerProps = {
  section: ApplicationSection;
};

export default function LoadingHandler({ section }: LoadingHandlerProps) {
  const loading = useAtomValue(loadingAtom);
  return (
    loading[section].length > 0 && (
      <Spin
        size="large"
        indicator={<LoadingOutlined />}
        className="text-neutral-3 absolute top-1/2 left-1/2"
      />
    )
  );
}
