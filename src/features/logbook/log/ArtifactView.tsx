// Bytes are read once when the tab opens (a saved file never changes), never for the list.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Markdown } from '@tiptap/markdown';
import { EditorContent, useEditor } from '@tiptap/react';
import { clamp, isNil, isNotNil } from 'es-toolkit';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ArtifactKind,
  documentTextQuery,
  fileBlobQuery,
  fileTextQuery,
  logFilesQuery,
} from '@/features/logbook/api/log-files';
import { agoOf } from '@/features/logbook/board/Rail';
import { CodeView, CsvTable, sizeOf } from '@/features/logbook/editor/blocks/FileView';
import { withViews } from '@/features/logbook/editor/extensions';
import { LinesSkeleton } from '@/features/logbook/elements/skeletons';
import { ArtifactIcon } from '@/features/logbook/log/ArtifactIcon';
import { useLogContext } from '@/features/logbook/log/context';
import { CONTROL } from '@/features/logbook/log/controls';
import { Icon } from '@/features/logbook/ui/icons';
import { useObjectUrl } from '@/hooks/use-object-url';

import type { PointerEvent as ReactPointerEvent } from 'react';
import type { IArtifact } from '@/features/logbook/api/log-files';

const NOTE = 'p-6 text-[14px] text-neutral-4';
const TOOL =
  'grid size-8 place-items-center rounded-full text-primary-9 transition-colors hover:bg-fill-2';

export const savedOf = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

function PageReader({ text }: { readonly text: string }) {
  const reader = useEditor({ extensions: [...withViews(), Markdown], editable: false });
  useEffect(() => {
    reader.commands.setContent(text, { contentType: 'markdown' });
  }, [reader, text]);
  return (
    <article className="mx-auto max-w-[760px] px-8 pt-5 pb-16 max-md:px-4">
      <EditorContent editor={reader} className="rl-editor rl-editor-read" />
    </article>
  );
}

const ZOOM_MIN = 0.05;
const ZOOM_MAX = 16;
const ZOOM_STEP = 1.25;

interface IView {
  readonly scale: number;
  readonly x: number; // offset from the box's centre, px
  readonly y: number;
}

// Zoom so the point under the pointer stays put.
const zoomAt = (view: IView, factor: number, px: number, py: number): IView => {
  const scale = clamp(view.scale * factor, ZOOM_MIN, ZOOM_MAX);
  const k = scale / view.scale;
  return { scale, x: px - (px - view.x) * k, y: py - (py - view.y) * k };
};

// CSS transform only: the browser composites it, no re-layout.
function ImageViewer({ src, alt }: { readonly src: string; readonly alt: string }) {
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ readonly x: number; readonly y: number } | null>(null);
  const [natural, setNatural] = useState<{ readonly w: number; readonly h: number } | null>(null);
  const [view, setView] = useState<IView>({ scale: 1, x: 0, y: 0 });

  const fitScale = useCallback((): number => {
    const el = box.current;
    if (isNil(el) || isNil(natural)) return 1;
    return Math.min(1, (el.clientWidth - 48) / natural.w, (el.clientHeight - 48) / natural.h);
  }, [natural]);
  const fit = useCallback(() => setView({ scale: fitScale(), x: 0, y: 0 }), [fitScale]);
  useEffect(fit, [fit]);

  // Non-passive so the page doesn't scroll while zooming.
  useEffect(() => {
    const el = box.current;
    if (isNil(el)) return;
    const wheel = (event: WheelEvent): void => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = event.clientX - rect.left - rect.width / 2;
      const py = event.clientY - rect.top - rect.height / 2;
      setView((v) => zoomAt(v, Math.exp(-event.deltaY * 0.0015), px, py));
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, []);

  const down = (event: ReactPointerEvent<HTMLDivElement>): void => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX - view.x, y: event.clientY - view.y };
  };
  const move = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const start = drag.current;
    if (isNil(start)) return;
    setView((v) => ({ ...v, x: event.clientX - start.x, y: event.clientY - start.y }));
  };
  const up = (): void => {
    drag.current = null;
  };

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={box}
        className="absolute inset-0 cursor-grab touch-none overflow-hidden bg-soft outline-none select-none active:cursor-grabbing"
        role="img"
        aria-label={alt}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: focusable for keyboard zoom and pan
        tabIndex={0}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onDoubleClick={() =>
          Math.abs(view.scale - fitScale()) < 0.01 ? setView({ scale: 1, x: 0, y: 0 }) : fit()
        }
        onKeyDown={(event) => {
          if (event.key === '+' || event.key === '=') setView((v) => zoomAt(v, ZOOM_STEP, 0, 0));
          if (event.key === '-') setView((v) => zoomAt(v, 1 / ZOOM_STEP, 0, 0));
          if (event.key === '0') fit();
        }}
      >
        <img
          className="pointer-events-none absolute top-1/2 left-1/2 max-w-none"
          style={{
            transform: `translate(-50%, -50%) translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          }}
          src={src}
          alt={alt}
          draggable={false}
          onLoad={(event) =>
            setNatural({
              w: event.currentTarget.naturalWidth,
              h: event.currentTarget.naturalHeight,
            })
          }
        />
      </div>
      <div className="pop absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full p-1">
        <button
          type="button"
          className={TOOL}
          aria-label="Zoom out"
          onClick={() => setView((v) => zoomAt(v, 1 / ZOOM_STEP, 0, 0))}
        >
          <Icon name="minus" size={15} stroke={2.4} />
        </button>
        <span className="w-14 text-center text-[12px] font-bold tabular-nums">
          {Math.round(view.scale * 100)}%
        </span>
        <button
          type="button"
          className={TOOL}
          aria-label="Zoom in"
          onClick={() => setView((v) => zoomAt(v, ZOOM_STEP, 0, 0))}
        >
          <Icon name="plus" size={15} stroke={2.4} />
        </button>
        <span className="mx-1 h-4 w-px bg-rule" />
        <button
          type="button"
          className="h-8 rounded-full px-3 text-[12px] font-bold hover:bg-fill-2"
          onClick={fit}
        >
          Fit
        </button>
        <button
          type="button"
          className="h-8 rounded-full px-3 text-[12px] font-bold hover:bg-fill-2"
          onClick={() => setView({ scale: 1, x: 0, y: 0 })}
        >
          100%
        </button>
      </div>
    </div>
  );
}

function Details({ artifact }: { readonly artifact: IArtifact }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <ArtifactIcon artifact={artifact} size={64} />
      <strong className="text-[17px]">{artifact.name}</strong>
      <p className="max-w-[360px] text-[14px] text-neutral-4">
        This type has no viewer here. Download it to open it with its own program.
      </p>
    </div>
  );
}

function save(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  // After the click has handed the file to the browser.
  setTimeout(() => URL.revokeObjectURL(url));
}

function useSource(artifact: IArtifact) {
  const { project, logId } = useLogContext();
  const listing = useQuery(logFilesQuery(logId, project));
  const folderId = listing.data?.folderId ?? '';
  const path = artifact.path ?? '';
  return {
    project,
    logId,
    folderId,
    path,
    isFile: isNotNil(artifact.path) && folderId.length > 0,
  };
}

export function ArtifactBar({
  artifact,
  onOpenPage,
}: {
  readonly artifact: IArtifact;
  readonly onOpenPage: (() => void) | null;
}) {
  const { project, logId, folderId, path, isFile } = useSource(artifact);
  const client = useQueryClient();
  const download = async (): Promise<void> => {
    if (isNotNil(artifact.assetId)) {
      const text = await client.fetchQuery(documentTextQuery(logId, artifact.assetId, project));
      return save(new Blob([text], { type: 'text/markdown' }), `${artifact.name}.md`);
    }
    if (isFile)
      save(await client.fetchQuery(fileBlobQuery(logId, folderId, path, project)), artifact.name);
  };
  return (
    <>
      <span className="min-w-0 flex-1 truncate text-[13px] text-neutral-4">
        <b className="font-semibold text-primary-9">{artifact.where}</b>
        {' · '}
        {sizeOf(artifact.size)}
        {isNil(artifact.savedAt) ? null : (
          <span title={savedOf(artifact.savedAt)}> · saved {agoOf(artifact.savedAt)}</span>
        )}
        {' · read-only'}
      </span>
      {isNil(onOpenPage) ? null : (
        <button
          type="button"
          className={`${CONTROL} bg-[#e8f3fc] text-[#0050b3] hover:bg-[#d6eafb]`}
          title="Open the live page, where it is edited"
          onClick={onOpenPage}
        >
          <Icon name="pencil" size={15} />
          <span className="@max-[420px]/pane:hidden!">Open the page</span>
        </button>
      )}
      <button
        type="button"
        className={`${CONTROL} bg-fill-2 text-primary-9 hover:bg-fill-item-hover`}
        aria-label={`Download ${artifact.name}`}
        onClick={() => void download()}
      >
        <Icon name="download" size={15} />
        <span className="@max-[420px]/pane:hidden!">Download</span>
      </button>
    </>
  );
}

export function ArtifactView({ artifact }: { readonly artifact: IArtifact }) {
  const { project, logId, folderId, path, isFile } = useSource(artifact);
  const binary =
    artifact.kind === ArtifactKind.Image ||
    artifact.kind === ArtifactKind.Pdf ||
    artifact.kind === ArtifactKind.Other;
  const blob = useQuery({
    ...fileBlobQuery(logId, folderId, path, project),
    enabled: isFile && binary && artifact.kind !== ArtifactKind.Other,
  });
  const fileText = useQuery({
    ...fileTextQuery(logId, folderId, path, project),
    enabled: isFile && !binary,
  });
  const docText = useQuery({
    ...documentTextQuery(logId, artifact.assetId ?? '', project),
    enabled: isNotNil(artifact.assetId),
  });
  const text = isNotNil(artifact.assetId) ? docText : fileText;
  // A PDF frame only ever gets a PDF: a blob URL runs with this app's origin.
  const blobUrl = useObjectUrl(
    blob.data,
    artifact.kind === ArtifactKind.Pdf ? 'application/pdf' : undefined
  );

  if (artifact.kind === ArtifactKind.Other) return <Details artifact={artifact} />;
  const loading = binary ? blob : text;
  // The bytes may be in before their URL is.
  if (loading.isPending || (binary && blob.isSuccess && isNil(blobUrl)))
    return (
      <div className={NOTE} role="status" aria-label={`Opening ${artifact.name}`}>
        <LinesSkeleton count={5} />
      </div>
    );
  if (loading.isError) return <p className={NOTE}>{artifact.name} could not be read.</p>;
  if (artifact.kind === ArtifactKind.Image && isNotNil(blobUrl))
    return <ImageViewer src={blobUrl} alt={artifact.name} />;
  if (artifact.kind === ArtifactKind.Pdf && isNotNil(blobUrl))
    return <iframe className="min-h-0 flex-1 border-0" src={blobUrl} title={artifact.name} />;
  const content = text.data ?? '';
  const scroll = 'scroll-thin min-h-0 flex-1 overflow-auto';
  if (artifact.kind === ArtifactKind.Markdown)
    return (
      <div className={scroll}>
        <PageReader text={content} />
      </div>
    );
  if (artifact.kind === ArtifactKind.Table)
    return (
      <div className={`${scroll} p-4`}>
        <CsvTable text={content} />
      </div>
    );
  return (
    <div className={`${scroll} bg-code-bg`}>
      <CodeView text={content} name={artifact.name} />
    </div>
  );
}
