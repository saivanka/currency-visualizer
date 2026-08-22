import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from .database import SessionLocal
from .rates import upsert_today_rate

logger = logging.getLogger("currency-visualizer")


def _daily_job():
    db = SessionLocal()
    try:
        upsert_today_rate(db)
    except Exception:
        logger.exception("Daily rate refresh failed")
    finally:
        db.close()


def start_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler(timezone="UTC")
    # Runs once a day at 00:05 UTC. Change the hour/minute to taste.
    scheduler.add_job(_daily_job, CronTrigger(hour=0, minute=5), id="daily_rate_refresh")
    scheduler.start()
    logger.info("Scheduler started: daily rate refresh at 00:05 UTC")
    return scheduler
