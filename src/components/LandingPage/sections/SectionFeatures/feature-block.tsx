import { useInView } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

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

export default function FeatureBlock({
  content,
  id,
  onInView,
}: {
  content: ContentForFeatures;
  id: number;
  onInView?: (index: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { amount: 0.5 });
  const [activeUseCase, setActiveUseCase] = useState<number>(0);

  useEffect(() => {
    if (isInView && onInView) onInView(id);
  }, [isInView, onInView, id]);
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
      ref={ref}
      className="relative w-full min-h-screen flex flex-col lg:flex-row items-center gap-12 flex-nowrap py-[16vh] px-32"
      style={style}
      id={`feature-block-${id}`}
    >
      <aside
        className="relative w-full lg:w-1/3"
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
        <p className="text-base leading-normal">{content.description}</p>
      </aside>
      <section className="w-full lg:w-2/3">
        <div className="flex flex-row gap-4">
          {content.useCases.map((useCase, index) => {
            return (
              <button
                key={useCase}
                onClick={() => setActiveUseCase(index)}
                type="button"
                className="flex flex-row items-center gap-1 px-4 py-1 border border-neutral-2 rounded-2xl"
                style={{
                  color: index === activeUseCase ? activeColor : inactiveColor,
                  backgroundColor: index === activeUseCase ? activeColor : 'transparent',
                }}
              >
                <span
                  className="text-base font-normal"
                  style={{
                    color:
                      index === activeUseCase
                        ? isDark
                          ? '#002766'
                          : '#ffffff'
                        : isDark
                          ? '#ffffff'
                          : '#002766',
                  }}
                >
                  {' '}
                  Use case {index + 1}
                </span>
              </button>
            );
          })}
        </div>
        <div
          className="w-full h-54 flex items-center text-3xl leading-[1.4] font-semibold"
          style={{
            color: content.theme === 'dark' ? '#fff' : '#002766',
          }}
        >
          {content.useCases[activeUseCase] ?? ''}
        </div>

        {/* <p
          className="text-base leading-1.75"
          style={{ color: content.theme === 'dark' ? '#fff' : '#002766' }}
        >
          {content.description}
        </p> */}

        <div
          className="grid grid-cols-3 gap-4 border p-4 rounded-lg mt-10"
          style={{
            borderColor: content.theme === 'dark' ? '#096DD9' : '#D9D9D9',
          }}
        >
          {content.data?.map((item) => (
            <div className="flex flex-row gap-3 items-center" key={item.label}>
              <div
                className="w-28 h-28 aspect-square font-bold text-2xl rounded-full border flex items-center justify-center"
                style={{
                  borderColor: content.theme === 'dark' ? '#096DD9' : '#D9D9D9',
                  color: content.theme === 'dark' ? '#fff' : '#002766',
                }}
              >
                {item.value}
              </div>
              <div
                className="leading-1.1! hyphens-auto pr-3 text-base"
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
