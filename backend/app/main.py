# app/main.py

from fastapi import FastAPI
from .database import engine
from . import models

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="DropSpot API",
    description="Özel ürünler için bekleme listesi ve claim platformu.",
    version="0.1.0"
)


@app.get("/", tags=["Root"])
def read_root():
    """
    API'nin çalışıp çalışmadığını kontrol etmek için basit bir endpoint.
    """
    return {"message": "DropSpot API'ye hoş geldiniz! (SQLite Veritabanı Aktif)"}