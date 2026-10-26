const API_URL = import.meta.env.VITE_API_URL || ""

// Static mode (e.g. the free S3 deployment): there is no backend server.
// The browser calls the same free, keyless rate API the backend uses
// (open.er-api.com, CORS-enabled) and keeps a local daily history in
// localStorage, so the converter and chart work with hosting costs of ~$0.
// Enable with VITE_STATIC_MODE=true at build time. When a real backend is
// deployed (Docker / EC2), leave it unset and the original API is used.
const STATIC_MODE =
  import.meta.env.VITE_STATIC_MODE === "true" || API_URL === "static"

const DIRECT_RATE_URL = "https://open.er-api.com/v6/latest/USD"
const HISTORY_KEY = "cv-rate-history"

export interface RatePoint {
  date: string
  usd_to_inr: number
  inr_to_usd: number
}

export interface LatestRate extends RatePoint {
  fetched_at: string | null
}

export interface ConvertResult {
  amount: number
  from_currency: string
  to_currency: string
  rate: number
  result: number
  as_of: string
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Request failed: ${res.status}`)
  }
  return res.json()
}

// ---- Static-mode implementation (no backend) ----

function loadStoredHistory(): RatePoint[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const points = raw ? (JSON.parse(raw) as RatePoint[]) : []
    return Array.isArray(points) ? points : []
  } catch {
    return []
  }
}

function recordPoint(point: RatePoint) {
  try {
    const points = loadStoredHistory().filter((p) => p.date !== point.date)
    points.push(point)
    points.sort((a, b) => a.date.localeCompare(b.date))
    localStorage.setItem(HISTORY_KEY, JSON.stringify(points.slice(-365)))
  } catch {
    // Storage unavailable (private mode etc.) — the app still works live.
  }
}

async function fetchDirectLatest(): Promise<LatestRate> {
  const res = await fetch(DIRECT_RATE_URL)
  if (!res.ok) throw new Error(`Rate request failed: ${res.status}`)
  const data = await res.json()
  if (data?.result !== "success" || !data?.rates?.INR) {
    throw new Error("Rate API returned an unexpected response")
  }
  const usdToInr = Number(data.rates.INR)
  const updated = data.time_last_update_utc
    ? new Date(data.time_last_update_utc)
    : new Date()
  const date = updated.toISOString().slice(0, 10)
  const point: LatestRate = {
    date,
    usd_to_inr: usdToInr,
    inr_to_usd: Math.round((1 / usdToInr) * 1e6) / 1e6,
    fetched_at: updated.toISOString(),
  }
  recordPoint(point)
  return point
}

async function staticHistory(days: number): Promise<RatePoint[]> {
  // Make sure today's real rate is recorded before reading history.
  await fetchDirectLatest().catch(() => undefined)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return loadStoredHistory().filter((p) => new Date(p.date) >= cutoff)
}

async function staticConvert(
  amount: number,
  from: string,
  to: string
): Promise<ConvertResult> {
  if (from === to) throw new Error("from and to currencies must differ")
  const latest = await fetchDirectLatest()
  const rate = from === "USD" ? latest.usd_to_inr : latest.inr_to_usd
  return {
    amount,
    from_currency: from,
    to_currency: to,
    rate: Math.round(rate * 1e6) / 1e6,
    result: Math.round(amount * rate * 1e4) / 1e4,
    as_of: latest.date,
  }
}

export const api = {
  latest: () =>
    STATIC_MODE ? fetchDirectLatest() : request<LatestRate>("/rate/latest"),
  history: (days = 30) =>
    STATIC_MODE
      ? staticHistory(days)
      : request<RatePoint[]>(`/rate/history?days=${days}`),
  convert: (amount: number, from: string, to: string) =>
    STATIC_MODE
      ? staticConvert(amount, from, to)
      : request<ConvertResult>(
          `/convert?amount=${amount}&from=${from}&to=${to}`
        ),
}
