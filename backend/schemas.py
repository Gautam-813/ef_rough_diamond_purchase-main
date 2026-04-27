from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    role: str = "user"

class UserOut(UserBase):
    id: int
    role: str
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class MediaOut(BaseModel):
    id: int
    filename: str
    file_type: str
    file_path: str
    class Config:
        from_attributes = True

class ParcelBase(BaseModel):
    number: str
    name: str
    parcel_type: str
    total_cts: float
    pcs: int = 0
    last_sold_price: float = 0.0
    bid_price_per_ct: float = 0.0
    profit_margin: float = 0.0
    calc_state: Dict[str, Any]

class ParcelCreate(ParcelBase):
    pass

class ParcelOut(ParcelBase):
    id: int
    tender_id: int
    created_at: datetime
    media: List[MediaOut] = []
    class Config:
        from_attributes = True

class TenderBase(BaseModel):
    name: str
    date: str
    viewing_date: Optional[str] = None

class TenderCreate(TenderBase):
    pass

class TenderOut(TenderBase):
    id: int
    owner_id: int
    created_at: datetime
    parcels: List[ParcelOut] = []
    class Config:
        from_attributes = True
