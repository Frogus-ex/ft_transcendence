const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const REASONS: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  413: "Payload Too Large",
  422: "Unprocessable Entity",
  429: "Too Many Requests",
};

// The SPA asks the API to answer handled client errors (4xx) with HTTP 200 plus an
// "X-Real-Status" header, so the browser does not print a red network error in the console
// for failures the UI already reports (wrong password, wrong 2FA code, rate limit...).
// The real status is rebuilt here, so the rest of the app behaves exactly as with real 4xx codes.
// Other API clients (curl, API keys, Swagger) do not send the header and get the real status.
async function softFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("X-Soft-Errors", "1");
  const response = await fetch(url, { ...init, headers });
  const realStatus = Number(response.headers.get("X-Real-Status"));
  if (realStatus >= 400 && realStatus < 500) {
    return new Response(await response.text(), {
      status: realStatus,
      statusText: REASONS[realStatus] ?? "",
      headers: response.headers,
    });
  }
  return response;
}

let refreshPromise: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await softFetch(`${API_BASE_URL}/auth/refresh`, {
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
  let response = await softFetch(`${API_BASE_URL}${path}`, requestOptions);

  if (response.status === 401 && hasBearerToken && path !== "/auth/refresh") {
    headers.set("Authorization", `Bearer ${await refreshAccessToken()}`);
    response = await softFetch(`${API_BASE_URL}${path}`, requestOptions);
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