from sqlalchemy import Column, Integer, String, Float, ForeignKey, JSON, Enum, DateTime, Boolean
from sqlalchemy.orm import relationship
from database import Base
import datetime
import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"
    GUEST = "guest"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default=UserRole.USER)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    tenders = relationship("Tender", back_populates="owner")
    config = relationship("MasterConfig", back_populates="owner", uselist=False)

class MasterConfig(Base):
    __tablename__ = "master_configs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    
    # Global Defaults
    default_labour_cost = Column(Float, default=30.0)
    default_profit_margin = Column(Float, default=10.0)
    
    # Pricing Mode Preference (PL_A or PL_M)
    preferred_pricing_mode = Column(String, default="PL_A")
    
    # Custom Price Overrides (Master Price List)
    price_overrides = Column(JSON, default={}) 

    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationship
    owner = relationship("User", back_populates="config")

class Tender(Base):
    __tablename__ = "tenders"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    date = Column(String)
    viewing_date = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    owner_id = Column(Integer, ForeignKey("users.id"))

    # Relationships
    owner = relationship("User", back_populates="tenders")
    parcels = relationship("Parcel", back_populates="tender", cascade="all, delete-orphan")
    shared_with = relationship("TenderShare", back_populates="tender", cascade="all, delete-orphan")

class TenderShare(Base):
    __tablename__ = "tender_shares"
    id = Column(Integer, primary_key=True)
    tender_id = Column(Integer, ForeignKey("tenders.id"))
    user_id = Column(Integer, ForeignKey("users.id")) # Collaborator
    
    tender = relationship("Tender", back_populates="shared_with")
    user = relationship("User")

class Parcel(Base):
    __tablename__ = "parcels"

    id = Column(Integer, primary_key=True, index=True)
    number = Column(String, index=True)
    name = Column(String)
    parcel_type = Column(String) # SW or MB
    total_cts = Column(Float)
    pcs = Column(Integer, default=0)
    last_sold_price = Column(Float, default=0.0)
    bid_price_per_ct = Column(Float, default=0.0)
    profit_margin = Column(Float, default=0.0)
    opening_price = Column(Float)
    sold_price = Column(Float)
    
    # Store the complex calculation state as JSON
    # This includes: yield configs, multipliers, assortment data, fluorescence, etc.
    calc_state = Column(JSON) 
    
    tender_id = Column(Integer, ForeignKey("tenders.id"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    tender = relationship("Tender", back_populates="parcels")
    media = relationship("Media", back_populates="parcel", cascade="all, delete-orphan")

class Media(Base):
    __tablename__ = "media"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    file_type = Column(String) # image, video, pdf
    file_path = Column(String)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    parcel_id = Column(Integer, ForeignKey("parcels.id"))
    
    # Relationship
    parcel = relationship("Parcel", back_populates="media")
