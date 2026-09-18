import { File04, Trash01 } from "@untitledui/icons";
import { formatBytes, formatGb, pluralFiles } from "@/shared/lib/format";
import s from "./create-drop.module.css";

export type QueuedFile = { key: number; file: File };

type Props = {
  files: QueuedFile[];
  totalSize: number;
  limit: number;
  disabled?: boolean;
  onRemove: (key: number) => void;
  onClear: () => void;
};

export function FileTable({ files, totalSize, limit, disabled, onRemove, onClear }: Props) {
  const ratio = Math.min(totalSize / limit, 1);
  const over = totalSize > limit;

  return (
    <section className={s.panel} aria-label="Файлы">
      <header className={s.panelHead}>
        <h2 className={s.panelTitle}>Файлы</h2>
        {files.length > 0 && (
          <button type="button" className={s.linkButton} onClick={onClear} disabled={disabled}>
            Очистить
          </button>
        )}
      </header>

      <div className={`${s.meter} ${over ? s.meterOver : ""}`}>
        <div className={s.meterRow}>
          <span>{files.length ? pluralFiles(files.length) : "Нет файлов"}</span>
          <span className={s.meterValue}>
            {totalSize ? formatBytes(totalSize) : "0"} из {formatGb(limit)}
          </span>
        </div>
        <div className={s.meterTrack}>
          <div className={s.meterFill} style={{ width: `${ratio * 100}%` }} />
        </div>
      </div>

      {files.length === 0 ? (
        <div className={s.empty}>
          <span>Здесь появится список файлов</span>
        </div>
      ) : (
        <div className={s.tableWrap}>
          <div className={s.tableScroll}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Имя файла</th>
                  <th className={s.sizeCol}>Размер</th>
                  <th aria-label="Действия" />
                </tr>
              </thead>
              <tbody>
                {files.map(({ key, file }) => (
                  <tr key={key}>
                    <td>
                      <span className={s.fileName}>
                        <File04 size={16} className={s.fileIcon} />
                        <span title={file.name}>{file.name}</span>
                      </span>
                    </td>
                    <td className={s.sizeCol}>{formatBytes(file.size)}</td>
                    <td className={s.actionCol}>
                      <button
                        type="button"
                        className={s.removeBtn}
                        onClick={() => onRemove(key)}
                        disabled={disabled}
                        aria-label={`Убрать ${file.name}`}
                      >
                        <Trash01 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
