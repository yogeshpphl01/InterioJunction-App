/**
 * <module name="api" layer="frontend" kind="http-client">
 *   <purpose>
 *     Single typed fetch wrapper for the backend. Base URL = EXPO_PUBLIC_BACKEND_URL
 *     + /api. The bearer token is injected here (set by AuthProvider via setAuthToken)
 *     so screens never touch headers. Non-2xx responses throw Error(detail).
 *   </purpose>
 *   <security>EXPO_PUBLIC_BACKEND_URL MUST be https:// in production (no cleartext).</security>
 * </module>
 */
// Tiny fetch wrapper. Token is set by the AuthProvider.
const BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

let _token: string | null = null;
export const setAuthToken = (t: string | null) => {
  _token = t;
};

type Opts = { method?: string; body?: any };

export async function api<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  if (!res.ok) {
    throw new Error(data?.detail || `Request failed (${res.status})`);
  }
  return data as T;
}
