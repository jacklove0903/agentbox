import { API_BASE, AUTH_CLEARED_EVENT, readGuestId, readToken } from "./auth";

type HeaderInit = HeadersInit | undefined;

/** fetch wrapper that auto-prefixes API_BASE and attaches Bearer token. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = readToken();
  const headers = new Headers(init.headers as HeaderInit);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else {
    const guestId = readGuestId();
    if (guestId) headers.set("X-Guest-Id", guestId);
  }
  // Do NOT force a Content-Type for FormData — the browser must set
  // "multipart/form-data; boundary=..." itself, otherwise the request body is unparseable.
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (init.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, { ...init, headers });

  // Global unauthorized handling: drop token and send user back to login.
  if ((res.status === 401 || res.status === 403) && token) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("agentbox_token");
      localStorage.removeItem("agentbox_user");
      window.dispatchEvent(new Event(AUTH_CLEARED_EVENT));
    }
  }
  return res;
}

export async function readApiErrorMessage(res: Response, fallback = "请求失败") {
  try {
    const data = (await res.clone().json()) as { error?: string; message?: string };
    return data.error || data.message || `${fallback}: ${res.status}`;
  } catch {
    try {
      const text = (await res.clone().text()).trim();
      return text || `${fallback}: ${res.status}`;
    } catch {
      return `${fallback}: ${res.status}`;
    }
  }
}
