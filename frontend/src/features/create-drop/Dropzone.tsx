"use client";

import { UploadCloud02 } from "@untitledui/icons";
import { useRef, useState, type DragEvent } from "react";
import s from "./create-drop.module.css";

type Props = {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  compact?: boolean;
};

export function Dropzone({ onFiles, disabled, compact }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);

  const onDragEnter = (e: DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    depth.current += 1;
    setDragging(true);
  };

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setDragging(false);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    depth.current = 0;
    setDragging(false);
    if (disabled) return;
    // Directories show up as zero-type entries without a readable body; skip them.
    const items = Array.from(e.dataTransfer.items ?? []);
    const files = Array.from(e.dataTransfer.files).filter((f, i) => {
      const entry = items[i]?.webkitGetAsEntry?.();
      return !entry || entry.isFile;
    });
    if (files.length) onFiles(files);
  };

  return (
    <button
      type="button"
      className={[s.dropzone, dragging && s.dragging, compact && s.dropzoneCompact].filter(Boolean).join(" ")}
      onClick={() => inputRef.current?.click()}
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      disabled={disabled}
    >
      <span className={s.dropIcon}>
        <UploadCloud02 size={24} />
      </span>
      <span className={s.dropTitle}>
        {dragging ? (
          "Отпустите, чтобы добавить"
        ) : (
          <>
            <span className={s.pointerText}>Перетащите файлы сюда или нажмите, чтобы выбрать</span>
            <span className={s.touchText}>Нажмите, чтобы выбрать файлы</span>
          </>
        )}
      </span>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
    </button>
  );
}
