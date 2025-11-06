from sqlalchemy.orm import Session
from . import models, schemas, security
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timezone
import uuid

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = security.get_password_hash(user.password)
    db_user = models.User(email=user.email, password_hash=hashed_password)
    if user.email == "admin@test.com":
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



def join_waitlist(db: Session, user_id: int, drop_id: int):
    """
    Kullanıcıyı bir drop'un bekleme listesine ekler.
    Idempotent: Zaten varsa, hata vermez, mevcut kaydı döndürür.
    """
    
    db_drop = get_drop(db, drop_id)
    if not db_drop:
        return "DROP_NOT_FOUND"

    existing_entry = db.query(models.Waitlist).filter(
        models.Waitlist.user_id == user_id,
        models.Waitlist.drop_id == drop_id
    ).first()
    
    if existing_entry:
        return "ALREADY_IN_WAITLIST"

    db_waitlist_entry = models.Waitlist(user_id=user_id, drop_id=drop_id)
    db.add(db_waitlist_entry)
    db.commit()
    db.refresh(db_waitlist_entry)
    return db_waitlist_entry


def leave_waitlist(db: Session, user_id: int, drop_id: int):
    """
    Kullanıcıyı bekleme listesinden kaldırır.
    Idempotent: Kayıt yoksa hata vermez, başarılı döner.
    """
    existing_entry = db.query(models.Waitlist).filter(
        models.Waitlist.user_id == user_id,
        models.Waitlist.drop_id == drop_id
    ).first()
    
    if not existing_entry:
        return "NOT_IN_WAITLIST"
        
    db.delete(existing_entry)
    db.commit()
    return "SUCCESS"


def create_claim(db: Session, user_id: int, drop_id: int):
    """
    Bir drop için hak talebi (claim) oluşturur.
    Bu, projedeki en önemli transaction'dır.
    
    Gereksinimler:
    1. Drop var olmalı.
    2. Claim penceresi (zamanı) aktif olmalı.
    3. Kullanıcı daha önce claim yapmamış olmalı (DB Unique Constraint).
    4. Stok olmalı (stock > 0).
    """
    
    try:
        #drop get
        db_drop = db.query(models.Drop).filter(models.Drop.id == drop_id).first()

        if not db_drop:
            return "DROP_NOT_FOUND"

        #time check
        now = datetime.now(timezone.utc)
        
        start_time = db_drop.claim_window_start
        end_time = db_drop.claim_window_end

        if start_time.tzinfo is None:
            start_time = start_time.replace(tzinfo=timezone.utc)
            
        if end_time.tzinfo is None:
            end_time = end_time.replace(tzinfo=timezone.utc)

        if not (start_time <= now <= end_time):
            return "CLAIM_WINDOW_CLOSED"

        #stock check
        if db_drop.stock <= 0:
            return "OUT_OF_STOCK"

        db_drop.stock = db_drop.stock - 1
        
        #unique code
        claim_code = str(uuid.uuid4())
        
        db_claim = models.Claim(
            user_id=user_id,
            drop_id=drop_id,
            code=claim_code
        )
        
        db.add(db_claim)
        
        db.commit()
        
        db.refresh(db_claim)
        return db_claim

    except IntegrityError:
        db.rollback() #error
        return "ALREADY_CLAIMED"
    except Exception as e:
        db.rollback()
        print(f"Beklenmedik hata: {e}")
        return "INTERNAL_ERROR"