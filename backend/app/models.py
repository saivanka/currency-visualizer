from sqlalchemy import Column, Integer, Float, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from .database import Base


class ExchangeRate(Base):
    """
    One row per day: USD->INR rate (and its inverse is derived at query time).
    A UniqueConstraint on `date` means the daily job upserts rather than
    piling up duplicate rows if it runs more than once in a day.
    """

    __tablename__ = "exchange_rates"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    usd_to_inr = Column(Float, nullable=False)
    fetched_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("date", name="uq_exchange_rates_date"),)
