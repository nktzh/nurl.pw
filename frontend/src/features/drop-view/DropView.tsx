"use client";

import { Clock, Download01, File04, Folder, Lock01, Zap } from "@untitledui/icons";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError, api, type Drop } from "@/shared/lib/api";
import { ACCESS_LABELS } from "@/shared/lib/config";
import { formatBytes, formatDate, pluralFiles } from "@/shared/lib/format";
import { Alert } from "@/shared/ui/Alert";
import { HOME_NAV, NavBar } from "@/shared/ui/NavBar";
import { Button } from "@/shared/ui/Button";
import { TextField } from "@/shared/ui/TextField";
import ui from "@/shared/ui/ui.module.css";
import s from "./drop-view.module.css";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; drop: Drop; token: string | null }
  | { kind: "consumed" };

const tokenKey = (key: string) => `nurl:access:${key.toLowerCase()}`;

function readToken(key: string): string | null {
  try {
    return sessionStorage.getItem(tokenKey(key));
  } catch {
    return null;
  }
}

function saveToken(key: string, token: string | null) {
  try {
    if (token) sessionStorage.setItem(tokenKey(key), token);
    else sessionStorage.removeItem(tokenKey(key));
  } catch {
    // storage unavailable (private mode), so the token just won't survive a reload
  }
}

export function DropView({ dropKey }: { dropKey: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const stored = readToken(dropKey);
      try {
        const drop = await api.getDrop(dropKey, stored);
        let token = stored;
        if (drop.locked && stored) {
          // Stored token has expired.
          saveToken(dropKey, null);
          token = null;
        }
        if (!cancelled) setState({ kind: "ready", drop, token });
      } catch (err) {
        if (!cancelled) {
          setState({
            kind: "error",
            message: err instanceof ApiError ? err.message : "Не удалось загрузить папку",
          });
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [dropKey]);

  return (
    <main className={ui.shell}>
      <section className={`${ui.card} ${s.card}`}>
        <div className={s.inner}>
          {state.kind === "loading" && <Skeleton />}
          {state.kind === "error" && <NotFound message={state.message} />}
          {state.kind === "consumed" && <Consumed />}
          {state.kind === "ready" && (
            <Ready
              key={state.token ?? "locked"}
              drop={state.drop}
              token={state.token}
              dropKey={dropKey}
              onUnlocked={(drop, token) => {
                saveToken(dropKey, token);
                setState({ kind: "ready", drop, token });
              }}
              onConsumed={() => setState({ kind: "consumed" })}
            />
          )}
        </div>
      </section>
      <NavBar items={HOME_NAV} />
    </main>
  );
}

type ReadyProps = {
  drop: Drop;
  token: string | null;
  dropKey: string;
  onUnlocked: (drop: Drop, token: string) => void;
  onConsumed: () => void;
};

function Ready({ drop, token, dropKey, onUnlocked, onConsumed }: ReadyProps) {
  const title = drop.name ?? drop.code;
  const AccessIcon = drop.access === "private" ? Lock01 : drop.access === "one_time" ? Zap : Folder;

  return (
    <div className={`${s.stack} ${ui.enter}`}>
      <header className={s.head}>
        <span className={s.folderIcon}>
          <AccessIcon size={22} />
        </span>
        <div className={s.headText}>
          <h1 className={s.title}>{title}</h1>
          <p className={s.meta}>
            <span className={s.tag}>{ACCESS_LABELS[drop.access]}</span>
            <span>{pluralFiles(drop.file_count)}</span>
            <span>·</span>
            <span>{formatBytes(drop.total_size)}</span>
          </p>
        </div>
      </header>

      {drop.locked ? (
        <Unlock dropKey={dropKey} onUnlocked={onUnlocked} />
      ) : drop.access === "one_time" ? (
        <OneTime drop={drop} dropKey={dropKey} onConsumed={onConsumed} />
      ) : (
        <>
          <FileList drop={drop} hrefFor={(id) => api.fileUrl(drop.code, id, token)} />
          <a
            className={`${ui.button} ${ui.primary} ${ui.block}`}
            href={api.archiveUrl(drop.code, token)}
            download
          >
            <Download01 size={18} />
            {drop.file_count > 1 ? "Скачать всё (ZIP)" : "Скачать"}
          </a>
        </>
      )}

      <p className={s.expires}>
        <Clock size={16} />
        Доступна до <strong>{formatDate(drop.expires_at)}</strong>
      </p>
    </div>
  );
}

function FileList({ drop, hrefFor }: { drop: Drop; hrefFor?: (id: string) => string }) {
  return (
    <ul className={s.files}>
      {drop.files.map((f) => (
        <li key={f.id} className={s.file}>
          <File04 size={18} className={s.fileIcon} />
          <span className={s.fileName} title={f.name}>
            {f.name}
          </span>
          <span className={s.fileSize}>{formatBytes(f.size)}</span>
          {hrefFor && (
            <a className={s.fileDownload} href={hrefFor(f.id)} download aria-label={`Скачать ${f.name}`}>
              <Download01 size={16} />
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

function Unlock({
  dropKey,
  onUnlocked,
}: {
  dropKey: string;
  onUnlocked: (drop: Drop, token: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) return setError("Введите пароль");
    setPending(true);
    setError(null);
    try {
      const { token } = await api.unlockDrop(dropKey, password);
      const drop = await api.getDrop(dropKey, token);
      onUnlocked(drop, token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось открыть папку");
      setPending(false);
    }
  };

  return (
    <form className={s.stack} onSubmit={submit} noValidate>
      <Alert tone="info">Папка защищена паролем. Введите его, чтобы увидеть файлы.</Alert>
      <TextField
        type="password"
        placeholder="Пароль"
        aria-label="Пароль"
        autoComplete="current-password"
        autoFocus
        value={password}
        invalid={!!error}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <Alert>{error}</Alert>}
      <Button type="submit" block disabled={pending}>
        <Lock01 size={18} />
        {pending ? "Проверяем…" : "Открыть"}
      </Button>
    </form>
  );
}

function OneTime({ drop, dropKey, onConsumed }: { drop: Drop; dropKey: string; onConsumed: () => void }) {
  return (
    <>
      <FileList drop={drop} />
      <Alert tone="info">
        Это одноразовая папка: скачать её можно только один раз, после чего файлы будут удалены.
      </Alert>
      <a
        className={`${ui.button} ${ui.primary} ${ui.block}`}
        href={api.oneTimeUrl(dropKey)}
        download
        onClick={() => setTimeout(onConsumed, 300)}
      >
        <Download01 size={18} />
        {drop.file_count > 1 ? "Скачать всё (ZIP)" : "Скачать"}
      </a>
    </>
  );
}

function Consumed() {
  return (
    <div className={s.placeholder}>
      <span className={s.folderIcon}>
        <Zap size={22} />
      </span>
      <h1 className={s.title}>Загрузка началась</h1>
      <p className={s.muted}>Одноразовая ссылка использована, файлы удаляются с сервера после скачивания.</p>
    </div>
  );
}

function NotFound({ message }: { message: string }) {
  return (
    <div className={s.placeholder}>
      <span className={`${s.folderIcon} ${s.folderMuted}`}>
        <Folder size={22} />
      </span>
      <h1 className={s.title}>Папка недоступна</h1>
      <p className={s.muted}>{message}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className={s.stack} aria-busy="true" aria-label="Загрузка">
      <div className={s.skelHead} />
      <div className={s.skelRow} />
      <div className={s.skelRow} />
      <div className={s.skelButton} />
    </div>
  );
}
