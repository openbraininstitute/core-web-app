const ID = /^[\w-]{11}$/;
const HOSTS = new Set(['youtube.com', 'youtube-nocookie.com']);
const ID_PATHS = new Set(['embed', 'shorts', 'live', 'v']);

/** Video id from a watch / youtu.be / embed / shorts link, or a bare 11-char id. */
export function parseYouTubeId(input: string | null | undefined): string | null {
  const value = input?.trim();
  if (!value) return null;
  if (ID.test(value)) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^(www|m)\./, '');
  let id: string | null | undefined = null;
  const [, first, second] = url.pathname.split('/');
  if (host === 'youtu.be') id = first;
  else if (HOSTS.has(host)) id = url.searchParams.get('v') ?? (ID_PATHS.has(first) ? second : null);

  // /embed/videoseries is a playlist, though its name is 11 id-like characters
  return id && id !== 'videoseries' && ID.test(id) ? id : null;
}

/** Player parameters: https://developers.google.com/youtube/player_parameters */
export const youTubeEmbedUrl = (id: string, params: Record<string, string> = {}) =>
  `https://www.youtube-nocookie.com/embed/${id}?${new URLSearchParams({ rel: '0', playsinline: '1', ...params })}`;
