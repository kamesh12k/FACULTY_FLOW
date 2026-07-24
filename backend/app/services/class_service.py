from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.class_ import Class
from app.models.timetable import TimetableSlot
from app.schemas.class_ import ClassCreate, ClassUpdate


def list_classes(db: Session, tenant_department_id: int | None = None) -> list[Class]:
    # Classes are global. tenant_department_id is deliberately ignored for
    # read access; it remains relevant only when an admin changes ownership.
    return db.query(Class).order_by(Class.name, Class.section).all()


def create_class(data: ClassCreate, db: Session, tenant_department_id: int | None = None) -> Class:
    dept_id = tenant_department_id if tenant_department_id is not None else data.department_id
    exists = db.query(Class).filter(
        Class.name == data.name,
        Class.section == data.section,
    ).first()
    if exists:
        raise HTTPException(status_code=400, detail="A global class with that name and section already exists")
    
    cls = Class(
        name=data.name,
        section=data.section,
        department_id=dept_id,
        semester=data.semester
    )
    db.add(cls)
    db.commit()
    db.refresh(cls)
    return cls


def update_class(class_id: int, data: ClassUpdate, db: Session, tenant_department_id: int | None = None) -> Class:
    query = db.query(Class).filter(Class.id == class_id)
    if tenant_department_id is not None:
        query = query.filter(Class.department_id == tenant_department_id)
    cls = query.first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
        
    for key, value in data.model_dump(exclude_unset=True).items():
        if key == "department_id" and tenant_department_id is not None and value != tenant_department_id:
            raise HTTPException(status_code=403, detail="Cannot assign class to another department")
        setattr(cls, key, value)
        
    db.commit()
    db.refresh(cls)
    return cls


def delete_class(class_id: int, db: Session, tenant_department_id: int | None = None) -> None:
    query = db.query(Class).filter(Class.id == class_id)
    if tenant_department_id is not None:
        query = query.filter(Class.department_id == tenant_department_id)
    cls = query.first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
        
    in_use = db.query(TimetableSlot).filter(TimetableSlot.class_id == class_id).first()
    if in_use:
        raise HTTPException(status_code=400, detail="Cannot delete a class that has timetable slots")
    db.delete(cls)
    db.commit()
