import type { ContentForFeatures } from '@/services/sanity/api/get-features-content';

export default function FeatureBlock({ content }: { content: ContentForFeatures }) {
  return (
    <div
      data-page-section
      className="relative w-screen md:w-full min-h-screen md:h-dvh md:min-h-0 md:snap-start flex flex-col lg:flex-row items-center gap-12 flex-nowrap py-[16vh] px-4 sm:px-8 lg:px-32"
    >
      <aside className="relative w-full lg:w-1/3" style={{ color: '#002766' }}>
        <div className="relative leading-1.2 font-normal">
          <h2
            className="relative text-5xl! lg:text-7xl!"
            style={{ color: '#8fa3bf' }}
          >
            {content.titleH2}
          </h2>
          <h1
            className="relative -top-4 lg:-top-6 text-5xl! lg:text-7xl!"
            style={{ color: '#002766' }}
          >
            {content.titleH1}
          </h1>
        </div>
        <p className="text-lg lg:text-base leading-normal">{content.description}</p>
      </aside>
      <section className="w-full lg:w-2/3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
          {content.useCases.map((useCase, index) => (
            <div
              key={useCase}
              className="rounded-2xl border px-4 py-3 text-sm font-normal leading-[1.4]"
              style={{
                borderColor: '#D9D9D9',
                color: '#002766',
              }}
            >
              <span
                className="text-sm font-normal"
                style={{ color: '#8C8C8C' }}
              >
                Use case {index + 1}
              </span>
              <p className="m-0 mt-1 hyphens-auto">{useCase}</p>
            </div>
          ))}
        </div>

        {content.data && content.data.length > 0 && (
          <div
            className="grid grid-cols-1 lg:grid-cols-3 gap-4 border p-4 rounded-lg mt-10"
            style={{ borderColor: '#D9D9D9' }}
          >
            {content.data.map((item) => (
              <div className="flex flex-row gap-3 items-center" key={item.label}>
                <div
                  className="w-28 h-28 aspect-square font-bold text-2xl rounded-full border flex items-center justify-center"
                  style={{
                    borderColor: '#D9D9D9',
                    color: '#002766',
                  }}
                >
                  {item.value}
                </div>
                <div
                  className="leading-1.1! hyphens-auto pr-3 text-base"
                  style={{ color: '#002766' }}
                >
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
