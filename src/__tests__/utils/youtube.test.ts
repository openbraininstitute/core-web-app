import { describe, expect, it } from 'vitest';

import { parseYouTubeId } from '@/utils/youtube';

describe('parseYouTubeId', () => {
  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ?si=abc',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    ' dQw4w9WgXcQ ',
  ])('extracts the id from %s', (input) => {
    expect(parseYouTubeId(input)).toBe('dQw4w9WgXcQ');
  });

  it.each([
    '',
    null,
    undefined,
    'https://player.vimeo.com/progressive_redirect/playback/1129107045/rendition/1080p/file.mp4',
    'https://evilyoutube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=short',
  ])('rejects %s', (input) => {
    expect(parseYouTubeId(input)).toBeNull();
  });
});
