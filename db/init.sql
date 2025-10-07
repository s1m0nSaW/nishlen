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