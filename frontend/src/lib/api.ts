const API_URL = import.meta.env.VITE_API_URL || ""

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

export const api = {
  latest: () => request<LatestRate>("/rate/latest"),
  history: (days = 30) => request<RatePoint[]>(`/rate/history?days=${days}`),
  convert: (amount: number, from: string, to: string) =>
    request<ConvertResult>(
      `/convert?amount=${amount}&from=${from}&to=${to}`
    ),
}
