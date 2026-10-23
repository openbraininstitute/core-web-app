'use client';

/** Compact labelled range input shared by all widgets. */
export default function Slider({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  display,
  onChange,
  accent = 'accent-sky-400',
  disabled = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  /** Overrides the printed value (e.g. for exponential scales). */
  display?: string;
  onChange: (v: number) => void;
  accent?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`block py-1 ${disabled ? 'opacity-50' : ''}`}>
      <span className="flex items-baseline justify-between gap-2 text-[11px] text-slate-400">
        <span>{label}</span>
        <span className="font-mono text-slate-200">
          {display ?? value}
          {display ? '' : unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(ev) => onChange(Number(ev.target.value))}
        className={`mt-0.5 w-full ${accent}`}
        aria-label={label}
      />
    </label>
  );
}
