from datetime import datetime
from pydantic import BaseModel


class RateOut(BaseModel):
    date: datetime
    usd_to_inr: float
    inr_to_usd: float

    class Config:
        from_attributes = True


class LatestRateOut(RateOut):
    fetched_at: datetime | None = None


class ConvertOut(BaseModel):
    amount: float
    from_currency: str
    to_currency: str
    rate: float
    result: float
    as_of: datetime
