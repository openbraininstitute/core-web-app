'use client';

import { RiArrowLeftLine, RiArrowRightLine, RiCursorFill, RiDownloadLine } from '@remixicon/react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { listBox } from '@/features/learn/ui/category-tiles';
import { makeWalkthroughPdf } from '@/features/learn/walkthrough-pdf';
import { type IWalkthrough, WALKTHROUGHS } from '@/features/learn/walkthroughs';
import { Skeleton } from '@/ui/molecules/skeleton';
import { cn } from '@/utils/css-class';

const WalkthroughPdfView = dynamic(() => import('./walkthrough-pdf-view'), {
  ssr: false,
  loading: () => <Skeleton className="aspect-[842/595] w-full rounded-[14px]" />,
});

const WalkthroughView = { Steps: 'steps', Video: 'video', Pdf: 'pdf' } as const;
type TWalkthroughView = (typeof WalkthroughView)[keyof typeof WalkthroughView];
const VIEW_LABEL: Record<TWalkthroughView, string> = {
  [WalkthroughView.Steps]: 'Steps',
  [WalkthroughView.Video]: 'Video',
  [WalkthroughView.Pdf]: 'PDF',
};

/** The room under the header on a wide screen, what is in it as large as fits without scrolling. */
const STAGE = 'flex items-center justify-center lg:min-h-0 lg:flex-1 lg:[container-type:size]';
const fitted = (w: number, h: number) => ({
  aspectRatio: `${w} / ${h}`,
  width: `min(100%, calc(100cqh * ${w} / ${h}))`,
});

const pct = (value: number, of: number) => `${(100 * value) / of}%`;

/** The left-hand side: the walkthroughs in the faint box, each with its first screenshot. */
export function WalkthroughsIndex({
  selected,
  onSelect,
}: {
  selected: IWalkthrough;
  onSelect: (id: string) => void;
}) {
  const lb = listBox();
  return (
    <div className={lb.box}>
      <ul className="secondary-scrollbar -mr-[6px] flex min-h-0 flex-col gap-[9px] overflow-y-auto pr-[6px]">
        {WALKTHROUGHS.map((w) => {
          const on = w.id === selected.id;
          return (
            <li key={w.id}>
              <button
                type="button"
                aria-pressed={on}
                data-learn="row"
                data-testid={`learn-walkthrough-${w.id}`}
                onClick={() => onSelect(w.id)}
                className={cn(
                  'flex w-full items-center gap-[14px] rounded-[12px] p-[12px] text-left transition-shadow',
                  on
                    ? 'bg-[#bae7ff] shadow-[inset_0_0_0_1.5px_#003a8c]'
                    : 'bg-white shadow-[inset_0_0_0_1px_#f0f0f0] hover:shadow-[inset_0_0_0_1px_#d9d9d9]'
                )}
              >
                {/* biome-ignore lint/performance/noImgElement: a small static thumbnail */}
                <img
                  src={w.steps[0].image}
                  alt=""
                  className="h-[58px] w-[92px] shrink-0 rounded-[8px] object-cover object-left-top shadow-[inset_0_0_0_1px_#f0f0f0]"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <span className="text-[14px] leading-[19px] font-semibold text-[#002766]">
                    {w.title}
                  </span>
                  <span className="line-clamp-2 text-[12px] leading-[17px] text-[#8c8c8c]">
                    {w.short}
                  </span>
                  <span className="text-[11px] leading-[15px] font-semibold text-[#8c8c8c]">
                    {w.steps.length} steps
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * The right-hand side: the walkthrough a click at a time. Its screenshot is dimmed but for the place
 * to click next, which a pointer moves to; a click there, or Next, goes on.
 */
export function WalkthroughCard({
  walkthrough,
  project,
  className,
}: {
  walkthrough: IWalkthrough;
  project: string;
  className?: string;
}) {
  const clicks = walkthrough.steps.flatMap((step, s) =>
    step.clicks.map((click, c) => ({ ...click, image: click.image ?? step.image, s, c }))
  );
  const [at, setAt] = useState(0);
  const now = clicks[at];
  const last = at === clicks.length - 1;
  const { box } = now;
  const { shot } = walkthrough;
  const images = [...new Set(clicks.map((click) => click.image))];
  const next = () => setAt((i) => Math.min(i + 1, clicks.length - 1));
  const [view, setView] = useState<TWalkthroughView>(WalkthroughView.Steps);
  // the PDF, made when it is first looked at
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFailed, setPdfFailed] = useState(false);
  const wantsPdf = view === WalkthroughView.Pdf;
  useEffect(() => {
    if (!wantsPdf) return;
    let gone = false;
    let url: string | null = null;
    makeWalkthroughPdf(walkthrough).then(
      (pdf) => {
        if (gone) return;
        url = URL.createObjectURL(pdf);
        setPdfUrl(url);
        setPdfFailed(false);
      },
      () => {
        if (!gone) setPdfFailed(true);
      }
    );
    return () => {
      gone = true;
      setPdfUrl(null);
      if (url) URL.revokeObjectURL(url);
    };
  }, [wantsPdf, walkthrough]);
  const download = {
    [WalkthroughView.Steps]: null,
    [WalkthroughView.Video]: walkthrough.video?.src
      ? { href: walkthrough.video.src, name: `${walkthrough.id}.mp4` }
      : null,
    [WalkthroughView.Pdf]: pdfUrl ? { href: pdfUrl, name: `${walkthrough.id}.pdf` } : null,
  }[view];
  // the step shown kept in view in the strip, which alone scrolls for it
  const strip = useRef<HTMLOListElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the strip is a new one when the steps are back on show
  useEffect(() => {
    const list = strip.current;
    const item = list?.children[now.s] as HTMLElement | undefined;
    if (!list || !item) return;
    list.scrollTo({
      left: item.offsetLeft - (list.clientWidth - item.clientWidth) / 2,
      behavior: 'smooth',
    });
  }, [now.s, view]);
  const radius = now.radius === undefined ? '999px' : `${now.radius}px`;

  return (
    <section
      data-testid="learn-walkthrough-card"
      className={cn(
        className,
        'flex flex-col gap-[14px] px-[28px] pt-[18px] pb-[18px] max-md:px-[14px] lg:overflow-hidden'
      )}
    >
      <header
        data-learn="head"
        className="flex shrink-0 flex-wrap items-end justify-between gap-x-[20px] gap-y-[8px]"
      >
        <div className="flex min-w-0 flex-col gap-[5px]">
          <p className="text-[12.5px] leading-[17px] text-[#8c8c8c]">
            {view === WalkthroughView.Steps
              ? `Walkthrough · step ${now.s + 1} of ${walkthrough.steps.length}`
              : `Walkthrough · ${walkthrough.steps.length} steps`}
          </p>
          <h1 className="text-[28px] leading-[34px] font-bold text-[#002766]">
            {walkthrough.title}
          </h1>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-[8px]">
          <div className="flex rounded-full border border-[#e8e8e8] p-[3px]" role="tablist">
            {Object.values(WalkthroughView)
              .filter((v) => v !== WalkthroughView.Video || walkthrough.video?.src)
              .map((v) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={view === v}
                  data-testid={`learn-walkthrough-view-${v}`}
                  onClick={() => setView(v)}
                  className={cn(
                    'h-[30px] rounded-full px-[14px] text-[13px] font-semibold transition-colors',
                    view === v ? 'bg-[#002766] text-white' : 'text-[#003a8c] hover:bg-[#f5f9ff]'
                  )}
                >
                  {VIEW_LABEL[v]}
                </button>
              ))}
          </div>
          {download && (
            <a
              href={download.href}
              download={download.name}
              data-testid="learn-walkthrough-download"
              className="flex h-[38px] items-center gap-[6px] rounded-full bg-[#389e0d] px-[18px] text-[13px] font-semibold text-white! transition-colors hover:bg-[#237804]"
            >
              <RiDownloadLine className="size-[16px]" />
              Download
            </a>
          )}
          {view === WalkthroughView.Steps && (
            <>
              <button
                type="button"
                data-testid="learn-walkthrough-back"
                disabled={at === 0}
                onClick={() => setAt((i) => Math.max(i - 1, 0))}
                className="flex h-[38px] items-center gap-[6px] rounded-full border border-[#e8e8e8] px-[16px] text-[13px] font-semibold text-[#003a8c] hover:bg-[#f5f9ff] disabled:opacity-40"
              >
                <RiArrowLeftLine className="size-[16px]" />
                Back
              </button>
              {last ? (
                <Link
                  href={`${project}${walkthrough.tryIt.path}`}
                  className="flex h-[38px] items-center gap-[6px] rounded-full bg-[#389e0d] px-[18px] text-[13px] font-semibold text-white! transition-colors hover:bg-[#237804]"
                >
                  {walkthrough.tryIt.label}
                  <RiArrowRightLine className="size-[16px]" />
                </Link>
              ) : (
                <button
                  type="button"
                  data-testid="learn-walkthrough-next"
                  onClick={next}
                  className="flex h-[38px] items-center gap-[6px] rounded-full bg-[#002766] px-[18px] text-[13px] font-semibold text-white hover:bg-[#003a8c]"
                >
                  Next
                  <RiArrowRightLine className="size-[16px]" />
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {view === WalkthroughView.Video && walkthrough.video?.src && (
        <div className={STAGE}>
          {/* biome-ignore lint/a11y/useMediaCaption: what is said is written under the picture */}
          <video
            key={walkthrough.id}
            data-testid="learn-walkthrough-video"
            controls
            playsInline
            preload="metadata"
            src={walkthrough.video.src}
            poster={walkthrough.steps[0].image}
            className="rounded-[14px] border border-[#e8e8e8] bg-[#002766]"
            style={fitted(16, 9)}
          />
        </div>
      )}
      {wantsPdf && (
        <div
          data-testid="learn-walkthrough-pdf"
          className="lg:min-h-0 lg:flex-1 lg:[container-type:size]"
        >
          {pdfUrl && <WalkthroughPdfView url={pdfUrl} />}
          {!pdfUrl && !pdfFailed && <Skeleton className="aspect-[842/595] w-full rounded-[14px]" />}
          {pdfFailed && (
            <p className="p-10 text-center text-[15px] text-[#8c8c8c]">
              The PDF could not be made.
            </p>
          )}
        </div>
      )}
      {view === WalkthroughView.Steps && (
        <>
          <div className={STAGE}>
            <div
              className="relative overflow-hidden rounded-[14px] border border-[#e8e8e8] bg-[#f5f5f5]"
              style={fitted(shot.w, shot.h)}
            >
              {images.map((image) => (
                // biome-ignore lint/performance/noImgElement: static screenshots, all there to fade between
                <img
                  key={image}
                  src={image}
                  alt={image === now.image ? `${walkthrough.steps[now.s].title}: ${now.text}` : ''}
                  draggable={false}
                  className={cn(
                    'absolute inset-0 size-full transition-opacity duration-300',
                    image === now.image ? 'opacity-100' : 'opacity-0'
                  )}
                />
              ))}
              {/* the place to click, the rest of the screenshot dimmed round it */}
              <button
                type="button"
                data-testid="learn-walkthrough-spot"
                aria-label={now.text}
                onClick={next}
                className={cn(
                  'absolute shadow-[0_0_0_200vmax_rgb(0_16_38/0.38)] ring-[3px] ring-[#52c41a] transition-[left,top,width,height] duration-500 ease-out motion-reduce:transition-none',
                  last ? 'cursor-default' : 'cursor-pointer'
                )}
                style={{
                  left: pct(box.x, shot.w),
                  top: pct(box.y, shot.h),
                  width: pct(box.w, shot.w),
                  height: pct(box.h, shot.h),
                  borderRadius: radius,
                }}
              >
                <span
                  key={at}
                  className="absolute inset-0 animate-ping border-[3px] border-[#52c41a] [animation-duration:1.6s] motion-reduce:hidden"
                  style={{ borderRadius: radius }}
                />
              </button>
              <RiCursorFill
                aria-hidden
                className="pointer-events-none absolute size-[28px] text-[#002766] drop-shadow-[0_1px_2px_rgb(255_255_255/0.9)] transition-[left,top] delay-100 duration-700 ease-out motion-reduce:transition-none"
                style={{
                  left: pct(box.x + box.w / 2, shot.w),
                  top: pct(box.y + box.h * 0.62, shot.h),
                }}
              />
            </div>
          </div>

          <ol
            ref={strip}
            data-testid="learn-walkthrough-steps"
            className="secondary-scrollbar relative -mx-[28px] flex shrink-0 gap-[12px] overflow-x-auto px-[28px] pb-[10px] max-md:-mx-[14px] max-md:px-[14px]"
          >
            {walkthrough.steps.map((s, i) => {
              const on = i === now.s;
              const first = clicks.findIndex((click) => click.s === i);
              return (
                <li
                  key={s.title}
                  className={cn(
                    'flex w-[252px] shrink-0 flex-col gap-[6px] rounded-[12px] border p-[10px] transition-colors',
                    on ? 'border-[#002766] bg-[#f5f9ff]' : 'border-[#f0f0f0] bg-white'
                  )}
                >
                  <button
                    type="button"
                    aria-current={on ? 'step' : undefined}
                    onClick={() => setAt(first)}
                    className="flex items-center gap-[10px] px-[4px] text-left text-[14px] leading-[19px] font-bold text-[#002766]"
                  >
                    <span
                      className={cn(
                        'flex size-[26px] shrink-0 items-center justify-center rounded-full text-[13px]',
                        on ? 'bg-[#002766] text-white' : 'bg-[#f0f5ff] text-[#002766]'
                      )}
                    >
                      {i + 1}
                    </span>
                    {s.title}
                  </button>
                  {s.clicks.map((click, c) => {
                    const here = on && c === now.c;
                    return (
                      <button
                        key={click.text}
                        type="button"
                        onClick={() => setAt(first + c)}
                        className={cn(
                          'rounded-[8px] px-[8px] py-[4px] text-left text-[13px] leading-[18px] transition-colors',
                          here
                            ? 'bg-[#f6ffed] font-semibold text-[#237804]'
                            : 'text-[#595959] hover:bg-[#fafafa]'
                        )}
                      >
                        {click.text}
                      </button>
                    );
                  })}
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}
