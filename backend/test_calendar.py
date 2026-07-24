import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.day_order_calendar import CalendarDay

db = SessionLocal()
days = db.query(CalendarDay).all()
print("Number of calendar days:", len(days))
for d in days:
    print(f"Date: {d.date}, DayType: {d.day_type}, DayOrder: {d.day_order}")
db.close()
