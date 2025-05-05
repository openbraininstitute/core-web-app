export default function SubtitleBar({ title }: { title: string }) {
  return (
    <div className="relative mb-8 mt-20 flex w-full flex-row bg-gray-100 px-6 py-4 text-2xl font-bold text-primary-9">
      {title}
    </div>
  );
}
