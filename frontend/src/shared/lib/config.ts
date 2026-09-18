import type { AccessType, Retention } from "./api";

export const GB = 1024 ** 3;

// Storage time is inversely proportional to the allowed size.
export const RETENTIONS: { value: Retention; label: string; limit: number }[] = [
  { value: "1h", label: "1 час", limit: 16 * GB },
  { value: "12h", label: "12 часов", limit: 8 * GB },
  { value: "1d", label: "1 день", limit: 4 * GB },
  { value: "3d", label: "3 дня", limit: 2 * GB },
];

export const ACCESS_LABELS: Record<AccessType, string> = {
  public: "Публичная",
  private: "Приватная",
  one_time: "Одноразовая",
};

export const CODE_LENGTH = 6;
export const NAME_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;
export const PASSWORD_MIN_LENGTH = 4;
export const NAME_ERROR = "Имя папки: от 3 до 32 символов, латиница, цифры, «-» и «_»";
