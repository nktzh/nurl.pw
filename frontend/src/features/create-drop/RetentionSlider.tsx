import type { CSSProperties } from "react";
import type { Retention } from "@/shared/lib/api";
import { RETENTIONS } from "@/shared/lib/config";
import { formatGb } from "@/shared/lib/format";
import s from "./create-drop.module.css";

type Props = {
  value: Retention;
  onChange: (value: Retention) => void;
  disabled?: boolean;
};

export function RetentionSlider({ value, onChange, disabled }: Props) {
  const index = RETENTIONS.findIndex((r) => r.value === value);
  const last = RETENTIONS.length - 1;

  return (
    <div className={s.slider} style={{ "--t": index / last } as CSSProperties}>
      <input
        type="range"
        min={0}
        max={last}
        step={1}
        value={index}
        disabled={disabled}
        className={s.range}
        aria-label="Срок хранения"
        aria-valuetext={`${RETENTIONS[index].label}, до ${formatGb(RETENTIONS[index].limit)}`}
        onChange={(e) => onChange(RETENTIONS[Number(e.target.value)].value)}
      />
      <div className={s.stops}>
        {RETENTIONS.map((r, i) => (
          <button
            key={r.value}
            type="button"
            tabIndex={-1}
            disabled={disabled}
            className={`${s.stop} ${i === index ? s.stopActive : ""}`}
            style={{
              left:
                i === 0 ? 0 : i === last ? "100%" : `calc(var(--thumb) / 2 + (100% - var(--thumb)) * ${i / last})`,
            }}
            data-edge={i === 0 ? "start" : i === last ? "end" : undefined}
            onClick={() => onChange(r.value)}
          >
            <span className={s.stopLabel}>{r.label}</span>
            <span className={s.stopLimit}>до {formatGb(r.limit)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
