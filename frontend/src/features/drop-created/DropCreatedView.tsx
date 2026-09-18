"use client";

import { Check, CheckCircle, Clock, Copy01, Share07, Trash01 } from "@untitledui/icons";
import { QRCodeSVG } from "qrcode.react";
import { useState, useSyncExternalStore } from "react";
import { ApiError, api, dropLink, type DropCreated } from "@/shared/lib/api";
import { formatDate } from "@/shared/lib/format";
import { useCopy } from "@/shared/lib/useCopy";
import { Alert } from "@/shared/ui/Alert";
import { Button } from "@/shared/ui/Button";
import { CodeDisplay } from "@/shared/ui/CodeBoxes";
import { TelegramIcon, XLogoIcon } from "@/shared/ui/icons";
import { TextField } from "@/shared/ui/TextField";
import ui from "@/shared/ui/ui.module.css";
import s from "./drop-created.module.css";

const noopSubscribe = () => () => {};
const useOrigin = () =>
  useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");

type Props = {
  drop: DropCreated;
  onDeleted: () => void;
};

export function DropCreatedView({ drop, onDeleted }: Props) {
  const origin = useOrigin();
  const link = dropLink(origin, drop);
  const { copied: linkCopied, copy: copyLink } = useCopy();
  const { copied: shareCopied, copy: copyShare } = useCopy();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareText = "Файлы для вас на Nurl";
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`;
  const xUrl = `https://x.com/intent/post?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`;

  const remove = async () => {
    setDeleting(true);
    setError(null);
    try {
      await api.deleteDrop(drop.id, drop.owner_token);
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось удалить папку");
      setDeleting(false);
    }
  };

  return (
    <div className={`${ui.card} ${s.layout} ${ui.enter}`}>
      <section className={s.main}>
        <header className={s.head}>
          <span className={s.badge}>
            <CheckCircle size={18} />
          </span>
          <div>
            <h1 className={s.title}>Папка создана</h1>
            <p className={s.subtitle}>Файлы загружены на сервер. Идентификатор папки:</p>
          </div>
        </header>

        <CodeDisplay code={drop.code} />

        {drop.name && (
          <p className={s.meta}>
            Имя папки: <strong>{drop.name}</strong>
          </p>
        )}

        {drop.access === "private" && (
          <Alert tone="info">Папка приватная, для скачивания понадобится пароль.</Alert>
        )}
        {drop.access === "one_time" && (
          <Alert tone="info">Ссылка одноразовая: после первого скачивания файлы будут удалены.</Alert>
        )}

        <TextField
          label="Ссылка для скачивания"
          value={link}
          readOnly
          onFocus={(e) => e.target.select()}
          addon={
            <button
              type="button"
              className={ui.addon}
              onClick={() => copyLink(link)}
              aria-label="Скопировать ссылку"
            >
              {linkCopied ? <Check size={18} color="var(--accent)" /> : <Copy01 size={18} />}
            </button>
          }
        />

        <div className={s.share}>
          <span className={ui.label}>Поделиться</span>
          <div className={s.shareRow}>
            <Button variant="secondary" onClick={() => copyShare(link)}>
              {shareCopied ? <Check size={18} /> : <Share07 size={18} />}
              {shareCopied ? "Скопировано" : "Копировать"}
            </Button>
            <a className={`${ui.button} ${ui.secondary}`} href={telegramUrl} target="_blank" rel="noreferrer">
              <TelegramIcon size={18} />
              Telegram
            </a>
            <a className={`${ui.button} ${ui.secondary}`} href={xUrl} target="_blank" rel="noreferrer">
              <XLogoIcon size={16} />
              Пост в X
            </a>
          </div>
        </div>

        <p className={s.expires}>
          <Clock size={16} />
          Файлы хранятся до <strong>{formatDate(drop.expires_at)}</strong>
        </p>
      </section>

      <aside className={s.side}>
        <div className={s.qr}>
          {origin ? (
            <QRCodeSVG value={link} size={512} marginSize={0} fgColor="#1e1919" className={s.qrCode} />
          ) : (
            <div className={s.qrCode} />
          )}
          <span className={s.qrHint}>Наведите камеру телефона</span>
        </div>

        {error && <Alert>{error}</Alert>}

        {confirming ? (
          <div className={s.confirm}>
            <p>Удалить папку и все файлы безвозвратно?</p>
            <div className={s.confirmRow}>
              <Button variant="secondary" size="small" onClick={() => setConfirming(false)} disabled={deleting}>
                Отмена
              </Button>
              <Button variant="danger" size="small" onClick={remove} disabled={deleting}>
                {deleting ? "Удаляем…" : "Удалить"}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="danger" block onClick={() => setConfirming(true)}>
            <Trash01 size={18} />
            Удалить папку
          </Button>
        )}
      </aside>
    </div>
  );
}
