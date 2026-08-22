"""
Fetches the USD -> INR rate from a free, keyless public API
(https://www.exchangerate-api.com/docs/free) and upserts today's row.
"""

import logging
from datetime import datetime, timezone

import httpx
from sqlalchemy.orm import Session

from .models import ExchangeRate

logger = logging.getLogger("currency-visualizer")

RATE_API_URL = "https://open.er-api.com/v6/latest/USD"


def fetch_usd_to_inr() -> float:
    resp = httpx.get(RATE_API_URL, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    if data.get("result") != "success":
        raise RuntimeError(f"Rate API returned an error payload: {data}")
    rate = data["rates"]["INR"]
    return float(rate)


def upsert_today_rate(db: Session) -> ExchangeRate:
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    rate_value = fetch_usd_to_inr()

    existing = db.query(ExchangeRate).filter(ExchangeRate.date == today).first()
    if existing:
        existing.usd_to_inr = rate_value
        row = existing
    else:
        row = ExchangeRate(date=today, usd_to_inr=rate_value)
        db.add(row)

    db.commit()
    db.refresh(row)
    logger.info("Stored USD->INR rate %.4f for %s", rate_value, today.date())
    return row


def seed_history_if_empty(db: Session) -> None:
    """
    On a completely fresh DB there's nothing to chart yet. We can't get free
    historical data from the keyless API, so we just make sure today's rate
    exists — the chart fills in day by day as the scheduler runs.
    """
    count = db.query(ExchangeRate).count()
    if count == 0:
        try:
            upsert_today_rate(db)
        except Exception:
            logger.exception("Initial rate fetch failed; will retry on next scheduled run")
