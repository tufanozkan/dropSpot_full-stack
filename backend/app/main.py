from fastapi import FastAPI
from .database import engine
from . import models
from .routers import auth, admin

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="DropSpot API",
    description="Özel ürünler için bekleme listesi ve claim platformu.",
    version="0.1.0"
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(admin.router, prefix="/admin", tags=["Admin"])

@app.get("/", tags=["Root"])
def read_root():
    return {"message": "DropSpot API'ye hoş geldiniz! (SQLite Veritabanı Aktif)"}
