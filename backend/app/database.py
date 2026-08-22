import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# In Docker Compose, DATABASE_URL points at the postgres service.
# Falls back to a local sqlite file for quick local runs without Docker.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./currency.db",
)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
