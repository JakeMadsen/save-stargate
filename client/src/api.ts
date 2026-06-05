export type ApiUser = {
  _id: string;
  email: string;
  displayName?: string;
  role: "owner" | "admin" | "moderator" | "user";
  status: "invited" | "active" | "banned";
};

export const api = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {})
    },
    ...options
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error ?? "Request failed");
  return payload as T;
};

export const postJson = <T>(path: string, body: unknown) =>
  api<T>(path, {
    method: "POST",
    body: JSON.stringify(body)
  });

export const putJson = <T>(path: string, body: unknown) =>
  api<T>(path, {
    method: "PUT",
    body: JSON.stringify(body)
  });

export const patchJson = <T>(path: string, body: unknown) =>
  api<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body)
  });

export const deleteJson = <T>(path: string) => api<T>(path, { method: "DELETE" });

