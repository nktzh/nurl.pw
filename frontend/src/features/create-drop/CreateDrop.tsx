"use client";

import { Globe01, Lock01, Zap } from "@untitledui/icons";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, api, type AccessType, type DropCreated, type Retention } from "@/shared/lib/api";
import { ACCESS_LABELS, NAME_ERROR, NAME_PATTERN, PASSWORD_MIN_LENGTH, RETENTIONS } from "@/shared/lib/config";
import { formatGb } from "@/shared/lib/format";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { Segmented } from "@/shared/ui/Segmented";
import { TextField } from "@/shared/ui/TextField";
import uiStyles from "@/shared/ui/ui.module.css";
import { Dropzone } from "./Dropzone";
import { FileTable, type QueuedFile } from "./FileTable";
import { RetentionSlider } from "./RetentionSlider";
import s from "./create-drop.module.css";

const ACCESS_OPTIONS = [
  { value: "public" as const, label: ACCESS_LABELS.public, icon: <Globe01 size={16} /> },
  { value: "private" as const, label: ACCESS_LABELS.private, icon: <Lock01 size={16} /> },
  { value: "one_time" as const, label: ACCESS_LABELS.one_time, icon: <Zap size={16} /> },
];

const ACCESS_HINTS: Record<AccessType, string> = {
  public: "Файлы доступны всем, у кого есть ссылка или идентификатор.",
  private: "Для скачивания потребуется пароль.",
  one_time: "Ссылка сработает один раз: после первого скачивания файлы удалятся.",
};

const UPLOAD_CONCURRENCY = 3;

let nextKey = 0;

export function CreateDrop({ onCreated }: { onCreated: (drop: DropCreated) => void }) {
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [access, setAccess] = useState<AccessType>("public");
  const [retention, setRetention] = useState<Retention>("12h");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const limit = RETENTIONS.find((r) => r.value === retention)!.limit;
  const totalSize = files.reduce((sum, f) => sum + f.file.size, 0);
  const progress = totalSize ? uploaded / totalSize : uploading ? 1 : 0;

  useEffect(() => {
    if (!uploading) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [uploading]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const addFiles = (incoming: File[]) => {
    setError(null);
    setFiles((prev) => [...prev, ...incoming.map((file) => ({ key: nextKey++, file }))]);
  };

  const validate = (): string | null => {
    if (!files.length) return "Добавьте хотя бы один файл";
    if (totalSize > limit) {
      return `Общий размер превышает ${formatGb(limit)}, выберите срок покороче или уберите часть файлов`;
    }
    if (access !== "one_time" && name && !NAME_PATTERN.test(name)) {
      return NAME_ERROR;
    }
    if (access === "private") {
      if (password.length < PASSWORD_MIN_LENGTH) {
        return `Пароль должен быть не короче ${PASSWORD_MIN_LENGTH} символов`;
      }
      if (password !== passwordConfirm) return "Пароли не совпадают";
    }
    return null;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = validate();
    setError(problem);
    if (problem) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setUploading(true);
    setUploaded(0);

    let created: DropCreated | null = null;
    try {
      created = await api.createDrop({
        access,
        retention,
        name: access !== "one_time" ? name || undefined : undefined,
        password: access === "private" ? password : undefined,
        password_confirm: access === "private" ? passwordConfirm : undefined,
        files: files.map(({ file }) => ({
          name: file.name,
          size: file.size,
          content_type: file.type || undefined,
        })),
      });

      const drop = created;
      const loaded = new Array<number>(files.length).fill(0);
      let cursor = 0;
      const worker = async () => {
        while (cursor < files.length) {
          const i = cursor++;
          await api.uploadFile(
            drop.id,
            drop.files[i].id,
            files[i].file,
            drop.owner_token,
            (bytes) => {
              loaded[i] = bytes;
              setUploaded(loaded.reduce((a, b) => a + b, 0));
            },
            controller.signal,
          );
        }
      };
      await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, files.length) }, worker));
      await api.completeDrop(drop.id, drop.owner_token);
      onCreated(drop);
    } catch (err) {
      controller.abort();
      if (created) api.deleteDrop(created.id, created.owner_token).catch(() => {});
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setError(err instanceof ApiError ? err.message : "Не удалось загрузить файлы");
      }
      setUploading(false);
    }
  };

  return (
    <form className={`${uiStyles.card} ${s.layout} ${uiStyles.enter}`} onSubmit={submit} noValidate>
      <Dropzone onFiles={addFiles} disabled={uploading} compact={files.length > 0} />

      <div className={s.columns}>
        <FileTable
          files={files}
          totalSize={totalSize}
          limit={limit}
          disabled={uploading}
          onRemove={(key) => setFiles((prev) => prev.filter((f) => f.key !== key))}
          onClear={() => setFiles([])}
        />

        <section className={s.panel} aria-label="Настройки">
          <header className={s.panelHead}>
            <h2 className={s.panelTitle}>Настройки</h2>
          </header>

          <div className={s.settings}>
            <div className={s.group}>
              <Segmented
                label="Тип доступа"
                value={access}
                options={ACCESS_OPTIONS}
                onChange={setAccess}
                disabled={uploading}
              />
              <p className={s.accessHint}>{ACCESS_HINTS[access]}</p>
            </div>

            {access !== "one_time" && (
              <TextField
                label="Имя папки"
                placeholder="MyFolder (необязательно)"
                value={name}
                maxLength={32}
                autoComplete="off"
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
                disabled={uploading}
                invalid={!!name && !NAME_PATTERN.test(name)}
                hint="Латиница, цифры, «-» и «_»."
                onChange={(e) => setName(e.target.value.replace(/\s/g, ""))}
              />
            )}

            {access === "private" && (
              <div className={s.passwords}>
                <TextField
                  label="Пароль"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Минимум 4 символа"
                  value={password}
                  disabled={uploading}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <TextField
                  label="Повторите пароль"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Ещё раз"
                  value={passwordConfirm}
                  disabled={uploading}
                  invalid={!!passwordConfirm && passwordConfirm !== password}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                />
              </div>
            )}

            <div className={s.group}>
              <span className={uiStyles.label}>Срок хранения</span>
              <RetentionSlider value={retention} onChange={setRetention} disabled={uploading} />
            </div>
          </div>

          <footer className={s.footer}>
            {error && <Alert>{error}</Alert>}
            <p className={s.terms}>
              Нажимая «Создать папку», вы соглашаетесь с{" "}
              <Link href="/privacy">политикой конфиденциальности</Link>.
            </p>
            <div className={s.actions}>
              <Button
                type="submit"
                block
                disabled={uploading || !files.length}
                progress={uploading ? progress : undefined}
              >
                {uploading ? `Загрузка… ${Math.floor(progress * 100)}%` : "Создать папку"}
              </Button>
              {uploading && (
                <Button variant="secondary" onClick={() => abortRef.current?.abort()}>
                  Отменить
                </Button>
              )}
            </div>
          </footer>
        </section>
      </div>
    </form>
  );
}
