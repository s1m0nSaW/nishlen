from sqlalchemy import Column, UUID, String, Integer, Boolean, DateTime, Text, Numeric, JSON, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
import uuid
from datetime import datetime

Base = declarative_base()

# External User from auth schema (for relationships)
class User(Base):
    __tablename__ = 'users'
    __table_args__ = {'schema': 'auth', 'extend_existing': True}

    id = Column(PG_UUID(as_uuid=True), primary_key=True, autoincrement=False)
    role = Column(String(20))
    phone = Column(String(20))
    full_name = Column(String(255))
    rules_json = Column(JSON)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)

# External Booking from booking schema (for FK)
class Booking(Base):
    __tablename__ = 'bookings'
    __table_args__ = {'schema': 'booking', 'extend_existing': True}

    id = Column(PG_UUID(as_uuid=True), primary_key=True, autoincrement=False)
    client_id = Column(PG_UUID(as_uuid=True), ForeignKey('auth.users.id', ondelete='SET NULL'))
    master_id = Column(PG_UUID(as_uuid=True), ForeignKey('auth.users.id', ondelete='CASCADE'))
    status = Column(String(20))
    created_at = Column(DateTime)

# External Service from booking schema (for FK in PortfolioItem)
class Service(Base):
    __tablename__ = 'services'
    __table_args__ = {'schema': 'booking', 'extend_existing': True}

    id = Column(PG_UUID(as_uuid=True), primary_key=True, autoincrement=False)
    master_id = Column(PG_UUID(as_uuid=True), ForeignKey('auth.users.id', ondelete='CASCADE'))
    name = Column(String(255))
    price = Column(Numeric(10, 2))
    duration_min = Column(Integer)

# Profile Models
class Profile(Base):
    __tablename__ = 'profiles'
    __table_args__ = {'schema': 'profile'}

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey('auth.users.id', ondelete='CASCADE'), unique=True)
    bio = Column(Text)
    slug = Column(String(100), unique=True)
    rating_avg = Column(Numeric(3, 2), default=0)
    total_reviews = Column(Integer, default=0)
    total_stars_received = Column(Integer, default=0)
    top_position = Column(Integer)
    wishes = Column(JSON, default=dict)
    visit_history = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships with explicit primaryjoin + foreign_keys for indirect FK
    user = relationship("User", backref="profile", uselist=False)
    reviews = relationship(
        "Review",
        primaryjoin="Profile.user_id == Review.to_user_id",
        foreign_keys="Review.to_user_id",
        viewonly=True,
        backref="profile_to"
    )
    stars_received = relationship(
        "Star",
        primaryjoin="Profile.user_id == Star.to_master_id",
        foreign_keys="Star.to_master_id",
        viewonly=True,
        backref="master_profile"
    )
    visit_photos = relationship(
        "VisitPhoto",
        primaryjoin="Profile.user_id == VisitPhoto.client_id",
        foreign_keys="VisitPhoto.client_id",
        viewonly=True,
        backref="profile"
    )

class Review(Base):
    __tablename__ = 'reviews'
    __table_args__ = {'schema': 'profile'}

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    from_user_id = Column(PG_UUID(as_uuid=True), ForeignKey('auth.users.id', ondelete='CASCADE'))
    to_user_id = Column(PG_UUID(as_uuid=True), ForeignKey('auth.users.id', ondelete='CASCADE'))
    booking_id = Column(PG_UUID(as_uuid=True), ForeignKey('booking.bookings.id', ondelete='CASCADE'))
    rating = Column(Integer, nullable=False)
    comment = Column(Text)
    is_master_review = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    from_user = relationship("User", foreign_keys=[from_user_id], backref="reviews_from")
    to_user = relationship("User", foreign_keys=[to_user_id], backref="reviews_to")
    booking = relationship("Booking", backref="reviews")

class Star(Base):
    __tablename__ = 'stars'
    __table_args__ = {'schema': 'profile'}

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    from_client_id = Column(PG_UUID(as_uuid=True), ForeignKey('auth.users.id', ondelete='CASCADE'))
    to_master_id = Column(PG_UUID(as_uuid=True), ForeignKey('auth.users.id', ondelete='CASCADE'))
    booking_id = Column(PG_UUID(as_uuid=True), ForeignKey('booking.bookings.id', ondelete='SET NULL'))
    amount = Column(Integer, nullable=False)
    is_free = Column(Boolean, default=False)
    purchased_at = Column(DateTime)
    used_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    from_client = relationship("User", foreign_keys=[from_client_id], backref="stars_given")
    to_master = relationship("User", foreign_keys=[to_master_id], backref="stars_received")

class Top(Base):
    __tablename__ = 'tops'
    __table_args__ = {'schema': 'profile'}

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    master_id = Column(PG_UUID(as_uuid=True), ForeignKey('auth.users.id', ondelete='CASCADE'))
    city = Column(String(100))
    position = Column(Integer)
    score = Column(Numeric(4, 2))
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    master = relationship("User", backref="tops")

class VisitPhoto(Base):
    __tablename__ = 'visit_photos'
    __table_args__ = {'schema': 'profile'}

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id = Column(PG_UUID(as_uuid=True), ForeignKey('booking.bookings.id', ondelete='CASCADE'))
    client_id = Column(PG_UUID(as_uuid=True), ForeignKey('auth.users.id', ondelete='CASCADE'))
    image_url = Column(Text, nullable=False)
    comment = Column(Text)
    visibility = Column(String(20), default='private')
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    booking = relationship("Booking", backref="visit_photos")
    client = relationship("User", backref="visit_photos")

class PortfolioItem(Base):
    __tablename__ = 'portfolio_items'
    __table_args__ = {'schema': 'profile'}

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(PG_UUID(as_uuid=True), ForeignKey('auth.users.id', ondelete='CASCADE'))
    service_id = Column(PG_UUID(as_uuid=True), ForeignKey('booking.services.id', ondelete='SET NULL'))
    image_url = Column(Text, nullable=False)
    caption = Column(Text)
    tags = Column(JSON, default=list)
    likes = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    owner = relationship("User", backref="portfolio_items")
    service = relationship("Service", backref="portfolio_items")  # Теперь Service defined
    likes = relationship("PortfolioLike", backref="item")

class PortfolioLike(Base):
    __tablename__ = 'portfolio_likes'
    __table_args__ = {'schema': 'profile'}

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey('auth.users.id', ondelete='CASCADE'))
    portfolio_item_id = Column(PG_UUID(as_uuid=True), ForeignKey('profile.portfolio_items.id', ondelete='CASCADE'))
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", backref="portfolio_likes")

class SalonMaster(Base):
    __tablename__ = 'salon_masters'
    __table_args__ = {'schema': 'booking', 'extend_existing': True}

    id = Column(PG_UUID(as_uuid=True), primary_key=True, autoincrement=False)
    salon_id = Column(PG_UUID(as_uuid=True), ForeignKey('booking.salons.id', ondelete='CASCADE'))
    master_id = Column(PG_UUID(as_uuid=True), ForeignKey('auth.users.id', ondelete='CASCADE'))