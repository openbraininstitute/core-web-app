import { fileLangOf, fileLooks } from '@/features/logbook/blocks/kinds';
import { extensionOf } from '@/features/logbook/editor/shiki';
import { ArtifactKind, FileLang } from '@/features/logbook/types';
import { Icon } from '@/ui/molecules/icon';

import type { IArtifact, IArtifactLook } from '@/features/logbook/types';

function lookOf(artifact: IArtifact): IArtifactLook {
  if (artifact.kind === ArtifactKind.Image) return { badge: '', bg: '#e8f1fb', fg: '#1677c9' };
  if (artifact.kind === ArtifactKind.Markdown) return { badge: 'MD', bg: '#eef2ff', fg: '#3730a3' };
  if (artifact.kind === ArtifactKind.Pdf) return { badge: 'PDF', bg: '#fdecea', fg: '#b42318' };
  const lang = fileLangOf(artifact.name);
  if (lang !== FileLang.File) return fileLooks[lang];
  const ext = extensionOf(artifact.name).slice(0, 4).toUpperCase();
  return { badge: ext.length > 0 ? ext : 'FILE', bg: '#f0f2f5', fg: '#262626' };
}

export function ArtifactIcon({
  artifact,
  size = 36,
}: {
  readonly artifact: IArtifact;
  readonly size?: number;
}) {
  const look = lookOf(artifact);
  return (
    <span
      className="grid flex-none place-items-center rounded-[10px] font-bold tracking-[0.02em]"
      style={{
        width: size,
        height: size,
        background: look.bg,
        color: look.fg,
        fontSize: Math.max(8, Math.round(size * 0.29)),
        borderRadius: Math.round(size * 0.28),
      }}
      aria-hidden="true"
    >
      {artifact.kind === ArtifactKind.Image ? (
        <Icon name="image" size={Math.round(size * 0.5)} />
      ) : (
        look.badge
      )}
    </span>
  );
}
