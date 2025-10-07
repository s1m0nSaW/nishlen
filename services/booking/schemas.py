from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime, date, time  # Фикс: date, time напрямую
from typing import Optional
from enum import Enum as PyEnum

class BookingStatus(str, PyEnum):
    pending = "pending"
    confirmed = "confirmed"
    completed = "completed"
    cancelled = "cancelled"

class ServiceBase(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    price: float = Field(..., ge=0)
    duration_min: int = Field(..., ge=1)

class ServiceCreate(ServiceBase):
    pass

class ServiceOut(ServiceBase):
    id: UUID
    master_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True  # Для SQLAlchemy to dict

class ScheduleBase(BaseModel):
    date: date  # Фикс: date class
    start_time: time  # Фикс: time class
    end_time: time
    is_available: bool = True

class ScheduleCreate(ScheduleBase):
    master_id: UUID

class ScheduleOut(ScheduleBase):
    id: UUID
    master_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class BookingCreate(BaseModel):
    master_id: UUID
    service_id: UUID
    schedule_id: UUID
    notes: Optional[str] = None
    # client_id from JWT later

class BookingOut(BaseModel):
    id: UUID
    client_id: Optional[UUID]
    master_id: UUID
    service_id: UUID
    schedule_id: UUID
    status: BookingStatus
    notes: Optional[str]
    prepayment_amount: float = 0
    confirmed_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True