import { useEffect, useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { api, type RatePoint } from "@/lib/api"

const RANGES = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
]

export function RateChart() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<RatePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    api
      .history(days)
      .then((points) => {
        if (!cancelled) setData(points)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load history")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [days])

  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    rate: d.usd_to_inr,
  }))

  return (
    <Card className="w-full max-w-2xl shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-xl">USD → INR Trend</CardTitle>
          <CardDescription>Daily snapshot, most recent {days} days</CardDescription>
        </div>
        <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <TabsList>
            {RANGES.map((r) => (
              <TabsTrigger key={r.days} value={String(r.days)}>
                {r.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : error ? (
          <div className="flex h-64 items-center justify-center text-sm text-destructive">
            {error}
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            No history yet — check back after the next daily refresh.
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rateFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  className="fill-muted-foreground"
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                  className="fill-muted-foreground"
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    fontSize: 12,
                  }}
                  formatter={(value) => [Number(value).toFixed(4), "USD → INR"]}
                />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#rateFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
