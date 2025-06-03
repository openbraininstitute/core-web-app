export default function SubtitleBar({ title }: { title: string }) {
  return (
    <div className="text-primary-9 relative mt-20 mb-8 flex w-full flex-row bg-gray-100 px-6 py-4 text-2xl font-bold">
      {title}
    </div>
  );
}
