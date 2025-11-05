from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, database

from ..routers.auth import get_current_admin_user
from .. import models

router = APIRouter()

@router.post("/drops", response_model=schemas.Drop, status_code=status.HTTP_201_CREATED)
def create_new_drop(
    drop: schemas.DropCreate, 
    db: Session = Depends(database.get_db), 
    admin_user: models.User = Depends(get_current_admin_user)
):
    return crud.create_drop(db=db, drop=drop)

@router.get("/drops", response_model=List[schemas.Drop])
def read_all_drops(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db), admin_user: models.User = Depends(get_current_admin_user)):
    return crud.get_drops(db, skip=skip, limit=limit)

@router.put("/drops/{drop_id}", response_model=schemas.Drop)
def update_existing_drop(
    drop_id: int, 
    drop_update: schemas.DropUpdate, 
    db: Session = Depends(database.get_db),
    admin_user: models.User = Depends(get_current_admin_user)
):
    db_drop = crud.update_drop(db, drop_id=drop_id, drop_update=drop_update)
    if db_drop is None:
        raise HTTPException(status_code=404, detail="Drop bulunamadı")
    return db_drop

@router.delete("/drops/{drop_id}", response_model=schemas.Drop)
def delete_existing_drop(
    drop_id: int, 
    db: Session = Depends(database.get_db), 
    admin_user: models.User = Depends(get_current_admin_user)
):
    db_drop = crud.delete_drop(db, drop_id=drop_id)
    if db_drop is None:
        raise HTTPException(status_code=404, detail="Drop bulunamadı")
    return db_drop
