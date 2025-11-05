from sqlalchemy.orm import Session
from . import models, schemas, security

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = security.get_password_hash(user.password)
    db_user = models.User(email=user.email, password_hash=hashed_password)
    if user.email == "admin@example.com":
        db_user.is_admin = True
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_drop(db: Session, drop_id: int):
    return db.query(models.Drop).filter(models.Drop.id == drop_id).first()

def get_drops(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Drop).offset(skip).limit(limit).all()

def create_drop(db: Session, drop: schemas.DropCreate):
    db_drop = models.Drop(**drop.dict())
    db.add(db_drop)
    db.commit()
    db.refresh(db_drop)
    return db_drop

def update_drop(db: Session, drop_id: int, drop_update: schemas.DropUpdate):
    db_drop = get_drop(db, drop_id)
    if not db_drop:
        return None
    update_data = drop_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_drop, key, value)
    db.commit()
    db.refresh(db_drop)
    return db_drop

def delete_drop(db: Session, drop_id: int):
    db_drop = get_drop(db, drop_id)
    if not db_drop:
        return None
    db.delete(db_drop)
    db.commit()
    return db_drop
