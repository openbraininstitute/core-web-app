import { CSSProperties } from 'react';

type SettingsIconProps = {
  className?: string;
  style?: CSSProperties;
  fill?: string;
};

export default function SendIcon({ className, style, fill }: SettingsIconProps) {
  return (
    <svg
      className={className}
      style={style}
      width="1.5em"
      height="1.5em"
      viewBox="0 0 24 24"
      fill={fill || 'currentColor'}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>send</title>
      <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z" />
    </svg>
  );
}
