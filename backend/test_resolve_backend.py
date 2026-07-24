import sys
import os
from datetime import date

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.services import day_order_service

db = SessionLocal()
the_date = date(2026, 7, 17)
day = day_order_service.resolve_by_date(db, the_date)
if day:
    print(f"Backend Resolve for {the_date}:")
    print(f"  date: {day.date}")
    print(f"  day_type: {day.day_type} (type: {type(day.day_type)})")
    print(f"  day_order: {day.day_order}")
    print(f"  blocks_operations: {day.blocks_operations}")
else:
    print(f"No entry found for {the_date}")
db.close()
