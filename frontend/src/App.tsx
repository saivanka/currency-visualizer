import { ConverterCard } from "@/components/converter-card"
import { RateChart } from "@/components/rate-chart"

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 py-12">
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            USD <span className="text-primary">⇄</span> INR Visualizer
          </h1>
          <p className="mt-2 text-muted-foreground">
            Daily dollar-to-rupee tracking, powered by FastAPI + Postgres.
          </p>
        </header>

        <div className="grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <div className="flex justify-center">
            <ConverterCard />
          </div>
          <div className="flex justify-center">
            <RateChart />
          </div>
        </div>

        <footer className="pt-6 text-center text-xs text-muted-foreground">
          Rates refresh once a day. Data source:{" "}
          <a
            href="https://www.exchangerate-api.com/"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-foreground"
          >
            exchangerate-api.com
          </a>
        </footer>
      </div>
    </div>
  )
}

export default App
