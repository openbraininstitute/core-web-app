import { InfoCircleOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import Link from 'next/link';

export default function ActionButton({
  type,
  label,
  action,
  link,
  disabled,
  children,
}: {
  type: 'button' | 'link' | 'download';
  label: string;
  action?: () => void;
  link?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  if (type === 'button') {
    return (
      <button
        type="button"
        className="relative flex flex-row items-center gap-x-2"
        style={{
          color: disabled ? '#A0AEC0' : '#002766',
          opacity: disabled ? 0.8 : 1,
          pointerEvents: disabled ? 'none' : 'auto',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        onClick={action}
        disabled={disabled}
        aria-label={label}
      >
        <span className="mr-2 block text-sm font-normal">{label}</span>
        <div className="flex h-12 w-12 items-center justify-center border border-solid border-gray-300">
          {children}
        </div>
      </button>
    );
  }

  if (type === 'link') {
    return (
      <Link
        href={link || '#'}
        className="relative flex flex-row items-center gap-x-2 text-primary-9 disabled:text-gray-500 disabled:opacity-50"
        style={{
          color: disabled ? '#A0AEC0' : '#002766',
          opacity: disabled ? 0.8 : 1,
          pointerEvents: disabled ? 'none' : 'auto',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        aria-label={label}
        aria-disabled={disabled ? 'true' : 'false'}
        target="_blank"
      >
        <span className="mr-1 block text-sm font-normal">{label}</span>
        <div className="flex h-12 w-12 items-center justify-center border border-solid border-gray-300">
          {children}
        </div>
      </Link>
    );
  }

  if (type === 'download' && link) {
    return (
      <a
        href={link}
        type="button"
        className="absolute bottom-6 right-10 flex h-20 w-[150px] items-center justify-center bg-primary-8 text-xl transition-bottom duration-300 ease-in-out"
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
}
