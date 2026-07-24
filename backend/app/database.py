from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_size=50,
    max_overflow=30,
    pool_pre_ping=True,    # verify connections are alive before use
    pool_recycle=300,      # recycle connections after 5 minutes (before PG idle timeout)
    pool_timeout=30,       # fail fast after 30s instead of hanging indefinitely
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
