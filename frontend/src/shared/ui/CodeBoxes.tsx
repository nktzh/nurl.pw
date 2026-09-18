"use client";

import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { CODE_LENGTH } from "@/shared/lib/config";
import s from "./ui.module.css";

const sanitize = (v: string) => v.replace(/[^A-Za-z0-9]/g, "");

export function CodeDisplay({ code }: { code: string }) {
  return (
    <div className={s.code} aria-label={`Идентификатор ${code}`}>
      {code.split("").map((ch, i) => (
        <span key={i} className={`${s.codeBox} ${s.codeBoxFilled}`} aria-hidden>
          {ch}
        </span>
      ))}
    </div>
  );
}

type InputProps = {
  value: string;
  onChange: (value: string) => void;
  onComplete?: () => void;
};

export function CodeInput({ value, onChange, onComplete }: InputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  // Fast typing fires the next box's handler before React re-renders,
  // so handlers read the latest value from a ref instead of the prop.
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  }, [value]);
  const chars = Array.from({ length: CODE_LENGTH }, (_, i) => value[i] ?? "");

  const focus = (i: number) => refs.current[Math.max(0, Math.min(i, CODE_LENGTH - 1))]?.focus();

  const update = (next: string) => {
    const clean = next.slice(0, CODE_LENGTH);
    latest.current = clean;
    onChange(clean);
    if (clean.length === CODE_LENGTH) onComplete?.();
  };

  // The value is kept contiguous: typing past the end appends, deleting shifts left.
  const setAt = (i: number, raw: string) => {
    const current = latest.current;
    const pos = Math.min(i, current.length);
    const existing = current[pos];
    let typed = sanitize(raw);
    // A key pressed over an existing character yields both of them.
    if (existing && typed.length === 2 && typed.includes(existing)) {
      typed = typed[0] === existing ? typed[1] : typed[0];
    }
    if (!typed) return;
    if (typed.length === 1) {
      update(current.slice(0, pos) + typed + current.slice(pos + 1));
      focus(pos + 1);
    } else {
      // Autofill / IME / pasted text arrives in one go.
      update(current.slice(0, pos) + typed);
      focus(pos + typed.length);
    }
  };

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const current = latest.current;
      const pos = i < current.length ? i : current.length - 1;
      if (pos < 0) return;
      update(current.slice(0, pos) + current.slice(pos + 1));
      focus(pos === i ? i : pos);
    } else if (e.key === "ArrowLeft") {
      focus(i - 1);
    } else if (e.key === "ArrowRight") {
      focus(i + 1);
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = sanitize(e.clipboardData.getData("text"));
    if (!pasted) return;
    update(pasted);
    focus(pasted.length);
  };

  return (
    <div className={s.code} role="group" aria-label="Идентификатор папки">
      {chars.map((ch, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={`${s.codeBox} ${ch ? s.codeBoxFilled : ""}`}
          value={ch}
          inputMode="text"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          enterKeyHint="go"
          spellCheck={false}
          aria-label={`Символ ${i + 1}`}
          onChange={(e) => setAt(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
