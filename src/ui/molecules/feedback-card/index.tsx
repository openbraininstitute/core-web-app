import type { SVGProps } from 'react';

type Props = {
  note?: string;
  tag?: string;
  tone?: 'error' | 'empty';
  code?: string;
  title: string;
  description?: string;
  secondaryDescription?: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
};

function InboxBroken(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <title>Inbox</title>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5">
        <path d="M2 13h3.16c.905 0 1.358 0 1.756.183s.692.527 1.281 1.214l.606.706c.589.687.883 1.031 1.281 1.214s.85.183 1.756.183h.32c.905 0 1.358 0 1.756-.183s.692-.527 1.281-1.214l.606-.706c.589-.687.883-1.031 1.281-1.214S17.934 13 18.84 13H22" />
        <path d="M22 12c0 4.714 0 7.071-1.465 8.535C19.072 22 16.714 22 12 22s-7.071 0-8.536-1.465C2 19.072 2 16.714 2 12s0-7.071 1.464-8.536C4.93 2 7.286 2 12 2s7.071 0 8.535 1.464c.974.974 1.3 2.343 1.41 4.536" />
      </g>
    </svg>
  );
}

export function ErrorLight(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20" {...props}>
      <title>Error</title>
      <g fill="currentColor">
        <path
          fillRule="evenodd"
          d="M10 7a2 2 0 0 1 2 2v7a2 2 0 1 1-4 0V9a2 2 0 0 1 2-2"
          clipRule="evenodd"
        />
        <path d="M12 4a2 2 0 1 1-4 0a2 2 0 0 1 4 0" />
      </g>
    </svg>
  );
}
export function ErrorMinimal({
  tag = 'Error',
  title,
  description,
  primaryAction,
  secondaryAction,
}: Props) {
  return (
    <div className="w-full bg-white text-primary-9 rounded-2xl shadow-[inset_0_0_0_1px_#fff,0_0_0_1px_rgba(0,0,0,0.04)] p-7">
      <Tag tone="error">{tag}</Tag>
      <h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3>
      {description && (
        <p className="text-[14.5px] leading-relaxed text-primary-7 text-pretty">{description}</p>
      )}
      <div className="mt-5 flex gap-1.5">
        {primaryAction}
        {secondaryAction}
      </div>
    </div>
  );
}

export function EmptyMinimal({
  tag = 'Empty',
  title,
  description,
  secondaryDescription,
  primaryAction,
  secondaryAction,
}: Props) {
  return (
    <div className="w-full bg-white text-primary-9 rounded-2xl shadow-[inset_0_0_0_1px_#fff,0_0_0_1px_rgba(0,0,0,0.04)] p-7">
      <Tag tone="empty">{tag}</Tag>
      <h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3>
      {description && (
        <p className="text-base leading-relaxed text-gray-400 text-pretty">{description}</p>
      )}
      {secondaryDescription && (
        <p className="mt-1.5 text-sm leading-relaxed  text-gray-300 text-pretty">
          {secondaryDescription}
        </p>
      )}

      <div className="mt-5 flex gap-1.5">
        {primaryAction}
        {secondaryAction}
      </div>
    </div>
  );
}

export function ErrorEditorial({
  tag,
  code,
  tone,
  title,
  description,
  primaryAction,
  secondaryAction,
}: Props) {
  return (
    <div className="w-full text-primary-9 rounded-2xl shadow-[inset_0_0_0_1px_#fff,0_0_0_1px_rgba(0,0,0,0.04)] px-8 py-7 bg-linear-to-b from-destructive-soft to-white to-70%">
      <CaptionRail tag={tag} code={code} tone={tone} />
      <Rule />
      <h3 className="font-serif font-normal text-xl leading-relaxed tracking-tight text-balance mb-3.5">
        {title}
      </h3>
      <p className="text-base leading-relaxed text-gray-400 text-pretty">{description}</p>
      <div className="mt-6 flex items-center gap-2.5">
        {primaryAction}
        {secondaryAction}
      </div>
    </div>
  );
}

export function EmptyEditorial({
  tag,
  code,
  tone,
  title,
  description,
  secondaryDescription,
  primaryAction,
  secondaryAction,
}: Props) {
  return (
    <div className="w-full text-primary-9 rounded-2xl shadow-[inset_0_0_0_1px_#fff,0_0_0_1px_rgba(0,0,0,0.04)] px-8 py-7 bg-linear-to-b from-green-soft to-white to-70%">
      <CaptionRail tag={tag} code={code} tone={tone} />
      <Rule />
      <h3 className="font-serif font-normal text-xl leading-relaxed tracking-tight text-balance mb-3.5">
        {title}
      </h3>
      {description && (
        <p className="text-base leading-relaxed text-gray-400 text-pretty">{description}</p>
      )}
      {secondaryDescription && (
        <p className="mt-2.5 text-sm leading-relaxed text-gray-300 text-pretty">
          {secondaryDescription}
        </p>
      )}
      <div className="mt-6 flex items-center gap-2.5">
        {primaryAction}
        {secondaryAction}
      </div>
    </div>
  );
}

export function ErrorSoft({ note, title, description, primaryAction, secondaryAction }: Props) {
  return (
    <div className="w-full text-primary-9 rounded-2xl shadow-[inset_0_0_0_1px_#fff,0_0_0_1px_rgba(0,0,0,0.04)] px-7 pt-7 pb-6 bg-linear-to-b from-[#fde8e8] to-white to-70%">
      <IconTile tone="error">
        <ErrorLight className="size-6" />
      </IconTile>
      {note && <SoftPill tone="error">{note}</SoftPill>}
      <h3 className="text-lg font-semibold tracking-tight"> {title}</h3>
      {description && (
        <p className="text-base leading-relaxed text-gray-400 text-pretty">{description}</p>
      )}
      <div className="mt-5 flex items-center gap-1">
        {primaryAction}
        {secondaryAction}
      </div>
    </div>
  );
}

export function EmptySoft({
  note,
  title,
  description,
  secondaryDescription,
  primaryAction,
  secondaryAction,
}: Props) {
  return (
    <div className="w-full text-primary-9 rounded-2xl shadow-[inset_0_0_0_1px_#fff,0_0_0_1px_rgba(0,0,0,0.04)] px-7 pt-7 pb-6 bg-linear-to-br from-green-main/20 to-white to-35%">
      <IconTile tone="empty">
        <InboxBroken className="size-8" />
      </IconTile>
      {note && <SoftPill tone="empty">{note}</SoftPill>}
      <h3 className="text-lg font-semibold tracking-tight mb-1.5">{title}</h3>
      {description && (
        <p className="text-base leading-relaxed text-gray-400 text-pretty">{description}</p>
      )}
      {secondaryDescription && (
        <p className="mt-2.5 text-sm leading-relaxed  text-gray-300 text-pretty">
          {secondaryDescription}
        </p>
      )}
      <div className="mt-5 flex items-center gap-1">
        {primaryAction}
        {secondaryAction}
      </div>
    </div>
  );
}

function Tag({ tone, children }: { tone: 'error' | 'empty'; children: React.ReactNode }) {
  const tones = {
    error: 'border-destructive/30 bg-destructive/20 text-destructive',
    empty: 'border-green-main/30 bg-green-main/20 text-green-main',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium uppercase tracking-wider px-2.5 py-1 rounded-full border ${tones[tone]}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

function CaptionRail({
  tag,
  code,
  tone,
}: {
  tag?: string;
  code: string | undefined;
  tone?: 'error' | 'empty';
}) {
  const accent = tone === 'error' ? 'text-destructive-ink' : 'text-green-main-ink';
  if ((!tag && !code) || !tone) return null;

  return (
    <div className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.08em]">
      {tag && <span className={`${accent} font-medium`}>{tag}</span>}
      {code && <span className="text-primary-5">{code}</span>}
    </div>
  );
}

function Rule() {
  return <div className="h-px bg-neutral-2 mt-3.5 mb-5" />;
}

function IconTile({ tone, children }: { tone: 'error' | 'empty'; children: React.ReactNode }) {
  const accent = tone === 'error' ? 'text-destructive' : 'text-green-main';
  return (
    <div
      className={`size-12 mb-4 grid place-items-center rounded-full bg-white border border-neutral-2 ${accent}`}
    >
      {children}
    </div>
  );
}

function SoftPill({ tone, children }: { tone: 'error' | 'empty'; children: React.ReactNode }) {
  const tones = {
    error: 'bg-destructive-soft-2 text-destructive-ink',
    empty: 'bg-green-soft-2 text-green-main-ink',
  };
  return (
    <span
      className={`inline-block text-[11.5px] font-medium px-2.5 py-1 rounded-full mb-2 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
