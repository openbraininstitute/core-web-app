import type { ReactNode } from 'react';

/**
 * The ways a glossary term's one-line answer, or a teaching topic's, can be set — TEMPORARY, for
 * judging them, from the Dev settings' Appearance. The first is how it was.
 */
export const CALLOUT_STYLES = [
  'Panel',
  'Gradient ink',
  'Pull quote',
  'Highlighter',
  'Night card',
  'Glow border',
  'Shimmer',
  'Headline',
] as const;

/** OBI's navy into its blue and a cyan: the ink of the gradient styles. */
const INK = 'linear-gradient(90deg,#002766 0%,#096dd9 55%,#13a8a8 100%)';

/** The small label some styles set above the line. */
function Eyebrow({ className }: { className: string }) {
  return (
    <span
      className={`flex items-center gap-[8px] text-[10.5px] leading-[14px] font-bold tracking-[1.2px] uppercase ${className}`}
    >
      <span className="h-[2px] w-[22px] rounded-full" style={{ background: INK }} />
      In one line
    </span>
  );
}

/** A term's or a topic's one line, set in the `design`-th of CALLOUT_STYLES. */
export function Callout({ design = 0, children }: { design?: number; children: ReactNode }) {
  switch (CALLOUT_STYLES[design]) {
    case 'Gradient ink':
      return (
        <div className="flex flex-col gap-[10px]">
          <span className="h-[3px] w-[44px] rounded-full" style={{ background: INK }} />
          <p
            className="bg-clip-text text-[23px] leading-[33px] font-bold tracking-[-0.2px] text-transparent"
            style={{ backgroundImage: INK }}
          >
            {children}
          </p>
        </div>
      );
    case 'Pull quote':
      return (
        <blockquote className="relative pt-[14px] pl-[46px]">
          <span
            aria-hidden="true"
            className="absolute top-[-8px] left-0 text-[76px] leading-none text-[#91caff]"
            style={{ fontFamily: 'var(--font-DMSerifText), Georgia, serif' }}
          >
            “
          </span>
          <p
            className="text-[22px] leading-[33px] text-[#002766] italic"
            style={{ fontFamily: 'var(--font-DMSerifText), Georgia, serif' }}
          >
            {children}
          </p>
          <span className="mt-[14px] block h-px w-[120px] bg-[#d6e4ff]" />
        </blockquote>
      );
    case 'Highlighter':
      return (
        <p className="text-[21px] leading-[34px] font-semibold text-[#002766]">
          <span
            className="px-[3px] [box-decoration-break:clone]"
            style={{
              backgroundImage:
                'linear-gradient(transparent 56%, #bae7ff 56%, #bae7ff 92%, transparent 92%)',
            }}
          >
            {children}
          </span>
        </p>
      );
    case 'Night card':
      return (
        <div
          className="flex flex-col gap-[8px] rounded-[14px] px-[22px] py-[18px] shadow-[0_12px_32px_rgba(0,39,102,0.28)]"
          style={{
            background:
              'radial-gradient(120% 160% at 0% 0%, #1d39c4 0%, #002766 50%, #001233 100%)',
          }}
        >
          <Eyebrow className="text-[#91caff]" />
          <p className="text-[19px] leading-[29px] font-semibold text-white">{children}</p>
        </div>
      );
    case 'Glow border':
      return (
        <div
          className="rounded-[14px] p-[1.5px] shadow-[0_8px_28px_rgba(24,144,255,0.2)]"
          style={{ background: INK }}
        >
          <p className="rounded-[12.5px] bg-white px-[20px] py-[16px] text-[19px] leading-[29px] font-semibold text-[#002766]">
            {children}
          </p>
        </div>
      );
    case 'Shimmer':
      return (
        <p
          className="learn-shimmer bg-clip-text text-[23px] leading-[33px] font-bold tracking-[-0.2px] text-transparent"
          style={{
            backgroundImage:
              'linear-gradient(90deg,#002766 0%,#096dd9 25%,#36cfc9 50%,#096dd9 75%,#002766 100%)',
            backgroundSize: '200% 100%',
          }}
        >
          {children}
        </p>
      );
    case 'Headline':
      return (
        <div className="flex flex-col gap-[8px]">
          <Eyebrow className="text-[#096dd9]" />
          <p className="text-[25px] leading-[34px] font-bold tracking-[-0.3px] text-[#002766]">
            {children}
          </p>
        </div>
      );
    default:
      return (
        <p className="rounded-[12px] border-l-[3px] border-[#002766] bg-[#f0f5ff] px-[20px] py-[16px] text-[18px] leading-[28px] font-semibold text-[#002766]">
          {children}
        </p>
      );
  }
}
