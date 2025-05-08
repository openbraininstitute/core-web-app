type Props = {
  label: string;
  value?: string | number | number[];
  unit?: string;
};

export default function ConfigItem({ label, value, unit }: Props) {
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="font-medium text-gray-400 uppercase">{label}</div>
      <div className="text-primary-8 text-lg font-bold first-letter:uppercase">
        {value}
        {unit && <span className="ml-2 text-sm font-light">[{unit}]</span>}
      </div>
    </div>
  );
}
