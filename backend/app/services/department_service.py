from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.department import Department
from app.models.subject import Subject
from app.models.class_ import Class
from app.schemas.department import DepartmentCreate, DepartmentUpdate


def list_departments(db: Session, tenant_department_id: int | None = None) -> list[Department]:
    query = db.query(Department)
    if tenant_department_id is not None:
        query = query.filter(Department.id == tenant_department_id)
    return query.order_by(Department.name).all()


def check_department_access(dept_id: int, tenant_department_id: int | None) -> None:
    if tenant_department_id is not None and dept_id != tenant_department_id:
        raise HTTPException(status_code=403, detail="Access denied to this department's resources")


def create_department(data: DepartmentCreate, db: Session) -> Department:
    if db.query(Department).filter(Department.name == data.name).first():
        raise HTTPException(status_code=400, detail="A department with that name already exists")
    if data.code and db.query(Department).filter(Department.code == data.code).first():
        raise HTTPException(status_code=400, detail="A department with that code already exists")
    dept = Department(**data.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


def update_department(dept_id: int, data: DepartmentUpdate, db: Session, tenant_department_id: int | None = None) -> Department:
    check_department_access(dept_id, tenant_department_id)
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    
    if data.name is not None and data.name != dept.name:
        if db.query(Department).filter(Department.name == data.name).first():
            raise HTTPException(status_code=400, detail="A department with that name already exists")
            
    if data.code is not None and data.code != dept.code:
        if db.query(Department).filter(Department.code == data.code).first():
            raise HTTPException(status_code=400, detail="A department with that code already exists")
            
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(dept, key, value)
        
    db.commit()
    db.refresh(dept)
    return dept


def delete_department(dept_id: int, db: Session, tenant_department_id: int | None = None) -> None:
    check_department_access(dept_id, tenant_department_id)
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
        
    if db.query(Subject).filter(Subject.department_id == dept_id).first():
        raise HTTPException(status_code=400, detail="Cannot delete a department with associated subjects")
    if db.query(Class).filter(Class.department_id == dept_id).first():
        raise HTTPException(status_code=400, detail="Cannot delete a department with associated classes")
        
    db.delete(dept)
    db.commit()

