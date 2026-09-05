const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("mp_token");
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export type BackendUser = { id: string; email: string; name: string };
export type AuthResponse = { token: string; user: BackendUser };

export function login(email: string, password: string): Promise<AuthResponse> {
  return apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function register(name: string, email: string, password: string): Promise<AuthResponse> {
  return apiFetch("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) });
}

export type BackendStock = {
  symbol: string;
  price?: number;
  prevClose?: number;
  stale?: boolean;
  fetchedAt?: number;
  bucket: "attention" | "drifted" | "quiet" | "new" | "loading";
  score: number;
  priceChangePct?: number;
  sigma?: number;
  summary: string;
  newsHeadlines?: string[];
};

export function getChanges(): Promise<BackendStock[]> {
  return apiFetch("/stocks/changes");
}

export function addSymbol(symbol: string) {
  return apiFetch("/watchlist", { method: "POST", body: JSON.stringify({ symbol }) });
}

export function removeSymbol(symbol: string) {
  return apiFetch(`/watchlist/${symbol}`, { method: "DELETE" });
}

export function markSeen(symbol: string) {
  return apiFetch(`/stocks/${symbol}/visit`, { method: "POST" });
}

export function markAllSeen() {
  return apiFetch("/stocks/visit-all", { method: "POST" });
}

export function saveSession(auth: AuthResponse) {
  if (typeof window === "undefined") return;
  localStorage.setItem("mp_token", auth.token);
  localStorage.setItem("mp_user", JSON.stringify(auth.user));
}

export function loadSession(): BackendUser | null {
  if (typeof window === "undefined") return null;
  const token = getToken();
  const userRaw = localStorage.getItem("mp_user");
  if (!token || !userRaw) return null;
  try {
    return JSON.parse(userRaw);
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("mp_token");
  localStorage.removeItem("mp_user");
}