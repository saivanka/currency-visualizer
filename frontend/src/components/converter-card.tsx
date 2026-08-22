import { useEffect, useState } from "react"
import { ArrowLeftRight, RefreshCw } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { api, type LatestRate } from "@/lib/api"

const CURRENCY_LABEL: Record<string, string> = {
  USD: "US Dollar",
  INR: "Indian Rupee",
}

export function ConverterCard() {
  const [latest, setLatest] = useState<LatestRate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [amount, setAmount] = useState("1")
  const [from, setFrom] = useState<"USD" | "INR">("USD")
  const [to, setTo] = useState<"USD" | "INR">("INR")

  async function loadLatest() {
    setLoading(true)
    setError(null)
    try {
      const data = await api.latest()
      setLatest(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load the latest rate")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLatest()
  }, [])

  const rate = latest ? (from === "USD" ? latest.usd_to_inr : latest.inr_to_usd) : null
  const numericAmount = parseFloat(amount) || 0
  const result = rate !== null ? numericAmount * rate : null

  function swap() {
    setFrom(to)
    setTo(from)
  }

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Currency Converter</CardTitle>
          {latest && (
            <Badge variant="secondary" className="font-mono">
              1 USD = {latest.usd_to_inr.toFixed(2)} INR
            </Badge>
          )}
        </div>
        <CardDescription>Live-ish daily USD ⇄ INR conversion</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
            <Button variant="link" className="ml-2 h-auto p-0" onClick={loadLatest}>
              retry
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label>From</Label>
                <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm font-medium">
                  {from} — {CURRENCY_LABEL[from]}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="mb-0.5 shrink-0"
                onClick={swap}
                aria-label="Swap currencies"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
              <div className="flex-1 space-y-1.5">
                <Label>To</Label>
                <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm font-medium">
                  {to} — {CURRENCY_LABEL[to]}
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-primary/5 p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Converted amount
              </div>
              <div className="mt-1 text-2xl font-bold tabular-nums">
                {result !== null
                  ? result.toLocaleString(undefined, { maximumFractionDigits: 2 })
                  : "—"}{" "}
                <span className="text-base font-medium text-muted-foreground">{to}</span>
              </div>
              {rate !== null && (
                <div className="mt-1 text-xs text-muted-foreground">
                  1 {from} = {rate.toFixed(4)} {to}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {latest?.date &&
                  `As of ${new Date(latest.date).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}`}
              </span>
              <Button variant="ghost" size="sm" onClick={loadLatest} className="h-7 gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
