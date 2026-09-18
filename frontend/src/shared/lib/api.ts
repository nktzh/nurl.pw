const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export type AccessType = "public" | "private" | "one_time";
export type Retention = "1h" | "12h" | "1d" | "3d";

export interface FileInfo {
  id: string;
  name: string;
  size: number;
  content_type: string | null;
}

export interface DropCreatePayload {
  access: AccessType;
  retention: Retention;
  name?: string;
  password?: string;
  password_confirm?: string;
  files: { name: string; size: number; content_type?: string }[];
}

export interface DropCreated {
  id: string;
  code: string;
  name: string | null;
  access: AccessType;
  expires_at: string;
  owner_token: string;
  files: { id: string; name: string; size: number }[];
}

export interface Drop {
  code: string;
  name: string | null;
  access: AccessType;
  retention: Retention;
  expires_at: string;
  total_size: number;
  file_count: number;
  locked: boolean;
  files: FileInfo[];
}

export class ApiError extends Error {}

const apiUrl = (path: string) => `${API_URL}/api${path}`;

function errorMessage(body: string, status: number): string {
  try {
    const { detail } = JSON.parse(body);
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail[0]?.msg) {
      return String(detail[0].msg).replace(/^Value error,\s*/, "");
    }
  } catch {
    // not JSON
  }
  return status >= 500 ? "Сервер недоступен, попробуйте позже" : "Что-то пошло не так";
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
    });
  } catch {
    throw new ApiError("Нет соединения с сервером");
  }
  if (!res.ok) {
    throw new ApiError(errorMessage(await res.text(), res.status));
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export const api = {
  createDrop: (payload: DropCreatePayload) =>
    request<DropCreated>("/drops", { method: "POST", body: JSON.stringify(payload) }),

  completeDrop: (id: string, ownerToken: string) =>
    request<void>(`/drops/${id}/complete`, {
      method: "POST",
      headers: { "X-Owner-Token": ownerToken },
    }),

  deleteDrop: (id: string, ownerToken: string) =>
    request<void>(`/drops/${id}`, {
      method: "DELETE",
      headers: { "X-Owner-Token": ownerToken },
    }),

  getDrop: (key: string, accessToken?: string | null) =>
    request<Drop>(`/drops/${encodeURIComponent(key)}`, {
      headers: accessToken ? { "X-Access-Token": accessToken } : {},
    }),

  unlockDrop: (key: string, password: string) =>
    request<{ token: string; expires_in: number }>(
      `/drops/${encodeURIComponent(key)}/access`,
      { method: "POST", body: JSON.stringify({ password }) },
    ),

  fileUrl: (key: string, fileId: string, token?: string | null) =>
    withToken(apiUrl(`/drops/${encodeURIComponent(key)}/files/${fileId}`), token),

  archiveUrl: (key: string, token?: string | null) =>
    withToken(apiUrl(`/drops/${encodeURIComponent(key)}/archive`), token),

  oneTimeUrl: (key: string) => apiUrl(`/drops/${encodeURIComponent(key)}/download`),

  /** Streams a single file with progress; XHR is used because fetch has no upload progress. */
  uploadFile(
    dropId: string,
    fileId: string,
    file: File,
    ownerToken: string,
    onProgress: (loaded: number) => void,
    signal: AbortSignal,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", apiUrl(`/drops/${dropId}/files/${fileId}`));
      xhr.setRequestHeader("X-Owner-Token", ownerToken);
      xhr.setRequestHeader("Content-Type", "application/octet-stream");
      xhr.upload.onprogress = (e) => onProgress(e.loaded);
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(file.size);
          resolve();
        } else {
          reject(new ApiError(errorMessage(xhr.responseText, xhr.status)));
        }
      };
      xhr.onerror = () => reject(new ApiError("Соединение прервано"));
      xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
      xhr.send(file);
    });
  },
};

function withToken(url: string, token?: string | null) {
  return token ? `${url}?token=${encodeURIComponent(token)}` : url;
}

export function dropLink(origin: string, drop: { code: string; name: string | null }) {
  return `${origin}/d/${drop.name ?? drop.code}`;
}
