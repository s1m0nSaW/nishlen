from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from jose import JWTError, jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import json
from datetime import datetime, timedelta
from typing import List, Optional
import uuid
from uuid import UUID
from sqlalchemy.exc import OperationalError
import time
import redis
import numpy as np
from PIL import Image
from io import BytesIO
from minio import Minio
import re  # For slugify

from models.models import Profile, Review, Star, Top, VisitPhoto, PortfolioItem, PortfolioLike, User, Booking, Service, SalonMaster
from schemas import InviteMasterCreate, ProfileCreate, ProfileOut, ReviewCreate, ReviewOut, StarBuy, StarOut, TopOut, VisitPhotoCreate, VisitPhotoOut, PortfolioItemCreate, PortfolioItemOut, PortfolioLikeCreate, StarGive

JWT_SECRET = os.getenv("JWT_SECRET", "nishlen_secret")
ALGORITHM = "HS256"

# HTTP Bearer for token
security = HTTPBearer()

# Dependency: JWT decode + role check
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        user_id: str = payload.get("userId")
        role: str = payload.get("role")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return {"user_id": user_id, "role": role}
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

def get_current_admin(current_user = Depends(get_current_user)):
    if current_user['role'] != 'salon_admin':
        raise HTTPException(status_code=403, detail="Admin only")
    return current_user

def slugify(name: str) -> str:
    # Simple slugify: translit + lowercase + hyphens
    name = re.sub(r'[^a-zA-Z0-9\s]', '', name).lower()
    name = re.sub(r'\s+', '-', name).strip('-')
    return f"beauty{name}"  # Prefix for uniqueness

# Redis for Pub/Sub (stub for now)
redis_client = redis.Redis(host='redis', port=6379, db=0, decode_responses=True)

# MinIO for files (stub env)
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "minio:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
minio_client = Minio(MINIO_ENDPOINT, access_key=MINIO_ACCESS_KEY, secret_key=MINIO_SECRET_KEY, secure=False)

# DB Setup с retry
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://admin:secret@localhost:5432/nishlen_db")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Retry connect
max_retries = 10
for attempt in range(max_retries):
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        print(f"DB connected successfully on attempt {attempt + 1}!")
        break
    except OperationalError as e:
        print(f"DB connect attempt {attempt + 1} failed: {e}")
        if attempt < max_retries - 1:
            time.sleep(3)
        else:
            raise e

# Dependency для DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app = FastAPI(title="Nishlen Profile Service", version="0.1.0")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Profile Service ready! ✨"}

@app.get("/health")
def health(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT 1")).scalar()
    return {"status": "healthy", "db_connected": result == 1}

@app.post("/test-models", response_model=List[ProfileOut])
def test_models(db: Session = Depends(get_db)):
    profiles = db.query(Profile).all()
    return profiles

@app.post("/api/profile", response_model=ProfileOut)
def create_profile(profile: ProfileCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    existing = db.query(Profile).filter(Profile.user_id == current_user['user_id']).first()
    if existing:
        # Update existing
        for key, value in profile.dict(exclude_unset=True).items():
            if key != 'slug':  # Slug immutable
                setattr(existing, key, value)
        existing.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing
    
    # Fetch user for slug
    user = db.query(User).filter(User.id == current_user['user_id']).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create new
    profile_dict = profile.dict()
    if not profile_dict.get('slug'):
        # Auto-generate
        full_name = user.full_name or "User"  # Фикс: fallback if None
        profile_dict['slug'] = slugify(full_name)
        # Check unique
        while db.query(Profile).filter(Profile.slug == profile_dict['slug']).first():
            profile_dict['slug'] += '1'
    
    db_profile = Profile(user_id=current_user['user_id'], **profile_dict)
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile


@app.get("/api/profile/slug/{slug}", response_model=ProfileOut)
def get_profile_by_slug(slug: str, db: Session = Depends(get_db)):
    profile = db.query(Profile).filter(Profile.slug == slug).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

# <-- ВАЖНО: /tops ДОЛЖЕН БЫТЬ ЗДЕСЬ, до /{user_id} -->
@app.get("/api/profile/tops", response_model=List[TopOut])
def get_tops(city: Optional[str] = None, db: Session = Depends(get_db)):  # Public, no auth
    query = db.query(Top)
    if city: # Фильтруем ТОЛЬКО если city не None и не пустая строка
        query = query.filter(Top.city == city)
    return query.all()

@app.get("/api/profile/me", response_model=ProfileOut)  # Фикс: /me for current user, no path param
def get_profile_me(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    profile = db.query(Profile).filter(Profile.user_id == current_user['user_id']).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@app.get("/api/profile/{user_id}", response_model=ProfileOut)  # Keep for admins/own
def get_profile(user_id: UUID, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    if str(user_id) != current_user['user_id'] and current_user['role'] != 'salon_admin':
        raise HTTPException(status_code=403, detail="Not authorized")
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@app.post("/api/profile/reviews", response_model=ReviewOut)
def add_review(review: ReviewCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # Validate booking completed (if booking_id)
    if review.booking_id:
        booking = db.query(Booking).filter(Booking.id == review.booking_id).first()
        if not booking or booking.status != 'completed':
            raise HTTPException(status_code=400, detail="Booking must be completed")
        if str(booking.client_id) != current_user['user_id'] and str(booking.master_id) != current_user['user_id']:
            raise HTTPException(status_code=403, detail="Not authorized for this booking")
    
    # Set from_user_id
    review_dict = review.dict()
    review_dict['from_user_id'] = current_user['user_id']
    db_review = Review(**review_dict)
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    # Trigger updates rating_avg/total_reviews
    return db_review

@app.post("/api/profile/stars/buy", response_model=StarOut)
def buy_stars(star: StarBuy, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # Validate to_master_id (master role)
    master = db.query(User).filter(User.id == star.to_master_id, User.role == 'master').first()
    if not master:
        raise HTTPException(status_code=400, detail="Invalid master")
    
    # Stub YooKassa (full in Фаза 4)
    # Assume paid
    db_star = Star(
        from_client_id = current_user['user_id'],
        to_master_id = star.to_master_id,
        amount = star.amount,
        is_free = False,
        purchased_at = datetime.utcnow(),
        created_at = datetime.utcnow()
    )
    db.add(db_star)
    db.commit()
    db.refresh(db_star)
    # Trigger total_stars_received
    return db_star

@app.post("/api/profile/stars/give", response_model=StarOut)
def give_stars(star: StarGive, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # Limit 10/post-visit
    from datetime import timedelta
    recent_stars = db.query(Star).filter(
        Star.from_client_id == current_user['user_id'],
        Star.used_at > datetime.utcnow() - timedelta(days=30)
    ).count()
    if recent_stars + star.amount > 10:
        raise HTTPException(status_code=400, detail="Limit exceeded (10 stars/month)")
    
    db_star = Star(
        from_client_id = current_user['user_id'],
        to_master_id = star.to_master_id,
        booking_id = star.booking_id,
        amount = star.amount,
        is_free = True,
        used_at = datetime.utcnow(),
        created_at = datetime.utcnow()
    )
    db.add(db_star)
    db.commit()
    db.refresh(db_star)
    # Trigger total_stars_received
    return db_star

@app.post("/api/profile/visit-photos", response_model=VisitPhotoOut)
def add_visit_photo(photo: UploadFile = File(...), comment: Optional[str] = None, visibility: str = "private", db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # Validate booking_id (from body or optional)
    # Assume booking_id in form data, stub
    booking_id = UUID("mock-booking-uuid")  # From form, validate completed
    # Compress to WebP
    image = Image.open(photo.file)
    output = BytesIO()
    image.save(output, format='WebP', quality=80)
    image_url = f"photos/{uuid.uuid4()}.webp"
    minio_client.put_object("profiles", image_url, output.getvalue(), length=len(output.getvalue()), content_type='image/webp')
    
    db_photo = VisitPhoto(
        booking_id = booking_id,
        client_id = current_user['user_id'],
        image_url = f"http://localhost:9000/profiles/{image_url}",  # Signed later
        comment = comment,
        visibility = visibility
    )
    db.add(db_photo)
    db.commit()
    db.refresh(db_photo)
    return db_photo

@app.post("/api/profile/portfolio", response_model=PortfolioItemOut)
def add_portfolio_item(item: PortfolioItemCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # Similar upload for image_url
    # Stub
    db_item = PortfolioItem(
        owner_id = current_user['user_id'],
        service_id = item.service_id,
        image_url = item.image_url,  # From upload
        caption = item.caption,
        tags = item.tags
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.post("/api/profile/masters/invite", response_model=dict)
def invite_master(invite: InviteMasterCreate, db: Session = Depends(get_db), current_user = Depends(get_current_admin)):
    phone = invite.phone
    invite_token = str(uuid.uuid4())
    # Save in Redis (expire 24h)
    redis_client.setex(f"invite:{invite_token}", timedelta(hours=24), json.dumps({
        "phone": phone,
        "role": "master",
        "salon_id": current_user['user_id']  # From salon profile
    }))
    # Stub send SMS/email (full in Фаза 4)
    # nodemailer.sendMail({ to: phone, text: f"Invite: nishlen.ru/invite/{invite_token}" })
    return {"message": "Invite sent", "token": invite_token}

# Control
@app.patch("/api/profile/masters/{master_id}", response_model=dict)
def control_master(master_id: UUID, reset_password: Optional[bool] = False, lock: Optional[bool] = False, can_leave: Optional[bool] = True, db: Session = Depends(get_db), current_user = Depends(get_current_admin)):
    # Add is_locked to schema if not (ALTER TABLE profile.profiles ADD COLUMN is_locked BOOLEAN DEFAULT FALSE;)
    master_profile = db.query(Profile).filter(Profile.user_id == master_id).first()
    if not master_profile:
        raise HTTPException(status_code=404, detail="Master not found")
    
    if reset_password:
        # Generate random password
        new_password = "newpass123"  # Random
        new_hash = "bcrypt_hash"  # Stub bcrypt
        db.query(User).filter(User.id == master_id).update({"password_hash": new_hash})
        # Notify master (email/SMS new pass)
    
    if lock is not None:
        master_profile.is_locked = lock  # Block login in Auth later
    if can_leave is not None:
        master_profile.can_leave = can_leave  # Bool for terms
    
    db.commit()
    return {"message": "Updated"}

# Fire (remove from salon)
@app.delete("/api/salon_masters/{salon_master_id}")
def fire_master(salon_master_id: UUID, db: Session = Depends(get_db), current_user = Depends(get_current_admin)):
    sm = db.query(SalonMaster).filter(SalonMaster.id == salon_master_id).first()
    if not sm or sm.salon.admin_id != current_user['user_id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    db.delete(sm)
    db.commit()
    # Notify master "Вы уволены из салона"
    return {"message": "Master fired from salon"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3003)