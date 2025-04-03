export default function ParameterBox({ name, value }: { name: string; value: string | number }) {
  return (
    <div className="relativee flex w-full flex-col">
      <div className="text-sm font-light uppercase tracking-wider text-gray-500">{name}</div>
      <div className="text-xl font-normal text-primary-9">{value}</div>
    </div>
  );
}
