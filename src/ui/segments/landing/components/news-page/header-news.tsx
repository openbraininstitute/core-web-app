import type { ContentForNewsItem } from '@/services/sanity/api/get-news-item';

export default function HeaderNews({ content }: { content: ContentForNewsItem }) {
  return (
    <header className="text-primary-9 relative w-screen bg-white px-[18vw] pt-[clamp(96px,16vh,160px)] max-sm:px-[20px] pb-[clamp(32px,6vh,72px)] text-[15px]">
      <div className="flex flex-row items-center">
        <div className="font-semibold tracking-wider uppercase">News</div>
        <div className="mx-2 rounded-3xl border border-solid border-neutral-300 px-3 py-1 tracking-wider uppercase">
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
      <h1 className="text-primary-9 mt-[20px] mb-[20px] font-serif text-[clamp(32px,4vw,56px)] leading-[1.1] font-normal">
        {content.title}
      </h1>
      <h2 className="border-y border-solid border-neutral-200 py-6 text-[18px] leading-[1.55] font-normal text-[#465873]">
        {content.thumbnailIntroduction}
      </h2>
    </header>
  );
}
