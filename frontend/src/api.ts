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
