import { InfoCircleOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import { Key } from 'react';

export default function CircuitDownloadButton({
  link,
  selectedRowKeys,
}: {
  link: string;
  selectedRowKeys: Key[];
}) {
  return (
    <a
      href={link}
      type="button"
      className="fixed bottom-10 right-[97px] flex h-20 w-[160px] items-center justify-center bg-primary-8 text-xl text-white transition-bottom duration-300 ease-in-out"
      style={{
        visibility: selectedRowKeys && selectedRowKeys.length > 0 ? 'visible' : 'hidden',
      }}
    >
      <span>Download</span>
      <Tooltip
        title={
          <a
            href="https://github.com/openbraininstitute/ConnectomeUtilities/blob/main/README.md"
            target="_blank"
            onClick={(e) => e.stopPropagation()}
          >
            The connectome will be downloaded in Connectome Utilities format, see more here.
          </a>
        }
      >
        <InfoCircleOutlined className="ml-2" />
      </Tooltip>
    </a>
  );
}
