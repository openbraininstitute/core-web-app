import { parseYouTubeId, youTubeEmbedUrl } from '@/utils/youtube';

/**
 * The background stands in for a loader: an onLoad-driven skeleton can miss a load that ends before hydration.
 * `muted` for one started without a click, which a browser only lets play silent.
 */
export function VideoPlayer({ url, title, muted }: { url?: string; title?: string; muted?: boolean }) {
  if (!url) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl bg-primary-9">
        <p className="text-white text-lg">No video selected</p>
      </div>
    );
  }

  const id = parseYouTubeId(url);

  if (!id) {
    // file URLs keep playing until Sanity holds only YouTube links
    return (
      <video
        playsInline
        autoPlay
        muted={muted}
        controls
        className="h-full w-full rounded-xl bg-primary-9 object-contain"
        src={url}
      >
        <track kind="captions" srcLang="en" label="English captions" />
      </video>
    );
  }

  return (
    <iframe
      className="h-full w-full rounded-xl bg-primary-9"
      src={youTubeEmbedUrl(id, muted ? { autoplay: '1', mute: '1' } : { autoplay: '1' })}
      title={title ?? 'Tutorial video'}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
    />
  );
}
