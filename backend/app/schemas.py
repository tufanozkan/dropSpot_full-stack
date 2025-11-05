from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_admin: bool

    class Config:
        from_attributes = True
        orm_mode = True

class DropBase(BaseModel):
    title: str
    description: Optional[str] = None
    claim_window_start: datetime
    claim_window_end: datetime
    stock: int

class DropCreate(DropBase):
    pass

class DropUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    claim_window_start: Optional[datetime] = None
    claim_window_end: Optional[datetime] = None
    stock: Optional[int] = None

class Drop(DropBase):
    id: int

    class Config:
        from_attributes = True
        orm_mode = True
