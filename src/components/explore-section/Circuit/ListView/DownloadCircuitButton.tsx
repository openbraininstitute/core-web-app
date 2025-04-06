import { InfoCircleOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';

export default function DownloadCircuitButton({
  fileUrl,
  selectedRowKeys,
}: {
  fileUrl: string;
  selectedRowKeys: string[] | number[];
}) {
  return (
    <a
      href={fileUrl}
      type="button"
      className="absolute bottom-6 right-10 flex h-20 w-[150px] items-center justify-center bg-primary-8 text-xl transition-bottom duration-300 ease-in-out"
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
