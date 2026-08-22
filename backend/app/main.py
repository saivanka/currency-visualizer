import logging
from datetime import datetime, timezone, timedelta

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc

from . import models
from .database import engine, get_db
from .rates import upsert_today_rate, seed_history_if_empty
from .scheduler import start_scheduler
from .schemas import RateOut, LatestRateOut, ConvertOut

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("currency-visualizer")

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Currency Visualizer API",
    description="Daily USD <-> INR exchange rate tracker and converter.",
    version="1.0.0",
)

# CORS: wide open for simplicity. In production, restrict allow_origins to
# your actual frontend domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_scheduler = None


@app.on_event("startup")
def on_startup():
    global _scheduler
    db = next(get_db())
    try:
        seed_history_if_empty(db)
    finally:
        db.close()
    _scheduler = start_scheduler()


@app.get("/api/health")
def health():
    return {"status": "ok", "time": datetime.now(timezone.utc)}


@app.get("/api/rate/latest", response_model=LatestRateOut)
def latest_rate(db: Session = Depends(get_db)):
    row = db.query(models.ExchangeRate).order_by(desc(models.ExchangeRate.date)).first()
    if not row:
        raise HTTPException(status_code=404, detail="No rate data yet, try again shortly.")
    return LatestRateOut(
        date=row.date,
        usd_to_inr=row.usd_to_inr,
        inr_to_usd=round(1 / row.usd_to_inr, 6),
        fetched_at=row.fetched_at,
    )


@app.get("/api/rate/history", response_model=list[RateOut])
def rate_history(days: int = Query(30, ge=1, le=365), db: Session = Depends(get_db)):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (
        db.query(models.ExchangeRate)
        .filter(models.ExchangeRate.date >= cutoff)
        .order_by(models.ExchangeRate.date.asc())
        .all()
    )
    return [
        RateOut(date=r.date, usd_to_inr=r.usd_to_inr, inr_to_usd=round(1 / r.usd_to_inr, 6))
        for r in rows
    ]


@app.get("/api/convert", response_model=ConvertOut)
def convert(
    amount: float = Query(..., gt=0),
    from_currency: str = Query(..., alias="from", pattern="^(USD|INR)$"),
    to_currency: str = Query(..., alias="to", pattern="^(USD|INR)$"),
    db: Session = Depends(get_db),
):
    if from_currency == to_currency:
        raise HTTPException(status_code=400, detail="from and to currencies must differ")

    row = db.query(models.ExchangeRate).order_by(desc(models.ExchangeRate.date)).first()
    if not row:
        raise HTTPException(status_code=404, detail="No rate data yet, try again shortly.")

    if from_currency == "USD" and to_currency == "INR":
        rate = row.usd_to_inr
    else:
        rate = 1 / row.usd_to_inr

    return ConvertOut(
        amount=amount,
        from_currency=from_currency,
        to_currency=to_currency,
        rate=round(rate, 6),
        result=round(amount * rate, 4),
        as_of=row.date,
    )


@app.post("/api/rate/refresh", response_model=LatestRateOut)
def manual_refresh(db: Session = Depends(get_db)):
    """Manually trigger a rate fetch instead of waiting for the daily job."""
    row = upsert_today_rate(db)
    return LatestRateOut(
        date=row.date,
        usd_to_inr=row.usd_to_inr,
        inr_to_usd=round(1 / row.usd_to_inr, 6),
        fetched_at=row.fetched_at,
    )
