export function Header({ title }: { title: string }) {
  return (
    <div className="text-primary-8 border-neutral-2 rounded-full border px-4 py-3 text-xl font-bold">
      {title}
    </div>
  );
}
