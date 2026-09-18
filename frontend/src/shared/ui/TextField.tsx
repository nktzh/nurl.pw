"use client";

import { Eye, EyeOff } from "@untitledui/icons";
import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import s from "./ui.module.css";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: ReactNode;
  invalid?: boolean;
  addon?: ReactNode;
};

export function TextField({ label, hint, invalid, addon, type, className, ...rest }: Props) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";

  const trailing = isPassword ? (
    <button
      type="button"
      className={s.addon}
      onClick={() => setRevealed((v) => !v)}
      aria-label={revealed ? "Скрыть пароль" : "Показать пароль"}
    >
      {revealed ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  ) : (
    addon
  );

  return (
    <div className={[s.field, className].filter(Boolean).join(" ")}>
      {label && (
        <label htmlFor={id} className={s.label}>
          {label}
        </label>
      )}
      <div className={s.inputWrap}>
        <input
          id={id}
          type={isPassword && revealed ? "text" : type}
          className={[s.input, trailing && s.withAddon].filter(Boolean).join(" ")}
          aria-invalid={invalid || undefined}
          {...rest}
        />
        {trailing}
      </div>
      {hint && <p className={s.hint}>{hint}</p>}
    </div>
  );
}
