import { parseYouTubeId, youTubeEmbedUrl } from '@/utils/youtube';

/** The background stands in for a loader: an onLoad-driven skeleton can miss a load that ends before hydration. */
export function VideoPlayer({ url, title }: { url?: string; title?: string }) {
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
      src={youTubeEmbedUrl(id, { autoplay: '1' })}
      title={title ?? 'Tutorial video'}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
    />
  );
}
