# app/routers/drops.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from .. import crud, schemas, models, database
from ..routers.auth import get_current_user

router = APIRouter()


@router.get("/", response_model=List[schemas.Drop])
def read_active_drops(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    """
    GET /drops
    Tüm aktif (veya listelenebilir) drop'ları getirir.
    """
    drops = crud.get_drops(db, skip=skip, limit=limit)
    return drops


@router.post("/{drop_id}/join", response_model=schemas.Message)
def join_drop_waitlist(
    drop_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Giriş yapmış kullanıcıyı bir drop'un bekleme listesine ekler.
    Idempotent'tir (birden fazla kez denense bile sonuç değişmez).
    """
    result = crud.join_waitlist(db, user_id=current_user.id, drop_id=drop_id)
    
    if result == "DROP_NOT_FOUND":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drop bulunamadı")
    
    if result == "ALREADY_IN_WAITLIST":
        return {"detail": "Zaten bekleme listesindesiniz."}

    return {"detail": "Başarıyla bekleme listesine eklendiniz."}


@router.post("/{drop_id}/leave", response_model=schemas.Message)
def leave_drop_waitlist(
    drop_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Giriş yapmış kullanıcıyı bekleme listesinden kaldırır.
    Idempotent'tir.
    """
    result = crud.leave_waitlist(db, user_id=current_user.id, drop_id=drop_id)
    
    if result == "NOT_IN_WAITLIST":
        return {"detail": "Zaten bekleme listesinde değilsiniz."}

    return {"detail": "Başarıyla bekleme listesinden ayrıldınız."}


@router.post("/{drop_id}/claim", response_model=schemas.Claim)
def claim_drop(
    drop_id: int, 
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Giriş yapmış kullanıcı için bir hak talebi oluşturur.
    Tüm stok, zaman ve benzersizlik kontrolleri burada yapılır.
    """
    result = crud.create_claim(db, user_id=current_user.id, drop_id=drop_id)
    
    if result == "DROP_NOT_FOUND":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Drop bulunamadı")
    if result == "CLAIM_WINDOW_CLOSED":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Hak talebi penceresi kapalı")
    if result == "OUT_OF_STOCK":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Stok tükendi")
    if result == "ALREADY_CLAIMED":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Bu drop için zaten hak talebinde bulundunuz")
    if result == "INTERNAL_ERROR":
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="İşlem sırasında bir hata oluştu")
        
    return result