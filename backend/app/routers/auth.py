from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from jose import JWTError, jwt


from .. import models
from .. import crud, schemas, database, security

from fastapi.security import OAuth2PasswordBearer   #for dependency injection
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

router = APIRouter()

@router.post("/signup", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def signup_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu e-posta adresi zaten kayıtlı."
        )
    return crud.create_user(db=db, user=user)


class Token(schemas.BaseModel):
    access_token: str
    token_type: str

@router.post("/login", response_model=Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(database.get_db)
):
    """
    POST /auth/login
    Kullanıcıya 'access_token' sağlar.
    
    NOT: Bu endpoint 'form data' bekler (username & password), JSON değil!
    Swagger (/docs) arayüzü bunu otomatik olarak halleder.
    """
    
    user = crud.get_user_by_email(db, email=form_data.username) 
    
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Geçersiz e-posta veya parola",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.email}, 
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    """
    Token'ı alır, doğrular ve mevcut kullanıcı modelini döndürür.
    Korumalı endpoint'ler bunu 'Depends' olarak kullanacak.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Kimlik bilgileri doğrulanamadı",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = crud.get_user_by_email(db, email=email)
    if user is None:
        raise credentials_exception
        
    return user

async def get_current_admin_user(current_user: models.User = Depends(get_current_user)):
    """
    Mevcut kullanıcının admin olup olmadığını kontrol eder.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlemi yapmak için yetkiniz yok."
        )
    return current_user