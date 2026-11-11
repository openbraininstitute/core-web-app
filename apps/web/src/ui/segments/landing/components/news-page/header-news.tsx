import type { ContentForNewsItem } from '@/services/sanity/api/get-news-item';

export default function HeaderNews({ content }: { content: ContentForNewsItem }) {
  return (
    <header className="text-primary-2 relative w-screen bg-[#00317D] px-[18vw] pt-[26vh] pb-[20vh] text-lg">
      <div className="flex flex-row items-center">
        <div className="font-semibold tracking-wider uppercase">News</div>
        <div className="border-primary-7 mx-2 rounded-3xl border border-solid px-3 py-1 tracking-wider uppercase">
          {content.category}
        </div>
        <div>
          Published{' '}
          {new Date(content.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>
      <h1 className="mb-4 font-serif text-[4.5em] leading-tight font-normal text-white">
        {content.title}
      </h1>
      <h2 className="text-primary-1 border-primary-7 border-y border-solid py-6 text-xl leading-[1.55] font-normal">
        {content.thumbnailIntroduction}
      </h2>
    </header>
  );
}
