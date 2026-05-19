-- =====================================================
-- Supabase Migration for 3EJS Tech ISP Management App
-- Run this SQL in your Supabase SQL Editor
-- Safe for fresh installs AND resets existing tables
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- Drop leftover subscriber table (from old Google Sheets setup)
-- =====================================================
DROP TABLE IF EXISTS subscriber CASCADE;

-- =====================================================
-- Drop existing tables in correct order
-- =====================================================
DROP TABLE IF EXISTS eload;
DROP TABLE IF EXISTS installations;
DROP TABLE IF EXISTS historicaldata;
DROP TABLE IF EXISTS users;

-- =====================================================
-- Users Table
-- =====================================================
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'view_only' CHECK (role IN ('admin', 'technician', 'eload', 'view_only')),
  createdat TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_all" ON users FOR SELECT USING (true);
CREATE POLICY "users_insert_all" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_update_all" ON users FOR UPDATE USING (true);
CREATE POLICY "users_delete_all" ON users FOR DELETE USING (true);

-- =====================================================
-- Installations Table
-- =====================================================
CREATE TABLE installations (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  no TEXT,
  dateinstalled TEXT,
  agentname TEXT,
  jonumber TEXT UNIQUE,
  accountnumber TEXT,
  subsname TEXT,
  contact1 TEXT,
  contact2 TEXT,
  address TEXT,
  houselatitude TEXT,
  houselongitude TEXT,
  port TEXT,
  technician TEXT,
  modemserial TEXT,
  reelnum TEXT,
  reelstart TEXT,
  reelend TEXT,
  fiberopticcable TEXT,
  mechconnector TEXT,
  sclam TEXT,
  patchcordapcsc TEXT,
  housebracket TEXT,
  midspan TEXT,
  cableclip TEXT,
  ftthterminalbox TEXT,
  doublesidedtape TEXT,
  cabletiewrap TEXT,
  status TEXT DEFAULT 'pending',
  monthinstalled TEXT,
  yearinstalled TEXT,
  loadexpire TEXT,
  notifstatus TEXT DEFAULT 'Not Yet Notified',
  loadstatus TEXT DEFAULT 'Not yet Loaded',
  createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE installations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "installations_select_all" ON installations FOR SELECT USING (true);
CREATE POLICY "installations_insert_all" ON installations FOR INSERT WITH CHECK (true);
CREATE POLICY "installations_update_all" ON installations FOR UPDATE USING (true);
CREATE POLICY "installations_delete_all" ON installations FOR DELETE USING (true);

-- =====================================================
-- Historical Data Table (for archived/installation history)
-- =====================================================
CREATE TABLE historicaldata (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  dateinstalled TEXT,
  jonumber TEXT,
  accountnumber TEXT,
  subsname TEXT,
  address TEXT,
  contact1 TEXT,
  contact2 TEXT,
  technician TEXT,
  modemserial TEXT,
  port TEXT,
  napboxlonglat TEXT,
  fiberopticcable TEXT,
  mechconnector TEXT,
  sclamp TEXT,
  patchcordapcsc TEXT,
  housebracket TEXT,
  midspan TEXT,
  cableclip TEXT,
  ftthterminalbox TEXT,
  doublesidedtape TEXT,
  cabletiewrap TEXT,
  gcashhandler TEXT,
  gcashreference TEXT,
  timeloaded TEXT,
  amount NUMERIC(10, 2),
  markup NUMERIC(10, 2),
  incentive NUMERIC(10, 2),
  retailer NUMERIC(10, 2),
  dealer NUMERIC(10, 2),
  remarks TEXT,
  createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE historicaldata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "historicaldata_select_all" ON historicaldata FOR SELECT USING (true);
CREATE POLICY "historicaldata_insert_all" ON historicaldata FOR INSERT WITH CHECK (true);
CREATE POLICY "historicaldata_update_all" ON historicaldata FOR UPDATE USING (true);
CREATE POLICY "historicaldata_delete_all" ON historicaldata FOR DELETE USING (true);

-- =====================================================
-- E-Load Table
-- =====================================================
CREATE TABLE eload (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  gcashhandler TEXT,
  dateloaded TEXT,
  timeloaded TEXT,
  gcashreference TEXT,
  amount NUMERIC(10, 2),
  accountnumber TEXT,
  markup NUMERIC(10, 2),
  incentive NUMERIC(10, 2),
  retailer NUMERIC(10, 2),
  dealer NUMERIC(10, 2),
  remarks TEXT,
  createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updatedat TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE eload ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eload_select_all" ON eload FOR SELECT USING (true);
CREATE POLICY "eload_insert_all" ON eload FOR INSERT WITH CHECK (true);
CREATE POLICY "eload_update_all" ON eload FOR UPDATE USING (true);
CREATE POLICY "eload_delete_all" ON eload FOR DELETE USING (true);

-- =====================================================
-- Indexes
-- =====================================================
CREATE INDEX idx_installations_jonumber ON installations(jonumber);
CREATE INDEX idx_installations_accountnumber ON installations(accountnumber);
CREATE INDEX idx_installations_subsname ON installations(subsname);
CREATE INDEX idx_installations_technician ON installations(technician);
CREATE INDEX idx_installations_notifstatus ON installations(notifstatus);
CREATE INDEX idx_installations_loadstatus ON installations(loadstatus);

CREATE INDEX idx_eload_accountnumber ON eload(accountnumber);
CREATE INDEX idx_eload_dateloaded ON eload(dateloaded);
CREATE INDEX idx_eload_gcashreference ON eload(gcashreference);

CREATE INDEX idx_users_username ON users(username);

-- =====================================================
-- Note: notifyStatus (notifstatus) accepts these values:
-- 'Not Yet Notified' - Subscriber has not been notified
-- 'Notified' - Subscriber has been notified
-- 'Not Needed' - Subscriber has loaded (auto-set when E-Load is created)
--
-- loadStatus accepts these values:
-- 'Not yet Loaded' - Subscriber has not loaded
-- 'Account Loaded' - Subscriber has loaded (auto-set when E-Load is created)
-- =====================================================

-- =====================================================
-- Admin User — Password: admin123
-- =====================================================
INSERT INTO users (id, username, password, role) VALUES
  ('ryan', 'ryan', '$2b$12$QijDQOe.Qw9FMhlVWtJNnu7m.uSSYt6JX0uACayU3F/gye0OKEhr.', 'admin')
ON CONFLICT (username) DO NOTHING;