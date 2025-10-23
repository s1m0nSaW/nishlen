from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from enum import Enum as PyEnum

class Visibility(str, PyEnum):
    private = "private"
    masters = "masters"
    public = "public"

class ProfileBase(BaseModel):
    bio: Optional[str] = None
    slug: Optional[str] = None  # New
    wishes: Optional[dict] = {}  # Jsonb

class ProfileCreate(ProfileBase):
    pass

class ProfileOut(ProfileBase):
    id: UUID
    user_id: UUID
    rating_avg: float
    total_reviews: int
    total_stars_received: int
    top_position: Optional[int]
    visit_history: List[dict]
    created_at: datetime
    slug: Optional[str] = None  # New

    class Config:
        from_attributes = True

class ReviewBase(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    is_master_review: bool = False

class ReviewCreate(ReviewBase):
    to_user_id: UUID
    booking_id: Optional[UUID] = None  # Optional for non-booking reviews

class ReviewOut(ReviewBase):
    id: UUID
    from_user_id: UUID
    to_user_id: UUID
    booking_id: Optional[UUID]
    created_at: datetime

    class Config:
        from_attributes = True

class StarBase(BaseModel):
    amount: int = Field(..., ge=1, le=10)  # Limit

class StarBuy(StarBase):
    to_master_id: UUID  # Добавь — for which master

class StarGive(StarBase):
    to_master_id: UUID
    booking_id: Optional[UUID] = None

class StarOut(StarBase):
    id: UUID
    from_client_id: UUID
    to_master_id: UUID
    is_free: bool
    purchased_at: Optional[datetime]
    used_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

class TopOut(BaseModel):
    id: UUID
    master_id: UUID
    city: str
    position: int
    score: float
    updated_at: datetime

    class Config:
        from_attributes = True

class VisitPhotoBase(BaseModel):
    image_url: str = Field(..., description="MinIO URL")
    comment: Optional[str] = None
    visibility: Visibility = Visibility.private

class VisitPhotoCreate(VisitPhotoBase):
    pass

class VisitPhotoOut(VisitPhotoBase):
    id: UUID
    booking_id: UUID
    client_id: UUID
    uploaded_at: datetime

    class Config:
        from_attributes = True

class PortfolioItemBase(BaseModel):
    caption: Optional[str] = None
    tags: Optional[List[str]] = []

class PortfolioItemCreate(PortfolioItemBase):
    image_url: str = Field(..., description="MinIO URL")

class PortfolioItemOut(PortfolioItemBase):
    id: UUID
    owner_id: UUID
    service_id: Optional[UUID]
    image_url: str
    likes: int
    created_at: datetime

    class Config:
        from_attributes = True

class PortfolioLikeCreate(BaseModel):
    portfolio_item_id: UUID

class PortfolioLikeOut(BaseModel):
    id: UUID
    user_id: UUID
    portfolio_item_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

class InviteMasterCreate(BaseModel):
    phone: str = Field(..., description="Phone for invite")