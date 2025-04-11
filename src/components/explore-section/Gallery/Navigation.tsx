import { ChevronIcon } from '@/components/icons';
import { GalleryImagesType } from '@/types/explore-gallery';

type NavigationProps = {
  currentImageContent: GalleryImagesType;
  navigate: (direction: string) => void;
  totalImages: number;
  currentImage: number;
};

export function SingleInfoBox({ content, label }: { content: string; label: string }) {
  return (
    <div className="flex flex-row">
      <div className="text-neutral-2 block w-32 font-normal">{label}</div>
      <div className="block font-semibold text-white">{content}</div>
    </div>
  );
}

export default function Navigation({
  currentImageContent,
  navigate,
  totalImages,
  currentImage,
}: NavigationProps) {
  return (
    <div className="w-15vw fixed bottom-6 left-6 z-50 flex flex-col">
      <header className="mb-12 flex w-full flex-col text-white">
        <div className="flex w-full flex-row items-center justify-between">
          <button
            type="button"
            onClick={(e) => navigate(e.currentTarget.name)}
            name="previous"
            aria-label="Navigate"
          >
            <ChevronIcon className="h-3 w-auto origin-center rotate-180" />
          </button>

          <div className="flex flex-row items-center text-base">
            <div className="font-bold">{currentImage + 1}</div>
            <div className="bg-neutral-4 mx-2 h-px w-6" />
            <div className="font-light">{totalImages}</div>
          </div>
          <button
            type="button"
            onClick={(e) => navigate(e.currentTarget.name)}
            name="next"
            aria-label="Navigate"
          >
            <ChevronIcon className="h-3 w-auto" />
          </button>
        </div>

        <div className="mt-2 text-xl leading-tight font-bold text-white">
          {currentImageContent.name}
        </div>
      </header>

      <div className="flex flex-col gap-y-1">
        <SingleInfoBox label="Credits" content={currentImageContent.credit} />
        <div className="bg-neutral-5 block h-px w-full" />
        <SingleInfoBox label="Year" content={currentImageContent.year} />
        <div className="bg-neutral-5 block h-px w-full" />
        <SingleInfoBox label="Software" content={currentImageContent.software} />
      </div>
    </div>
  );
}
