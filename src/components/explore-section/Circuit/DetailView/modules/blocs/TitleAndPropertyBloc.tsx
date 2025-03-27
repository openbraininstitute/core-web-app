export default function TitleAndPropertyBloc({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <div className="relative flex w-full flex-col">
      <div className="text-sm font-light uppercase tracking-wide text-gray-500">{title}</div>
      <p className="text-base font-normal leading-normal text-primary-8">{content}</p>
    </div>
  );
}
