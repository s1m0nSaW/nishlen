from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware  # CORS
from sqlalchemy import create_engine, text, and_
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from jose import JWTError, jwt
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import json
from datetime import datetime, date, time
from typing import List, Optional
import uuid
from uuid import UUID
from sqlalchemy.exc import OperationalError
import time
import redis

from models.models import Service, Schedule, Booking, Salon, SalonMaster, User
from schemas import BookingCreate, BookingOut, ScheduleCreate, ScheduleOut, ServiceCreate, ServiceOut

JWT_SECRET = os.getenv("JWT_SECRET", "nishlen_secret")
ALGORITHM = "HS256"

# HTTP Bearer for token
security = HTTPBearer()

# Dependency: JWT decode
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

# Redis for Pub/Sub
redis_client = redis.Redis(host='redis', port=6379, db=0, decode_responses=True)

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

app = FastAPI(title="Nishlen Booking Service", version="0.1.0")

# CORS Middleware (Фикс: Allow frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Booking Service ready! 🚀"}

@app.get("/health")
def health(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT 1")).scalar()
    return {"status": "healthy", "db_connected": result == 1}

@app.post("/services/", response_model=ServiceOut)
def create_service(service: ServiceCreate, db: Session = Depends(get_db)):
    master = db.query(User).filter(User.role == 'master').first()
    if not master:
        raise HTTPException(status_code=400, detail="No master found - create one in auth first")
    db_service = Service(**service.dict(), master_id=master.id)
    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    return db_service

@app.get("/test-models", response_model=List[ServiceOut])
def test_models(db: Session = Depends(get_db)):
    services = db.query(Service).all()
    return services

# API Routes
@app.get("/api/booking/services", response_model=List[ServiceOut])
def get_services(master_id: Optional[UUID] = None, city: Optional[str] = None, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    query = db.query(Service)
    if master_id:
        query = query.filter(Service.master_id == master_id)
    if city:
        query = query.join(Service.master).filter(User.city == city)  # Фикс: join(Service.master), filter(User.city)
    return query.all()

@app.get("/api/booking/slots", response_model=List[ScheduleOut])
def get_slots(master_id: UUID, target_date: date, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    slots = db.query(Schedule).filter(
        and_(Schedule.master_id == master_id, Schedule.date == target_date, Schedule.is_available == True)
    ).all()
    return slots

@app.post("/api/booking/book", response_model=BookingOut)
def create_booking(booking_in: BookingCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    # Check slot available
    slot = db.query(Schedule).filter(Schedule.id == booking_in.schedule_id).first()
    if not slot or not slot.is_available:
        raise HTTPException(status_code=400, detail="Slot not available")
    
    # Check service exists
    service = db.query(Service).filter(Service.id == booking_in.service_id).first()
    if not service:
        raise HTTPException(status_code=400, detail="Service not found")
    
    # Rules check
    master = db.query(User).filter(User.id == booking_in.master_id).first()
    if not master:
        raise HTTPException(status_code=400, detail="Master not found")
    
    rules = master.rules_json or {}
    require_confirmation = rules.get('require_confirmation', False)
    confirmation_for_all = rules.get('confirmation_for_all', False)
    
    is_registered = current_user['role'] == 'client'
    status = 'pending' if (not is_registered or (require_confirmation and confirmation_for_all)) else 'confirmed'
    
    db_booking = Booking(
        **booking_in.dict(),
        client_id = current_user['user_id'] if is_registered else None,
        status = status
    )
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    
    # Pub/Sub event
    event_data = {'event': 'booking_created', 'booking_id': str(db_booking.id), 'status': status}
    redis_client.publish('booking_events', json.dumps(event_data))
    redis_client.lpush('booking_events_list', json.dumps(event_data))
    
    return db_booking

@app.get("/api/booking/my-bookings", response_model=List[BookingOut])
def get_my_bookings(client_id: UUID, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    if current_user['user_id'] != str(client_id):
        raise HTTPException(status_code=403, detail="Not authorized")
    bookings = db.query(Booking).filter(Booking.client_id == client_id).order_by(Booking.created_at.desc()).all()
    return bookings

@app.patch("/api/booking/{booking_id}/confirm", response_model=BookingOut)
def confirm_booking(booking_id: UUID, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if str(booking.master_id) != current_user['user_id'] or booking.status != 'pending':
        raise HTTPException(status_code=403, detail="Not authorized or already confirmed")
    
    booking.status = 'confirmed'
    booking.confirmed_at = datetime.utcnow()
    db.commit()
    db.refresh(booking)
    
    # Pub/Sub event
    event_data = {'event': 'booking_confirmed', 'booking_id': str(booking_id)}
    redis_client.publish('booking_events', json.dumps(event_data))
    redis_client.lpush('booking_events_list', json.dumps(event_data))
    
    return booking

@app.delete("/api/booking/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(booking_id: UUID, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if str(booking.client_id) != current_user['user_id'] and str(booking.master_id) != current_user['user_id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    old_status = booking.status
    booking.status = 'cancelled'
    if old_status == 'pending':
        booking.schedule.is_available = True
    db.commit()
    db.refresh(booking)
    
    # Pub/Sub event
    event_data = {'event': 'booking_cancelled', 'booking_id': str(booking_id)}
    redis_client.publish('booking_events', json.dumps(event_data))
    redis_client.lpush('booking_events_list', json.dumps(event_data))
    
    return booking

@app.post("/api/booking/schedules", response_model=ScheduleOut)
def create_schedule(schedule: ScheduleCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    master_id = schedule.master_id
    master = db.query(User).filter(User.id == master_id).first()
    if not master:
        raise HTTPException(status_code=400, detail="Master not found")
    
    if schedule.end_time <= schedule.start_time:
        raise HTTPException(status_code=400, detail="End time must be after start time")
    
    overlapping = db.query(Schedule).filter(
        and_(
            Schedule.master_id == master_id,
            Schedule.date == schedule.date,
            Schedule.start_time < schedule.end_time,
            Schedule.end_time > schedule.start_time
        )
    ).first()
    if overlapping:
        raise HTTPException(status_code=400, detail="Slot overlaps with existing")
    
    db_schedule = Schedule(**schedule.dict())
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule

@app.get("/api/booking/events", response_model=List[dict])
def get_events(db: Session = Depends(get_db)):
    events = redis_client.lrange('booking_events_list', 0, 9)
    return [json.loads(event) for event in events]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3002)