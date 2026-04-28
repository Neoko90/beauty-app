-- ============================================================
-- REFERLY.PL — Kompletny schemat bazy danych
-- Wersja: 2.0 (naprawiona kolejność tabel, circular FK, extensions)
-- Wklej całość do: Supabase → SQL Editor → New query → Run
-- ============================================================

-- ============================================================
-- 1. ROZSZERZENIA
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- 2. TYPY ENUM (bezpieczne - nie failują jeśli już istnieją)
-- ============================================================
DO $$ BEGIN CREATE TYPE salon_plan AS ENUM ('trial','solo','grow','pro','max');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE staff_role AS ENUM ('owner','admin','receptionist','employee');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE appointment_status AS ENUM ('confirmed','pending','awaiting_deposit','done','cancelled','no_show');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_method AS ENUM ('cash','blik','card','transfer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE booking_source AS ENUM ('manual','online');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE sms_type AS ENUM ('reminder','confirmation','cancellation','waiting_list','custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE sms_status AS ENUM ('sent','failed','delivered','pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE referral_status AS ENUM ('pending','used','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE reward_type AS ENUM ('amount','percent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE finance_type AS ENUM ('income','expense');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE inventory_change_type AS ENUM ('add','use','sell','adjust');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE change_type AS ENUM ('created','updated','status_changed','cancelled','rescheduled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE waiting_status AS ENUM ('waiting','notified','booked','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 3. TABELE (kolejność: parent przed child)
-- ============================================================

CREATE TABLE IF NOT EXISTS salons (
  id                        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id                  uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name                      text NOT NULL,
  slug                      text UNIQUE NOT NULL,
  phone                     text,
  email                     text,
  address                   text,
  city                      text,
  website                   text,
  description               text,
  plan                      salon_plan DEFAULT 'trial',
  trial_ends_at             timestamptz DEFAULT (now() + interval '14 days'),
  stripe_customer_id        text,
  stripe_subscription_id    text,
  stripe_price_id           text,
  sms_balance               int DEFAULT 30,
  sms_used_this_month       int DEFAULT 0,
  sms_reset_date            date DEFAULT date_trunc('month', now())::date,
  smsplanet_api_key         text,
  smsplanet_sender          text DEFAULT 'Referly',
  opening_hours             jsonb DEFAULT '{"1":{"open":"09:00","close":"18:00","is_open":true},"2":{"open":"09:00","close":"18:00","is_open":true},"3":{"open":"09:00","close":"18:00","is_open":true},"4":{"open":"09:00","close":"18:00","is_open":true},"5":{"open":"09:00","close":"18:00","is_open":true},"6":{"open":"09:00","close":"14:00","is_open":false},"7":{"open":"09:00","close":"14:00","is_open":false}}',
  booking_enabled           bool DEFAULT true,
  booking_min_advance_hours int DEFAULT 1,
  booking_max_days_ahead    int DEFAULT 60,
  booking_slot_interval     int DEFAULT 15,
  deposit_enabled           bool DEFAULT false,
  deposit_after_no_shows    int DEFAULT 2,
  deposit_blik_number       text,
  deposit_amount            decimal(10,2) DEFAULT 50,
  deposit_no_refund_hours   int DEFAULT 24,
  deposit_terms             text,
  hero_image_url            text,
  logo_url                  text,
  gallery_urls              text[] DEFAULT '{}',
  facebook_url              text,
  instagram_url             text,
  google_maps_url           text,
  onboarding_completed      bool DEFAULT false,
  onboarding_step           int DEFAULT 0,
  is_active                 bool DEFAULT true,
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id              uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  user_id               uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name                  text NOT NULL,
  email                 text,
  phone                 text,
  role                  staff_role DEFAULT 'employee',
  color                 text DEFAULT '#7C3AED',
  photo_url             text,
  working_hours         jsonb DEFAULT '{"1":{"start":"09:00","end":"18:00","is_working":true},"2":{"start":"09:00","end":"18:00","is_working":true},"3":{"start":"09:00","end":"18:00","is_working":true},"4":{"start":"09:00","end":"18:00","is_working":true},"5":{"start":"09:00","end":"18:00","is_working":true},"6":{"start":"09:00","end":"14:00","is_working":false},"7":{"start":"09:00","end":"14:00","is_working":false}}',
  visible_in_calendar   bool DEFAULT true,
  can_be_booked_online  bool DEFAULT true,
  commission_percent    decimal(5,2) DEFAULT 0,
  is_active             bool DEFAULT true,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clients (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id              uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  name                  text NOT NULL,
  phone                 text NOT NULL,
  email                 text,
  address               text,
  birthdate             date,
  notes                 text,
  referral_code         text UNIQUE,
  referred_by           uuid REFERENCES clients(id) ON DELETE SET NULL,
  total_spent           decimal(10,2) DEFAULT 0,
  visit_count           int DEFAULT 0,
  no_show_count         int DEFAULT 0,
  last_visit_at         timestamptz,
  active_discount       decimal(10,2) DEFAULT 0,
  active_discount_type  reward_type DEFAULT 'amount',
  discount_expires_at   timestamptz,
  tags                  text[] DEFAULT '{}',
  is_active             bool DEFAULT true,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id            uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  name                text NOT NULL,
  description         text,
  price               decimal(10,2) NOT NULL,
  price_max           decimal(10,2),
  duration_minutes    int NOT NULL DEFAULT 60,
  staff_ids           uuid[] DEFAULT '{}',
  resource_ids        uuid[] DEFAULT '{}',
  category            text,
  color               text,
  is_active           bool DEFAULT true,
  is_online_bookable  bool DEFAULT true,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS resources (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id    uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  name        text NOT NULL,
  type        text DEFAULT 'fotel',
  description text,
  is_active   bool DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- referrals MUSI być przed appointments (appointments.referral_id -> referrals.id)
CREATE TABLE IF NOT EXISTS referrals (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id        uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  referrer_id     uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  referred_id     uuid REFERENCES clients(id) ON DELETE CASCADE,
  reward_referrer decimal(10,2) DEFAULT 0,
  reward_new      decimal(10,2) DEFAULT 0,
  reward_type     reward_type DEFAULT 'amount',
  status          referral_status DEFAULT 'pending',
  appointment_id  uuid,  -- FK dodany poniżej przez ALTER TABLE
  used_at         timestamptz,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointments (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id        uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  client_id       uuid REFERENCES clients(id) ON DELETE SET NULL,
  staff_id        uuid REFERENCES staff(id) ON DELETE RESTRICT NOT NULL,
  service_id      uuid REFERENCES services(id) ON DELETE RESTRICT NOT NULL,
  resource_id     uuid REFERENCES resources(id) ON DELETE SET NULL,
  starts_at       timestamptz NOT NULL,
  ends_at         timestamptz NOT NULL,
  price           decimal(10,2) NOT NULL,
  original_price  decimal(10,2) NOT NULL,
  discount        decimal(10,2) DEFAULT 0,
  discount_type   reward_type,
  status          appointment_status DEFAULT 'pending',
  payment_method  payment_method,
  referral_code   text,
  referral_id     uuid REFERENCES referrals(id) ON DELETE SET NULL,
  source          booking_source DEFAULT 'manual',
  notes           text,
  client_name     text,
  client_phone    text,
  deposit_paid    bool DEFAULT false,
  deposit_amount  decimal(10,2),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Circular FK: referrals.appointment_id -> appointments (bezpieczny ADD jeśli nie istnieje)
DO $$ BEGIN
  ALTER TABLE referrals
    ADD CONSTRAINT fk_referrals_appointment
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS referral_settings (
  id                            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id                      uuid REFERENCES salons(id) ON DELETE CASCADE UNIQUE NOT NULL,
  is_active                     bool DEFAULT true,
  reward_type                   reward_type DEFAULT 'amount',
  reward_referrer               decimal(10,2) DEFAULT 20,
  reward_new                    decimal(10,2) DEFAULT 20,
  commission_on_original_price  bool DEFAULT true,
  multi_rewards                 jsonb DEFAULT '[]',
  created_at                    timestamptz DEFAULT now(),
  updated_at                    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointment_history (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id  uuid REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
  salon_id        uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  changed_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  change_type     change_type NOT NULL,
  old_data        jsonb,
  new_data        jsonb,
  note            text,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blocks (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id          uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  staff_id          uuid REFERENCES staff(id) ON DELETE CASCADE,
  title             text NOT NULL DEFAULT 'Przerwa',
  reason            text,
  starts_at         timestamptz NOT NULL,
  ends_at           timestamptz NOT NULL,
  notes             text,
  recurrence_type   text DEFAULT 'none',
  recurrence_until  date,
  color             text DEFAULT '#E2E8F0',
  created_at        timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id        uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  name            text NOT NULL,
  description     text,
  category        text,
  quantity        decimal(10,3) DEFAULT 0,
  unit            text DEFAULT 'szt',
  price_per_unit  decimal(10,2) DEFAULT 0,
  alert_threshold decimal(10,3) DEFAULT 1,
  service_usage   jsonb DEFAULT '{}',
  supplier        text,
  sku             text,
  is_active       bool DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_history (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id         uuid REFERENCES inventory(id) ON DELETE CASCADE NOT NULL,
  salon_id        uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  change_type     inventory_change_type NOT NULL,
  quantity_before decimal(10,3) NOT NULL,
  quantity_change decimal(10,3) NOT NULL,
  quantity_after  decimal(10,3) NOT NULL,
  unit_price      decimal(10,2),
  client_id       uuid REFERENCES clients(id) ON DELETE SET NULL,
  appointment_id  uuid REFERENCES appointments(id) ON DELETE SET NULL,
  notes           text,
  changed_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS finance_entries (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id        uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  type            finance_type NOT NULL,
  category        text NOT NULL,
  amount          decimal(10,2) NOT NULL,
  description     text,
  date            date NOT NULL,
  appointment_id  uuid REFERENCES appointments(id) ON DELETE SET NULL,
  staff_id        uuid REFERENCES staff(id) ON DELETE SET NULL,
  payment_method  payment_method,
  receipt_url     text,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sms_logs (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id              uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  appointment_id        uuid REFERENCES appointments(id) ON DELETE SET NULL,
  client_id             uuid REFERENCES clients(id) ON DELETE SET NULL,
  type                  sms_type NOT NULL,
  phone                 text NOT NULL,
  message               text NOT NULL,
  status                sms_status DEFAULT 'pending',
  smsplanet_message_id  text,
  error_message         text,
  sent_at               timestamptz DEFAULT now(),
  delivered_at          timestamptz
);

CREATE TABLE IF NOT EXISTS sms_templates (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id    uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  type        sms_type NOT NULL,
  name        text NOT NULL,
  content     text NOT NULL,
  hours_before int DEFAULT 24,
  is_active   bool DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS partner_salons (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id            uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  partner_name        text NOT NULL,
  contact_name        text,
  contact_phone       text,
  contact_email       text,
  address             text,
  discount_type       reward_type DEFAULT 'percent',
  discount_value      decimal(10,2) DEFAULT 0,
  points_per_visit    int DEFAULT 0,
  points_balance      int DEFAULT 0,
  notes               text,
  is_settled          bool DEFAULT false,
  last_settlement_at  timestamptz,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS partner_settlements (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_salon_id  uuid REFERENCES partner_salons(id) ON DELETE CASCADE NOT NULL,
  salon_id          uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  amount            decimal(10,2),
  points            int DEFAULT 0,
  notes             text,
  settled_at        timestamptz DEFAULT now(),
  settled_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id            uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  client_name         text NOT NULL,
  client_phone        text,
  rating              int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment             text,
  photo_urls          text[] DEFAULT '{}',
  is_approved         bool DEFAULT false,
  salon_reply         text,
  replied_at          timestamptz,
  verified_by_referly bool DEFAULT true,
  created_at          timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS waiting_list (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id            uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  service_id          uuid REFERENCES services(id) ON DELETE CASCADE NOT NULL,
  client_name         text NOT NULL,
  client_phone        text NOT NULL,
  client_email        text,
  preferred_date      date,
  preferred_staff_id  uuid REFERENCES staff(id) ON DELETE SET NULL,
  notified_at         timestamptz,
  status              waiting_status DEFAULT 'waiting',
  created_at          timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title             text NOT NULL,
  slug              text UNIQUE NOT NULL,
  excerpt           text,
  content           text NOT NULL,
  category          text,
  tags              text[] DEFAULT '{}',
  meta_title        text,
  meta_description  text,
  og_image_url      text,
  is_published      bool DEFAULT false,
  published_at      timestamptz,
  author_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  read_time_minutes int DEFAULT 5,
  views             int DEFAULT 0,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS magic_links (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id  uuid REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
  salon_id        uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  token           text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at      timestamptz DEFAULT (now() + interval '48 hours'),
  used_at         timestamptz,
  created_at      timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS superadmin_notes (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id    uuid REFERENCES salons(id) ON DELETE CASCADE NOT NULL,
  content     text NOT NULL,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- 4. INDEKSY
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_appointments_salon_starts   ON appointments(salon_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_appointments_staff_starts   ON appointments(staff_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_appointments_client         ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status         ON appointments(salon_id, status);
CREATE INDEX IF NOT EXISTS idx_clients_salon               ON clients(salon_id);
CREATE INDEX IF NOT EXISTS idx_clients_phone               ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_referral_code       ON clients(referral_code);
CREATE INDEX IF NOT EXISTS idx_staff_salon                 ON staff(salon_id);
CREATE INDEX IF NOT EXISTS idx_blocks_salon_starts         ON blocks(salon_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_inventory_salon             ON inventory(salon_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_salon              ON sms_logs(salon_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_finance_salon_date          ON finance_entries(salon_id, date);
CREATE INDEX IF NOT EXISTS idx_referrals_salon             ON referrals(salon_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer          ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_partner_salons_salon        ON partner_salons(salon_id);
CREATE INDEX IF NOT EXISTS idx_waiting_list_salon          ON waiting_list(salon_id, status);
CREATE INDEX IF NOT EXISTS idx_sms_templates_salon         ON sms_templates(salon_id, type);
CREATE INDEX IF NOT EXISTS idx_clients_name_trgm           ON clients USING gin(name gin_trgm_ops);

-- ============================================================
-- 5. FUNKCJE HELPER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS bool LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_user_meta_data->>'is_superadmin' = 'true'
  );
$$;

-- ============================================================
-- 6. TRIGGERY: updated_at
-- ============================================================
DO $$ BEGIN
  CREATE TRIGGER trg_salons_updated_at BEFORE UPDATE ON salons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_staff_updated_at BEFORE UPDATE ON staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_inventory_updated_at BEFORE UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER trg_referral_settings_updated_at BEFORE UPDATE ON referral_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 7. TRIGGER: Auto-generowanie kodu polecającego
-- ============================================================
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  code    text;
  prefix  text;
  attempts int := 0;
BEGIN
  IF NEW.referral_code IS NULL THEN
    prefix := upper(regexp_replace(left(NEW.name, 3), '[^A-Za-z]', 'X', 'g'));
    LOOP
      code := prefix || upper(left(md5(random()::text), 5));
      IF NOT EXISTS (SELECT 1 FROM clients WHERE referral_code = code) THEN
        NEW.referral_code := code; EXIT;
      END IF;
      attempts := attempts + 1;
      IF attempts > 20 THEN
        NEW.referral_code := upper(left(md5(NEW.id::text || clock_timestamp()::text), 8));
        EXIT;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;

DO $$ BEGIN
  CREATE TRIGGER trg_clients_referral_code BEFORE INSERT ON clients
    FOR EACH ROW EXECUTE FUNCTION generate_referral_code();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 8. TRIGGER: Audit log wizyt
-- ============================================================
CREATE OR REPLACE FUNCTION log_appointment_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO appointment_history(appointment_id, salon_id, change_type, new_data)
    VALUES (NEW.id, NEW.salon_id, 'created', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO appointment_history(appointment_id, salon_id, change_type, old_data, new_data)
      VALUES (NEW.id, NEW.salon_id, 'status_changed', to_jsonb(OLD), to_jsonb(NEW));
    ELSE
      INSERT INTO appointment_history(appointment_id, salon_id, change_type, old_data, new_data)
      VALUES (NEW.id, NEW.salon_id, 'updated', to_jsonb(OLD), to_jsonb(NEW));
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DO $$ BEGIN
  CREATE TRIGGER trg_appointments_history AFTER INSERT OR UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION log_appointment_change();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 9. TRIGGER: Statystyki klienta
-- ============================================================
CREATE OR REPLACE FUNCTION update_client_stats()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'done' AND OLD.status != 'done'
     AND NEW.client_id IS NOT NULL THEN
    UPDATE clients SET
      total_spent   = total_spent + GREATEST(0, NEW.price - COALESCE(NEW.discount, 0)),
      visit_count   = visit_count + 1,
      last_visit_at = NEW.starts_at
    WHERE id = NEW.client_id;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status = 'no_show' AND OLD.status != 'no_show'
     AND NEW.client_id IS NOT NULL THEN
    UPDATE clients SET no_show_count = no_show_count + 1 WHERE id = NEW.client_id;
  END IF;
  RETURN NEW;
END; $$;

DO $$ BEGIN
  CREATE TRIGGER trg_update_client_stats AFTER UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_client_stats();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 10. TRIGGER: Odliczanie magazynu po wizycie
-- ============================================================
CREATE OR REPLACE FUNCTION deduct_inventory_on_done()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  inv_item  record;
  usage_qty decimal(10,3);
  svc_key   text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'done' AND OLD.status != 'done' THEN
    svc_key := NEW.service_id::text;
    FOR inv_item IN
      SELECT i.*, (i.service_usage ->> svc_key)::decimal AS usage
      FROM inventory i
      WHERE i.salon_id = NEW.salon_id
        AND i.is_active = true
        AND i.service_usage ? svc_key
        AND (i.service_usage ->> svc_key)::decimal > 0
    LOOP
      usage_qty := inv_item.usage;
      IF inv_item.quantity >= usage_qty THEN
        INSERT INTO inventory_history(
          item_id, salon_id, change_type,
          quantity_before, quantity_change, quantity_after, appointment_id
        ) VALUES (
          inv_item.id, NEW.salon_id, 'use',
          inv_item.quantity, -usage_qty, inv_item.quantity - usage_qty, NEW.id
        );
        UPDATE inventory SET quantity = quantity - usage_qty WHERE id = inv_item.id;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;

DO $$ BEGIN
  CREATE TRIGGER trg_inventory_deduct AFTER UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION deduct_inventory_on_done();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 11. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE salons              ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff               ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients             ENABLE ROW LEVEL SECURITY;
ALTER TABLE services            ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources           ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals           ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_settings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory           ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_salons      ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews             ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiting_list        ENABLE ROW LEVEL SECURITY;
ALTER TABLE magic_links         ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE superadmin_notes    ENABLE ROW LEVEL SECURITY;

-- SALONS
DROP POLICY IF EXISTS "salon_owner_all"   ON salons;
DROP POLICY IF EXISTS "salon_staff_read"  ON salons;
DROP POLICY IF EXISTS "salon_public_read" ON salons;
CREATE POLICY "salon_owner_all"   ON salons FOR ALL     USING (owner_id = auth.uid() OR is_superadmin());
CREATE POLICY "salon_staff_read"  ON salons FOR SELECT  USING (id IN (SELECT salon_id FROM staff WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "salon_public_read" ON salons FOR SELECT  USING (is_active = true);

-- STAFF
DROP POLICY IF EXISTS "staff_owner_all"  ON staff;
DROP POLICY IF EXISTS "staff_self_read"  ON staff;
CREATE POLICY "staff_owner_all" ON staff FOR ALL    USING (salon_id IN (SELECT id FROM salons WHERE owner_id = auth.uid()) OR is_superadmin());
CREATE POLICY "staff_self_read" ON staff FOR SELECT USING (user_id = auth.uid());

-- CLIENTS: publiczny odczyt referral_code
DROP POLICY IF EXISTS "clients_public_referral" ON clients;
CREATE POLICY "clients_public_referral" ON clients FOR SELECT USING (referral_code IS NOT NULL);

-- Tabele z salon_id: właściciel lub pracownik
DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'clients','services','resources','appointments','appointment_history',
    'blocks','referrals','referral_settings','inventory','inventory_history',
    'finance_entries','sms_logs','sms_templates','partner_salons',
    'partner_settlements','reviews','waiting_list','magic_links','superadmin_notes'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "member_all_%s" ON %I', tbl, tbl);
    EXECUTE format($f$
      CREATE POLICY "member_all_%s" ON %I FOR ALL USING (
        salon_id IN (
          SELECT id FROM salons WHERE owner_id = auth.uid()
          UNION ALL
          SELECT salon_id FROM staff WHERE user_id = auth.uid() AND is_active = true
        ) OR is_superadmin()
      )
    $f$, tbl, tbl);
  END LOOP;
END $$;

-- BLOG
DROP POLICY IF EXISTS "blog_public_read"    ON blog_posts;
DROP POLICY IF EXISTS "blog_superadmin_all" ON blog_posts;
CREATE POLICY "blog_public_read"    ON blog_posts FOR SELECT USING (is_published = true OR is_superadmin());
CREATE POLICY "blog_superadmin_all" ON blog_posts FOR ALL    USING (is_superadmin());

-- ============================================================
-- 12. WIDOKI ANALITYCZNE
-- ============================================================
CREATE OR REPLACE VIEW v_appointment_stats AS
SELECT
  a.salon_id,
  date_trunc('day',   a.starts_at)::date AS day,
  date_trunc('week',  a.starts_at)::date AS week,
  date_trunc('month', a.starts_at)::date AS month,
  count(*)                                              AS total_appointments,
  count(*) FILTER (WHERE a.status = 'done')            AS done_appointments,
  count(*) FILTER (WHERE a.status = 'cancelled')       AS cancelled_appointments,
  count(*) FILTER (WHERE a.status = 'no_show')         AS no_show_appointments,
  coalesce(sum(a.price - coalesce(a.discount,0)) FILTER (WHERE a.status = 'done'), 0) AS total_revenue,
  coalesce(sum(a.discount)                       FILTER (WHERE a.status = 'done'), 0) AS total_discounts,
  count(DISTINCT a.client_id)                          AS unique_clients
FROM appointments a
GROUP BY a.salon_id, date_trunc('day',a.starts_at), date_trunc('week',a.starts_at), date_trunc('month',a.starts_at);

CREATE OR REPLACE VIEW v_staff_stats AS
SELECT
  a.salon_id,
  a.staff_id,
  s.name                                        AS staff_name,
  date_trunc('month', a.starts_at)::date        AS month,
  count(*) FILTER (WHERE a.status = 'done')     AS done_appointments,
  coalesce(sum(a.price - coalesce(a.discount,0)) FILTER (WHERE a.status = 'done'), 0) AS revenue,
  coalesce(sum((a.price - coalesce(a.discount,0)) * s.commission_percent / 100) FILTER (WHERE a.status = 'done'), 0) AS commission,
  count(DISTINCT a.client_id)                   AS unique_clients
FROM appointments a
JOIN staff s ON s.id = a.staff_id
GROUP BY a.salon_id, a.staff_id, s.name, s.commission_percent, date_trunc('month', a.starts_at);

CREATE OR REPLACE VIEW v_referral_stats AS
SELECT
  r.salon_id,
  c.id                                                  AS referrer_id,
  c.name                                                AS referrer_name,
  c.referral_code,
  count(r.id)                                          AS total_referrals,
  count(r.id) FILTER (WHERE r.status = 'used')        AS used_referrals,
  coalesce(sum(r.reward_referrer) FILTER (WHERE r.status = 'used'), 0) AS total_rewards_given,
  coalesce(sum(a.price - coalesce(a.discount,0)) FILTER (WHERE a.status = 'done'), 0) AS revenue_from_referrals
FROM clients c
LEFT JOIN referrals   r ON r.referrer_id = c.id
LEFT JOIN appointments a ON a.referral_id = r.id
GROUP BY r.salon_id, c.id, c.name, c.referral_code;

-- ============================================================
-- GOTOWE
-- 22 tabele | 3 widoki | 10 triggerów | RLS na wszystkich | 18 indeksów
-- ============================================================

-- ============================================================
-- PATCH: Naprawka błędów dostępu przy rejestracji (INSERT salonu)
-- Problem: nowy użytkownik nie może wstawić rekordu do salons
-- bo RLS "salon_owner_all" sprawdza owner_id = auth.uid() ale
-- przy INSERT nie ma jeszcze rekordu do sprawdzenia.
-- ============================================================

-- Dodajemy osobną politykę INSERT dla salons
DROP POLICY IF EXISTS "salon_insert_own" ON salons;
CREATE POLICY "salon_insert_own" ON salons
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Upewniamy się że anon może czytać salony (dla /salon/[slug] i /p/[code])
ALTER TABLE salons FORCE ROW LEVEL SECURITY;

-- Polityka dla publicznego SELECT na clients (strona /p/[code])
-- Anonimowy użytkownik musi widzieć klienta po referral_code
DROP POLICY IF EXISTS "clients_anon_referral" ON clients;
CREATE POLICY "clients_anon_referral" ON clients
  FOR SELECT
  USING (referral_code IS NOT NULL);

-- Publiczny SELECT na salons dla /salon/[slug]
DROP POLICY IF EXISTS "salons_anon_public" ON salons;
CREATE POLICY "salons_anon_public" ON salons
  FOR SELECT
  USING (is_active = true);

-- Publiczny SELECT na services, resources, reviews, waiting_list dla bookingu
DROP POLICY IF EXISTS "services_public_read" ON services;
CREATE POLICY "services_public_read" ON services
  FOR SELECT USING (is_active = true AND is_online_bookable = true);

DROP POLICY IF EXISTS "staff_public_read" ON staff;
CREATE POLICY "staff_public_read" ON staff
  FOR SELECT USING (is_active = true AND can_be_booked_online = true);

DROP POLICY IF EXISTS "reviews_public_read" ON reviews;
CREATE POLICY "reviews_public_read" ON reviews
  FOR SELECT USING (is_approved = true);

DROP POLICY IF EXISTS "referral_settings_public_read" ON referral_settings;
CREATE POLICY "referral_settings_public_read" ON referral_settings
  FOR SELECT USING (is_active = true);

-- Booking online: anonimowi mogą INSERT do appointments
DROP POLICY IF EXISTS "appointments_anon_insert" ON appointments;
CREATE POLICY "appointments_anon_insert" ON appointments
  FOR INSERT WITH CHECK (source = 'online');

-- Anonimowi mogą INSERT do clients (nowa klientka przez booking)
DROP POLICY IF EXISTS "clients_anon_insert" ON clients;
CREATE POLICY "clients_anon_insert" ON clients
  FOR INSERT WITH CHECK (true);

-- Anonimowi mogą INSERT do waiting_list
DROP POLICY IF EXISTS "waiting_list_anon_insert" ON waiting_list;
CREATE POLICY "waiting_list_anon_insert" ON waiting_list
  FOR INSERT WITH CHECK (true);
