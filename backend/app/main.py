# app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine
from . import models
from .routers import auth, admin, drops

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="DropSpot API",
    description="Özel ürünler için bekleme listesi ve claim platformu.",
    version="0.1.0"
)

origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       
    allow_credentials=True,    
    allow_methods=["*"],       
    allow_headers=["*"],       
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])
app.include_router(drops.router, prefix="/drops", tags=["Drops"])


@app.get("/", tags=["Root"])
def read_root():
    """
    API'nin çalışıp çalışmadığını kontrol etmek için basit bir endpoint.
    """
    return {"message": "DropSpot API'ye hoş geldiniz! (SQLite Veritabanı Aktif)"}