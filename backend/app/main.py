import logging
import os
import time
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from app.core.traffic import traffic_manager

from app.config import settings
from app.database import Base, engine, SessionLocal, get_db
import app.models  # ensure all models are registered with Base before create_all

from app.routes import (
    auth, teachers, timetable, leaves, credits, notifications,
    departments, subjects, classes, rooms, day_order, admin, academic_calendar,
    campus_operations, teacher_substitution, substitutions, principal,
)
from app.routes import admin_timetable_import
from app.services.admin_service import bootstrap_default_super_admin

logging.basicConfig(level=logging.INFO)

# Create tables on startup (use Alembic migrations in production)
if not os.environ.get("SKIP_DB_INIT"):
    Base.metadata.create_all(bind=engine)

# Bootstrap: if no Super Admin exists yet (fresh install, or right after a
# Factory Reset performed via the offline CLI script with zero remaining
# users), create username=admin / password=admin with a forced credential
# change. No-op if a Super Admin already exists.
if not os.environ.get("SKIP_DB_INIT"):
    with SessionLocal() as _bootstrap_db:
        bootstrap_default_super_admin(_bootstrap_db)

def get_allowed_origins():
    import socket
    origins = list(settings.FRONTEND_ORIGIN)
    local_ips = ["127.0.0.1", "localhost"]
    try:
        hostname = socket.gethostname()
        local_ips.append(socket.gethostbyname(hostname))
    except Exception:
        pass
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ips.append(s.getsockname()[0])
        s.close()
    except Exception:
        pass
    for ip in set(local_ips):
        if ip:
            origins.append(f"http://{ip}:5173")
            origins.append(f"https://{ip}:5173")
            origins.append(f"http://{ip}:8000")
            origins.append(f"https://{ip}:8000")
    return list(set(origins))

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(
    title=settings.APP_NAME,
    version="3.0.0",
    description="Manage teacher leave requests, substitute assignments, credit workload balancing, timetables, and the academic calendar (Day Order rotation + holiday management).",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def traffic_logger_middleware(request: Request, call_next):
    start_time = time.time()
    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    except Exception as e:
        status_code = 500
        raise e
    finally:
        process_time_ms = (time.time() - start_time) * 1000
        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path
        if not path.startswith("/admin/system-metrics") and path != "/health":
            traffic_manager.add_log(
                method=request.method,
                path=path,
                status_code=status_code,
                process_time_ms=process_time_ms,
                client_ip=client_ip
            )

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(teachers.router)
app.include_router(timetable.router)
app.include_router(leaves.router)
app.include_router(credits.router)
app.include_router(notifications.router)
app.include_router(departments.router)
app.include_router(subjects.router)
app.include_router(classes.router)
app.include_router(rooms.router)
app.include_router(day_order.router)
app.include_router(academic_calendar.router)
app.include_router(campus_operations.router)
app.include_router(teacher_substitution.router)
app.include_router(substitutions.router)
app.include_router(admin_timetable_import.router)
app.include_router(principal.router)



@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}


@app.get("/settings/public", tags=["Settings"])
def public_settings(db = Depends(get_db)):
    """Branding values the frontend reads on load — no auth required since
    this only exposes display customization (app name, accent color),
    nothing sensitive. Lets an institution rebrand the app via .env alone,
    without touching frontend code or rebuilding."""
    from app.services.department_service import list_departments
    depts = list_departments(db)
    return {
        "app_name": settings.APP_NAME,
        "primary_color": settings.PRIMARY_COLOR,
        "periods_per_day": settings.PERIODS_PER_DAY,
        "day_order_max": settings.DAY_ORDER_MAX,
        "departments": [{"id": d.id, "name": d.name, "code": d.code} for d in depts]
    }
