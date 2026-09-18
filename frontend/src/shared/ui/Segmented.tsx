import type { ReactNode } from "react";
import s from "./ui.module.css";

type Option<T extends string> = { value: T; label: string; icon?: ReactNode };

type Props<T extends string> = {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  label: string;
  disabled?: boolean;
};

export function Segmented<T extends string>({ value, options, onChange, label, disabled }: Props<T>) {
  return (
    <div className={s.segmented} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={s.segment}
          onClick={() => onChange(o.value)}
          disabled={disabled}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}
