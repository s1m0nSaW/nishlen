from sqlalchemy import Column, UUID, String, Integer, Boolean, Date, Time, ForeignKey, DateTime, Text, Numeric, JSON
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
import uuid
from datetime import datetime

Base = declarative_base()

# User from auth schema (full declarative for relationships)
class User(Base):
    __tablename__ = 'users'
    __table_args__ = {'schema': 'auth', 'extend_existing': True}  # Extend existing table

    id = Column(PG_UUID(as_uuid=True), primary_key=True, autoincrement=False)
    role = Column(String(20))
    phone = Column(String(20))
    full_name = Column(String(255))
    rules_json = Column(JSON)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)

# Booking Models
class Service(Base):
    __tablename__ = 'services'
    __table_args__ = {'schema': 'booking'}

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    master_id = Column(PG_UUID(as_uuid=True), ForeignKey('auth.users.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    price = Column(Numeric(10, 2), default=0)
    duration_min = Column(Integer, default=30)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    master = relationship("User", backref="services")
    bookings = relationship("Booking", backref="service", cascade="all, delete-orphan")

class Schedule(Base):
    __tablename__ = 'schedules'
    __table_args__ = {'schema': 'booking'}

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    master_id = Column(PG_UUID(as_uuid=True), ForeignKey('auth.users.id', ondelete='CASCADE'), nullable=False)
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    is_available = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    master = relationship("User", backref="schedules")
    bookings = relationship("Booking", backref="schedule", uselist=False)

class Booking(Base):
    __tablename__ = 'bookings'
    __table_args__ = {'schema': 'booking'}

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(PG_UUID(as_uuid=True), ForeignKey('auth.users.id', ondelete='SET NULL'))
    master_id = Column(PG_UUID(as_uuid=True), ForeignKey('auth.users.id', ondelete='CASCADE'), nullable=False)
    service_id = Column(PG_UUID(as_uuid=True), ForeignKey('booking.services.id', ondelete='CASCADE'), nullable=False)
    schedule_id = Column(PG_UUID(as_uuid=True), ForeignKey('booking.schedules.id', ondelete='CASCADE'), nullable=False)
    status = Column(String(20), default='pending')
    notes = Column(Text)
    prepayment_amount = Column(Numeric(10, 2), default=0)
    confirmed_at = Column(DateTime)
    completed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    client = relationship("User", foreign_keys=[client_id], backref="client_bookings")
    master = relationship("User", foreign_keys=[master_id], backref="master_bookings")

class Salon(Base):
    __tablename__ = 'salons'
    __table_args__ = {'schema': 'booking'}

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    address = Column(Text)
    city = Column(String(100))
    admin_id = Column(PG_UUID(as_uuid=True), ForeignKey('auth.users.id', ondelete='CASCADE'), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    admin = relationship("User", backref="salons")
    masters = relationship("SalonMaster", backref="salon", cascade="all, delete-orphan")

class SalonMaster(Base):
    __tablename__ = 'salon_masters'
    __table_args__ = {'schema': 'booking'}

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    salon_id = Column(PG_UUID(as_uuid=True), ForeignKey('booking.salons.id', ondelete='CASCADE'), nullable=False)
    master_id = Column(PG_UUID(as_uuid=True), ForeignKey('auth.users.id', ondelete='CASCADE'), nullable=False)

    # Relationships
    master = relationship("User", backref="salon_memberships")