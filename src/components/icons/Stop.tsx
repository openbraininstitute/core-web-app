import type { CSSProperties } from 'react';

type StopIconProps = {
  className?: string;
  style?: CSSProperties;
};

export default function StopIcon({ className, style }: StopIconProps) {
  return (
    <svg
      className={className}
      style={style}
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>stop</title>

      <style>{`
        @keyframes stop-spin {
          to { transform: rotate(360deg); }
        }

        .spinner {
          transform-origin: 18px 18px;
          animation: stop-spin 0.85s linear infinite;
          will-change: transform;
        }
      `}</style>

      <circle
        cx="18"
        cy="18"
        r="14"
        fill="color-mix(in srgb, var(--color-error) 8%, transparent)"
      />

      <circle cx="18" cy="18" r="15.5" stroke="var(--color-error)" strokeWidth="2" fill="none" />

      <circle
        className="spinner"
        cx="18"
        cy="18"
        r="15.5"
        stroke="color-mix(in srgb, var(--color-error) 30%, var(--color-neutral-8))"
        strokeWidth="2"
        fill="none"
        strokeDasharray="24 73"
        strokeLinecap="round"
      />

      <rect x="13" y="13" width="10" height="10" rx="2" fill="var(--color-error)" />
    </svg>
  );
}
