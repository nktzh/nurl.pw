import type { ButtonHTMLAttributes } from "react";
import s from "./ui.module.css";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  size?: "md" | "small";
  block?: boolean;
  /** 0..1, renders a fill behind the label */
  progress?: number;
};

export function Button({
  variant = "primary",
  size = "md",
  block,
  progress,
  className,
  children,
  type = "button",
  ...rest
}: Props) {
  const cls = [
    s.button,
    s[variant],
    size === "small" && s.small,
    block && s.block,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={cls} {...rest}>
      {progress !== undefined && (
        <span className={s.progress} style={{ width: `${Math.round(progress * 100)}%` }} />
      )}
      {children}
    </button>
  );
}
