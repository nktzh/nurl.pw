import { GB } from "./config";

const UNITS = ["Б", "КБ", "МБ", "ГБ", "ТБ"];

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / 1024 ** exp;
  return `${value.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} ${UNITS[exp]}`;
}

const dateFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

/** Size limits are whole gigabytes. */
export function formatGb(bytes: number): string {
  return `${Math.round(bytes / GB)} ГБ`;
}

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

export function pluralFiles(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} файл`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} файла`;
  return `${n} файлов`;
}
