import { useState } from 'react';

export type ContentForFeatures = {
  titleH1?: string;
  titleH2?: string;
  headline?: string;
  description?: string;
  useCases: string[];
  data?: Array<{ label: string; value: string | number }>;
  backgroundColor?: string;
  backgroundImage?: string;
  theme?: string;
};

const LIGHT_ACTIVE = '#002766';
const LIGHT_INACTIVE = '#8C8C8C';
const DARK_ACTIVE = '#ffffff';
const DARK_INACTIVE = '#69C0FF';

export default function FeatureBlock({ content, id }: { content: ContentForFeatures; id: number }) {
  const [activeUseCase, setActiveUseCase] = useState<number>(0);
  const isDark = content.theme === 'dark';
  const activeColor = isDark ? DARK_ACTIVE : LIGHT_ACTIVE;
  const inactiveColor = isDark ? DARK_INACTIVE : LIGHT_INACTIVE;
  const style = {
    ...(content.backgroundColor && {
      backgroundColor: content.backgroundColor,
    }),
    ...(content.backgroundImage && {
      backgroundImage: `url(${content.backgroundImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }),
  } as React.CSSProperties;
  return (
    <div
      className="relative w-full min-h-screen flex flex-row items-center gap-4 flex-nowrap py-[16vh] px-32"
      style={style}
      id={`feature-block-${id}`}
    >
      <aside
        className="relative w-1/3"
        style={{ color: content.theme === 'dark' ? '#fff' : '#002766' }}
      >
        <div className="relative leading-1.2 font-normal">
          <h2
            className="relative text-7xl!"
            style={{ color: content.theme === 'dark' ? '#91D5FF' : '#A5A5A5' }}
          >
            {content.titleH2}
          </h2>
          <h1
            className="relative -top-6 text-7xl!"
            style={{ color: content.theme === 'dark' ? '#fff' : '#002766' }}
          >
            {content.titleH1}
          </h1>
        </div>
        <p>{content.headline}</p>
      </aside>
      <section className="w-2/3">
        <div className="flex flex-row gap-8">
          {content.useCases.map((useCase, index) => {
            return (
              <button
                key={useCase}
                onClick={() => setActiveUseCase(index)}
                type="button"
                className="flex flex-row items-center gap-1"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: index === activeUseCase ? activeColor : inactiveColor,
                  }}
                />
                <div
                  className="text-base font-medium"
                  style={{
                    color: index === activeUseCase ? activeColor : inactiveColor,
                  }}
                >
                  Use case {index + 1}
                </div>
              </button>
            );
          })}
        </div>
        <div
          className="w-full border-y py-4 text-3xl leading-1.6 font-bold my-6"
          style={{
            color: content.theme === 'dark' ? '#fff' : '#002766',
            borderColor: content.theme === 'dark' ? '#096DD9' : '#D9D9D9',
          }}
        >
          {content.useCases[activeUseCase] ?? ''}
        </div>

        <div className="flex flex-col mb-12">
          <div
            className="text-base font-medium mb-2"
            style={{ color: content.theme === 'dark' ? '#91D5FF' : '#A5A5A5' }}
          >
            {content.titleH2}
          </div>
          <p
            className="text-base leading-1.75"
            style={{ color: content.theme === 'dark' ? '#fff' : '#002766' }}
          >
            {content.description}
          </p>
        </div>

        <div
          className="grid grid-cols-3 gap-4 border p-6 rounded-lg"
          style={{
            borderColor: content.theme === 'dark' ? '#096DD9' : '#D9D9D9',
          }}
        >
          {content.data?.map((item) => (
            <div className="flex flex-row gap-3 items-center" key={item.label}>
              <div
                className="w-32 h-32 aspect-square font-bold text-2xl rounded-full border flex items-center justify-center"
                style={{
                  borderColor: content.theme === 'dark' ? '#096DD9' : '#D9D9D9',
                  color: content.theme === 'dark' ? '#fff' : '#002766',
                }}
              >
                {item.value}
              </div>
              <div
                className="capitalize leading-1.2"
                style={{ color: content.theme === 'dark' ? '#fff' : '#002766' }}
              >
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
