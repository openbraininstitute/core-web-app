import { ContentForGlossaryItem } from '../hooks/use-sanity-content-for-glossary';

export default function GlossaryContent({ content }: { content: ContentForGlossaryItem | null }) {
  return (
    <div className="w-full pl-16 pt-[105px] text-white">
      <header className="mb-4">
        <h1 className="mb-3 text-3xl font-bold">{content?.Name}</h1>
        <div className="flex flex-row gap-x-4 border-y border-solid border-primary-6 py-3">
          <div className="flex flex-row gap-y-2">
            <span className="mr-1 block text-primary-3">Scale:</span>
            <span>{content?.Scale}</span>
          </div>
          <div className="flex flex-row gap-y-2">
            <span className="mr-1 block text-primary-3">Data Type:</span>
            <span>{content?.Data_Type}</span>
          </div>
        </div>
      </header>
      <p className="text-lg leading-normal">{content?.Description}</p>
    </div>
  );
}
