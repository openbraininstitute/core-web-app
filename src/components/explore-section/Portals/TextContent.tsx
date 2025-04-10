import { Portal } from '@/types/explore-portal';

export default function TextContent({ content }: { content: Portal }) {
  const contentDescription = `${content.description.slice(0, 110)}...`;

  return (
    <div className="flex w-full flex-col items-start justify-center pl-5">
      <h2 className="text-3xl leading-none font-bold text-white">{content.name}</h2>

      <div className="mt-3 mb-2 flex flex-row items-center">
        <div className="flex flex-row items-center gap-x-1">
          {content.categories.map((category: string) => (
            <div
              className="bg-primary-9 text-primary-0 rounded-3xl px-4 py-1 text-sm font-light"
              key={`category-portal-${category}`}
            >
              {category}
            </div>
          ))}
        </div>
        <div className="text-primary-2 ml-2 text-xs font-normal">
          Last update: {content.lastUpdate}
        </div>
      </div>

      <p className="text-primary-1 leading-tight font-light">{contentDescription}</p>
    </div>
  );
}
