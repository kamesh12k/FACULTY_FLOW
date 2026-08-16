from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_pre_ping=True,    # verify connections are alive before use
    pool_recycle=settings.DB_POOL_RECYCLE,      # recycle connections after 5 minutes (before PG idle timeout)
    pool_timeout=settings.DB_POOL_TIMEOUT,       # fail fast after 30s instead of hanging indefinitely
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
