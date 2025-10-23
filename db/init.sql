-- Auth Schema (уже есть, но для полноты)
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(20) NOT NULL CHECK (role IN ('client', 'master', 'salon_admin')),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  city VARCHAR(100),
  rules_json JSONB DEFAULT '{}'::JSONB,  -- Новое: Для мастеров {require_confirmation: bool, confirmation_for_all: bool}
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON auth.users(phone);

-- Booking Schema
CREATE SCHEMA IF NOT EXISTS booking;

CREATE TABLE IF NOT EXISTS booking.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  duration_min INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_services_master ON booking.services(master_id);

CREATE TABLE IF NOT EXISTS booking.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (master_id, date, start_time)  -- Нет дубли слотов
);

CREATE INDEX IF NOT EXISTS idx_schedules_master_date ON booking.schedules(master_id, date);

CREATE TABLE IF NOT EXISTS booking.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- NULL для unregistered
  master_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES booking.services(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES booking.schedules(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes TEXT,  -- Пожелания клиента
  prepayment_amount DECIMAL(10,2) NOT NULL DEFAULT 0,  -- Пока 0, без логики
  confirmed_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bookings_client ON booking.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_master ON booking.bookings(master_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status_date ON booking.bookings(status, created_at);

CREATE TABLE IF NOT EXISTS booking.salons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_salons_city ON booking.salons(city);

CREATE TABLE IF NOT EXISTS booking.salon_masters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id UUID NOT NULL REFERENCES booking.salons(id) ON DELETE CASCADE,
  master_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE (salon_id, master_id)
);

-- Триггер: После confirm booking — заблокировать слот
CREATE OR REPLACE FUNCTION booking.block_slot_on_confirm()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE booking.schedules SET is_available = FALSE WHERE id = NEW.schedule_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bookings_confirm
  AFTER UPDATE OF status ON booking.bookings
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed' AND OLD.status != 'confirmed')
  EXECUTE FUNCTION booking.block_slot_on_confirm();

-- Profile Schema
CREATE SCHEMA IF NOT EXISTS profile;

CREATE TABLE IF NOT EXISTS profile.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,  -- 1:1 with users
  bio TEXT,
  rating_avg NUMERIC(3,2) DEFAULT 0,  -- Computed
  total_reviews INTEGER DEFAULT 0,  -- Computed
  total_stars_received INTEGER DEFAULT 0,  -- From stars
  top_position INTEGER,  -- Computed from tops
  wishes JSONB DEFAULT '{}'::JSONB,  -- Пожелания клиента
  visit_history JSONB DEFAULT '[]'::JSONB,  -- Массив визитов (id, date, service)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_profiles_user ON profile.profiles(user_id);

CREATE TABLE IF NOT EXISTS profile.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES booking.bookings(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_master_review BOOLEAN DEFAULT FALSE,  -- True if master to client
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_from ON profile.reviews(from_user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_to ON profile.reviews(to_user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking ON profile.reviews(booking_id);

CREATE TABLE IF NOT EXISTS profile.stars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_master_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES booking.bookings(id) ON DELETE SET NULL,  -- Optional
  amount INTEGER NOT NULL CHECK (amount > 0),
  is_free BOOLEAN DEFAULT FALSE,
  purchased_at TIMESTAMP,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stars_from ON profile.stars(from_client_id);
CREATE INDEX IF NOT EXISTS idx_stars_to ON profile.stars(to_master_id);

CREATE TABLE IF NOT EXISTS profile.tops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  city VARCHAR(100),
  position INTEGER,  -- Computed
  score NUMERIC(4,2),  -- Computed: 0.7*rating + 0.3*stars
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tops_master_city ON profile.tops(master_id, city);

CREATE TABLE IF NOT EXISTS profile.visit_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES booking.bookings(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  comment TEXT,
  visibility VARCHAR(20) NOT NULL CHECK (visibility IN ('private', 'masters', 'public')) DEFAULT 'private',
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_visit_photos_booking ON profile.visit_photos(booking_id);
CREATE INDEX IF NOT EXISTS idx_visit_photos_client ON profile.visit_photos(client_id);

CREATE TABLE IF NOT EXISTS profile.portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  -- Master/salon
  service_id UUID REFERENCES booking.services(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  caption TEXT,
  tags JSONB DEFAULT '[]'::JSONB,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portfolio_owner ON profile.portfolio_items(owner_id);

CREATE TABLE IF NOT EXISTS profile.portfolio_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portfolio_item_id UUID NOT NULL REFERENCES profile.portfolio_items(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, portfolio_item_id)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_likes_user ON profile.portfolio_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_likes_item ON profile.portfolio_likes(portfolio_item_id);

-- Триггер для rating_avg (OK)
CREATE OR REPLACE FUNCTION profile.update_rating_avg()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profile.profiles p
  SET rating_avg = COALESCE(
    (SELECT AVG(r.rating) FROM profile.reviews r WHERE r.to_user_id = p.user_id), 0
  ),
  total_reviews = COALESCE(
    (SELECT COUNT(r.id) FROM profile.reviews r WHERE r.to_user_id = p.user_id), 0
  )
  WHERE p.user_id = COALESCE(NEW.to_user_id, OLD.to_user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reviews_rating
  AFTER INSERT OR UPDATE OR DELETE ON profile.reviews
  FOR EACH ROW
  EXECUTE FUNCTION profile.update_rating_avg();


-- Триггер для total_stars_received (OK)
CREATE OR REPLACE FUNCTION profile.update_total_stars()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profile.profiles p
  SET total_stars_received = COALESCE(
    (SELECT SUM(s.amount) FROM profile.stars s WHERE s.to_master_id = p.user_id), 0
  )
  WHERE p.user_id = COALESCE(NEW.to_master_id, OLD.to_master_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_stars_total
  AFTER INSERT OR UPDATE OR DELETE ON profile.stars
  FOR EACH ROW
  EXECUTE FUNCTION profile.update_total_stars();

-- Function for top_score and position (Фикс: RETURNS TRIGGER)
CREATE OR REPLACE FUNCTION profile.update_tops()
RETURNS TRIGGER AS $$  -- Измени на TRIGGER
BEGIN
  -- Refresh tops
  DELETE FROM profile.tops;
  INSERT INTO profile.tops (master_id, city, score, position)
  SELECT 
    u.id as master_id,
    u.city,
    (0.7 * COALESCE(p.rating_avg, 0) + 0.3 * COALESCE(p.total_stars_received / NULLIF(p.total_reviews, 0), 0)) as score,
    ROW_NUMBER() OVER (PARTITION BY u.city ORDER BY (0.7 * COALESCE(p.rating_avg, 0) + 0.3 * COALESCE(p.total_stars_received / NULLIF(p.total_reviews, 0), 0)) DESC) as position
  FROM auth.users u
  JOIN profile.profiles p ON u.id = p.user_id
  WHERE u.role = 'master' AND u.city IS NOT NULL;
  RETURN NEW;  -- Добавь dummy return
END;
$$ LANGUAGE plpgsql;

-- Triggers for tops (call function)
CREATE TRIGGER trigger_update_tops_reviews
  AFTER INSERT OR UPDATE OR DELETE ON profile.reviews
  FOR EACH ROW
  EXECUTE FUNCTION profile.update_tops();

CREATE TRIGGER trigger_update_tops_stars
  AFTER INSERT OR UPDATE OR DELETE ON profile.stars
  FOR EACH ROW
  EXECUTE FUNCTION profile.update_tops();


-- Add slug to profiles (vanity URL)
ALTER TABLE profile.profiles ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_profiles_slug ON profile.profiles(slug);

-- Trigger for auto-slug (optional, in code)