'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/utils/css-class';

import { BrainScene, DEFAULT_LOOK } from './brain-scene';

import type { ReactNode } from 'react';
import type { IBrainLook, IBrainModel, IBrainPart, TColourMode, TSliceAxis, TView } from './brain-scene';

/** The selection's card: what it is, and its colour. */
export interface IFocusInfo {
  title: string;
  subtitle?: string;
  colour?: string;
}

const PANEL =
  'rounded-2xl border border-white/10 bg-[rgba(18,21,32,0.78)] text-[#eceef5] shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl backdrop-saturate-150';
const GROUP_LABEL = 'text-[10.5px] font-semibold tracking-[0.8px] text-[#9aa0b4] uppercase';
const RANGE = 'h-[26px] w-[104px] cursor-pointer accent-[#7aa5f5] disabled:opacity-30';

const COLOUR_LABELS: Record<TColourMode, string> = { natural: 'Natural', lobes: 'Lobes', regions: 'Regions' };
const VIEW_LABELS: Array<[TView, string]> = [
  ['left', 'Left'],
  ['right', 'Right'],
  ['front', 'Front'],
  ['back', 'Back'],
  ['top', 'Top'],
  ['bottom', 'Bottom'],
];
const SLICES: Array<[TSliceAxis, string, string]> = [
  ['off', 'Off', ''],
  ['sag', 'Side', 'Sagittal: left–right'],
  ['cor', 'Front', 'Coronal: front–back'],
  ['axi', 'Top', 'Axial: top–down'],
];

function Seg({ children }: { children: ReactNode }) {
  return <div className="flex rounded-[9px] border border-white/10 bg-black/30 p-0.5">{children}</div>;
}

function SegButton({
  on,
  onClick,
  title,
  children,
}: {
  on?: boolean;
  onClick: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'rounded-[7px] px-[9px] py-[5px] text-[12px] transition-colors',
        on ? 'bg-[rgba(122,165,245,0.3)] text-white' : 'text-[#c5c9d8] hover:text-white'
      )}
    >
      {children}
    </button>
  );
}

function Group({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[5px]">
      <span className={GROUP_LABEL}>{label}</span>
      {children}
    </div>
  );
}

/**
 * A brain drawn as the user's Brain Explorer draws one, with its controls: views, hemispheres, the surface turned to
 * glass, the parts pulled apart, a slice, the colouring, spin and reset. Hovering names a part; a click picks it
 * (`onPick`), a double click flies to what is focused. `compact` is the small one in a card: the brain alone, to
 * turn by dragging.
 */
export function BrainExplorer({
  model,
  extras,
  points,
  focus,
  focusInfo,
  onPick,
  compact = false,
  zoom,
  clear,
  className,
}: {
  model: IBrainModel | null;
  extras?: IBrainPart[];
  points?: { data: Float32Array; colour: string } | null;
  focus: string[] | null;
  focusInfo?: IFocusInfo | null;
  onPick?: (part: IBrainPart | null) => void;
  compact?: boolean;
  zoom?: number;
  /** the colour the canvas clears to; see-through when not given */
  clear?: string;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState<BrainScene | null>(null);
  const [look, setLook] = useState<IBrainLook>({ ...DEFAULT_LOOK, colourMode: model?.colourMode ?? 'regions' });
  // the surface the focus turned to glass, to give back when it goes
  const autoSurface = useRef<number | null>(null);
  const down = useRef<{ x: number; y: number; button: number } | null>(null);
  const hoverAt = useRef<{ x: number; y: number } | null>(null);
  const hoverFrame = useRef(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    // a canvas of its own each time: a disposed scene gives its context up, which leaves its canvas with none
    const canvas = document.createElement('canvas');
    canvas.className =
      'absolute inset-0 block h-full w-full cursor-grab touch-none outline-none active:cursor-grabbing';
    host.prepend(canvas);
    const s = new BrainScene(canvas, { compact, zoom: zoom ?? (compact ? 1.6 : 1), clear, inset: compact ? 0 : 110 });
    setScene(s);
    return () => {
      s.dispose();
      canvas.remove();
      setScene(null);
    };
    // a new scene only for a new canvas
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scene) scene.label = compact ? null : labelRef.current;
  }, [scene, compact]);

  useEffect(() => {
    if (scene && zoom !== undefined) scene.setZoom(zoom);
  }, [scene, zoom]);

  // a new brain starts in its own colours
  const modelKey = model?.key;
  useEffect(() => {
    if (model) setLook((l) => ({ ...l, colourMode: model.colourMode }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelKey]);

  useEffect(() => scene?.setModel(model), [scene, model]);
  useEffect(() => scene?.setExtras(extras ?? []), [scene, extras]);
  useEffect(() => scene?.setPoints(points?.data ?? null, points?.colour), [scene, points]);
  useEffect(() => scene?.setLook(look), [scene, look]);

  const focusKey = focus?.join('|') ?? '';
  useEffect(() => {
    if (!scene) return;
    scene.setFocus(focus);
    // what lies under the cortex shows through it, and the cortex comes back when it goes
    if (focus && scene.hidden(focus)) {
      setLook((l) => {
        if (l.surface <= 0.4) return l;
        autoSurface.current = l.surface;
        return { ...l, surface: 0.14 };
      });
    } else if (autoSurface.current !== null) {
      const back = autoSurface.current;
      autoSurface.current = null;
      setLook((l) => ({ ...l, surface: back }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, focusKey, extras]);

  const set = (patch: Partial<IBrainLook>) => {
    autoSurface.current = null;
    setLook((l) => ({ ...l, ...patch }));
  };

  const showTip = (part: IBrainPart | null, x: number, y: number) => {
    const tip = tipRef.current;
    const host = hostRef.current;
    if (!tip || !host) return;
    if (!part || compact) {
      tip.style.opacity = '0';
      return;
    }
    const box = host.getBoundingClientRect();
    tip.textContent = part.name;
    if (part.group) {
      const small = document.createElement('small');
      small.className = 'ml-1.5 font-normal text-[#9aa0b4]';
      small.textContent = part.group;
      tip.appendChild(small);
    }
    tip.style.left = `${x - box.left + 14}px`;
    tip.style.top = `${y - box.top + 16}px`;
    tip.style.opacity = '1';
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (compact || e.pointerType === 'touch' || e.buttons) return;
    hoverAt.current = { x: e.clientX, y: e.clientY };
    if (hoverFrame.current) return;
    // one pick a frame at most: the meshes are a million triangles
    hoverFrame.current = requestAnimationFrame(() => {
      hoverFrame.current = 0;
      const at = hoverAt.current;
      if (!scene || !at) return;
      const part = scene.pick(at.x, at.y);
      scene.setHover(part?.id ?? null);
      showTip(part, at.x, at.y);
    });
  };

  const onPointerLeave = () => {
    hoverAt.current = null;
    scene?.setHover(null);
    showTip(null, 0, 0);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    down.current = { x: e.clientX, y: e.clientY, button: e.button };
    scene?.setHover(null);
    showTip(null, 0, 0);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = down.current;
    down.current = null;
    if (!d || !scene || !onPick || d.button !== 0) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > (e.pointerType === 'touch' ? 10 : 5)) return;
    onPick(scene.pick(e.clientX, e.clientY));
  };

  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      {/* the canvas (made with the scene) takes the pointer; its events come up here */}
      <div
        ref={hostRef}
        className="absolute inset-0"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onDoubleClick={() => focus && scene?.flyToParts(focus)}
      />
      {!compact && (
        <>
          {/* the focused part's name, pinned over it */}
          <div
            ref={labelRef}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full pb-[14px] whitespace-nowrap opacity-0 transition-opacity duration-200 after:absolute after:bottom-0 after:left-1/2 after:h-[14px] after:w-px after:bg-white/60 before:absolute before:-bottom-[3px] before:left-1/2 before:-ml-[3px] before:size-[7px] before:rounded-full before:bg-white before:shadow-[0_0_8px_#fff]"
          >
            {focusInfo && (
              <span className="block rounded-full border border-white/30 bg-[rgba(10,12,20,0.82)] px-2.5 py-1 text-[12px] font-semibold text-[#eceef5] shadow-[0_4px_14px_rgba(0,0,0,0.4)]">
                {focusInfo.title}
              </span>
            )}
          </div>
          <div
            ref={tipRef}
            className="pointer-events-none absolute z-10 rounded-[9px] border border-white/20 bg-[rgba(10,12,20,0.9)] px-[11px] py-1.5 text-[12.5px] font-semibold whitespace-nowrap text-[#eceef5] opacity-0"
          />
          {focusInfo && (
            <div className={cn(PANEL, 'absolute top-3 right-3 z-10 max-w-[280px] px-4 py-3')}>
              <div className="flex items-center gap-2">
                {focusInfo.colour && (
                  <span
                    className="size-2.5 shrink-0 rounded-full shadow-[0_0_0_2px_rgba(255,255,255,0.08)]"
                    style={{ background: focusInfo.colour }}
                  />
                )}
                <span className="text-[15px] leading-[19px] font-semibold">{focusInfo.title}</span>
              </div>
              {focusInfo.subtitle && <p className="mt-1 mb-0 text-[12px] text-[#9aa0b4]">{focusInfo.subtitle}</p>}
              <p className="mt-1.5 mb-0 text-[11px] text-[#9aa0b4]">Double-click to fly to it</p>
            </div>
          )}
          {model?.label && (
            <span
              title={model.credits}
              className="pointer-events-auto absolute top-3 left-14 z-10 rounded-full bg-[rgba(10,12,20,0.6)] px-3 py-1.5 text-[12px] font-medium text-white/90"
            >
              {model.label}
            </span>
          )}
          {model && (
            <div
              className={cn(
                PANEL,
                'absolute inset-x-3 bottom-3 z-10 mx-auto flex w-fit max-w-[calc(100%-24px)] flex-wrap justify-center gap-x-3.5 gap-y-2.5 px-4 pt-2.5 pb-3'
              )}
            >
              <Group label="View">
                <Seg>
                  {VIEW_LABELS.map(([v, label]) => (
                    <SegButton key={v} onClick={() => scene?.view(v)}>
                      {label}
                    </SegButton>
                  ))}
                </Seg>
              </Group>
              <Group label="Hemispheres">
                <Seg>
                  {(['L', 'R'] as const).map((h) => (
                    <SegButton
                      key={h}
                      on={look.show[h]}
                      onClick={() => set({ show: { ...look.show, [h]: !look.show[h] } })}
                    >
                      {h === 'L' ? 'Left' : 'Right'}
                    </SegButton>
                  ))}
                </Seg>
              </Group>
              <Group
                label={
                  <>
                    Surface{' '}
                    <output className="ml-1 font-medium tracking-normal text-[#eceef5] normal-case">
                      {look.surface > 0.98 ? 'solid' : look.surface < 0.02 ? 'hidden' : `${Math.round(look.surface * 100)}%`}
                    </output>
                  </>
                }
              >
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={look.surface}
                  aria-label="Surface opacity"
                  onChange={(e) => set({ surface: +e.target.value })}
                  className={RANGE}
                />
              </Group>
              <Group label="Pull apart">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={look.explode}
                  aria-label="Pull structures apart"
                  onChange={(e) => set({ explode: +e.target.value })}
                  className={RANGE}
                />
              </Group>
              <Group label="Slice">
                <Seg>
                  {SLICES.map(([a, label, title]) => (
                    <SegButton
                      key={a}
                      title={title || undefined}
                      on={look.slice.axis === a}
                      onClick={() => set({ slice: { ...look.slice, axis: a } })}
                    >
                      {label}
                    </SegButton>
                  ))}
                </Seg>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.005}
                  value={look.slice.t}
                  disabled={look.slice.axis === 'off'}
                  aria-label="Slice position"
                  onChange={(e) => set({ slice: { ...look.slice, t: +e.target.value } })}
                  className={cn(RANGE, 'h-[18px] w-full')}
                />
              </Group>
              {model.colourModes.length > 1 && (
                <Group label="Colour">
                  <Seg>
                    {model.colourModes.map((c) => (
                      <SegButton key={c} on={look.colourMode === c} onClick={() => set({ colourMode: c })}>
                        {COLOUR_LABELS[c]}
                      </SegButton>
                    ))}
                  </Seg>
                </Group>
              )}
              <Group label={' '}>
                <Seg>
                  <SegButton on={look.spin} onClick={() => set({ spin: !look.spin })}>
                    Spin
                  </SegButton>
                  <SegButton
                    onClick={() => {
                      autoSurface.current = null;
                      setLook({ ...DEFAULT_LOOK, colourMode: model.colourMode });
                      onPick?.(null);
                      scene?.home();
                    }}
                  >
                    Reset
                  </SegButton>
                </Seg>
              </Group>
            </div>
          )}
        </>
      )}
    </div>
  );
}
