const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

let refreshPromise: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`API error ${response.status}: ${response.statusText}`);
      }

      const result: { token?: string } = await response.json();
      if (!result.token) throw new Error("Refresh response did not include an access token.");
      localStorage.setItem("authToken", result.token);
      return result.token;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function apiRequest(path: string, options?: RequestInit): Promise<Response> {
  const headers = new Headers(options?.headers);
  const hasBearerToken = headers.has("Authorization");
  const requestOptions: RequestInit = { ...options, headers, credentials: "include" };
  let response = await fetch(`${API_BASE_URL}${path}`, requestOptions);

  if (response.status === 401 && hasBearerToken && path !== "/auth/refresh") {
    headers.set("Authorization", `Bearer ${await refreshAccessToken()}`);
    response = await fetch(`${API_BASE_URL}${path}`, requestOptions);
  }
  return response;
}

export async function apiDownload(path: string, fallbackFilename: string, init?: RequestInit): Promise<void> {
  const response = await apiRequest(path, init);

  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${response.statusText}`);
  }

  const disposition = response.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? fallbackFilename;

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await apiRequest(path, options);

  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${response.statusText}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return await response.json();
}

export async function apiUpload(
  path: string,
  body: string,
  init?: RequestInit
): Promise<{ status: number; data: unknown }> {
  const response = await apiRequest(path, { method: "POST", body, ...init });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { status: response.status, data };
}