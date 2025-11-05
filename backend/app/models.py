from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)

    waitlist_entries = relationship("Waitlist", back_populates="user")
    claims = relationship("Claim", back_populates="user")

class Drop(Base):
    __tablename__ = "drops"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(String)
    claim_window_start = Column(DateTime(timezone=True), nullable=False)
    claim_window_end = Column(DateTime(timezone=True), nullable=False)
    stock = Column(Integer, nullable=False)

    waitlist_users = relationship("Waitlist", back_populates="drop")
    claims = relationship("Claim", back_populates="drop")

class Waitlist(Base):
    __tablename__ = "waitlist"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    drop_id = Column(Integer, ForeignKey("drops.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="waitlist_entries")
    drop = relationship("Drop", back_populates="waitlist_users")

    __table_args__ = (UniqueConstraint('user_id', 'drop_id', name='_user_drop_uc'),)

class Claim(Base):
    __tablename__ = "claims"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    drop_id = Column(Integer, ForeignKey("drops.id"), nullable=False)
    code = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="claims")
    drop = relationship("Drop", back_populates="claims")

    __table_args__ = (UniqueConstraint('user_id', 'drop_id', name='_user_drop_claim_uc'),)
