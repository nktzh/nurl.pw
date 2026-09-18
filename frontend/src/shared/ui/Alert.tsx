import { AlertCircle, InfoCircle } from "@untitledui/icons";
import type { ReactNode } from "react";
import s from "./ui.module.css";

export function Alert({ tone = "error", children }: { tone?: "error" | "info"; children: ReactNode }) {
  return (
    <div className={`${s.alert} ${tone === "info" ? s.info : ""}`} role={tone === "error" ? "alert" : "status"}>
      {tone === "error" ? <AlertCircle size={18} /> : <InfoCircle size={18} />}
      <span>{children}</span>
    </div>
  );
}
