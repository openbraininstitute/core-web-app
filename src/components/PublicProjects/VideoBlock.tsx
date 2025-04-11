import { PresentationVideoProps } from './type';

export default function VideoBlock({
  content,
  index,
}: {
  content: PresentationVideoProps;
  index: number;
}) {
  return (
    <div className="relative flex w-full flex-col">
      <div className="flex w-full flex-col gap-y-0.5">
        <div className="text-sm font-light">0{index + 1}</div>
        <div className="text-primary-9 mb-4 text-xl font-bold">{content.title}</div>
      </div>
      <video controls className="h-auto w-full">
        <source src={content.url} type="video/mp4" />
        <track default src={content.captionTrack} kind="captions" srcLang="en" label="English" />
        Your browser does not support the video tag.
      </video>
      {content.hasCaption && (
        <div className="text-primary-9 mt-4 text-base font-light">{content.caption}</div>
      )}
    </div>
  );
}
