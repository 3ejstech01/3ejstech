-- =====================================================
-- 3EJS Tech — Tightened Row-Level Security (security lockdown)
-- Project plan: .kilo/plans/project-enhancement-suggestions.md
-- Item #3: Replace permissive USING (true) policies.
--
-- PREREQUISITES
--   - Users authenticate via Supabase Auth (auth.users).
--   - Mirror role + username from auth.users into users.app_metadata / row.
--   - Run AFTER migration.sql on a fresh database. For existing DBs, audit
--     roles/owners first; tightening will deny anon access until backend
--     switches to service_role + middleware-set session (see src/lib/auth-guard.ts).
-- =====================================================

-- Helper: role of the currently authenticated user (NULL for anon).
-- Reads from JWT app_metadata first, falls back to public.users row.
CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    (SELECT role FROM public.users WHERE id = auth.uid()::text LIMIT 1)
  );
$$;

-- Convenience: is_admin()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_app_role() = 'admin';
$$;

-- ── USERS ────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_select_all"  ON users;
DROP POLICY IF EXISTS "users_insert_all"  ON users;
DROP POLICY IF EXISTS "users_update_all"  ON users;
DROP POLICY IF EXISTS "users_delete_all"  ON users;

-- Authenticated users may read non-sensitive columns (the password column
-- is excluded via a column-level GRANT below).
CREATE POLICY "users_select_authenticated"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Only admins may write.
CREATE POLICY "users_insert_admin"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "users_update_admin"
  ON users FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "users_delete_admin"
  ON users FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Strip password from anon/authenticated reads at the column level.
REVOKE ALL ON users FROM anon;
REVOKE SELECT (password) ON users FROM authenticated;

-- ── INSTALLATIONS ────────────────────────────────────────
DROP POLICY IF EXISTS "installations_select_all"  ON installations;
DROP POLICY IF EXISTS "installations_insert_all"  ON installations;
DROP POLICY IF EXISTS "installations_update_all"  ON installations;
DROP POLICY IF EXISTS "installations_delete_all"  ON installations;

CREATE POLICY "installations_select_authenticated"
  ON installations FOR SELECT TO authenticated USING (true);

CREATE POLICY "installations_write_authenticated"
  ON installations FOR INSERT TO authenticated
  WITH CHECK (public.current_app_role() IN ('admin', 'technician'));

CREATE POLICY "installations_update_authenticated"
  ON installations FOR UPDATE TO authenticated
  USING (public.current_app_role() IN ('admin', 'technician'))
  WITH CHECK (public.current_app_role() IN ('admin', 'technician'));

CREATE POLICY "installations_delete_admin"
  ON installations FOR DELETE TO authenticated
  USING (public.is_admin());

-- ── ELOAD ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "eload_select_all"  ON eload;
DROP POLICY IF EXISTS "eload_insert_all"  ON eload;
DROP POLICY IF EXISTS "eload_update_all"  ON eload;
DROP POLICY IF EXISTS "eload_delete_all"  ON eload;

CREATE POLICY "eload_select_authenticated"
  ON eload FOR SELECT TO authenticated USING (true);

CREATE POLICY "eload_write_authenticated"
  ON eload FOR INSERT TO authenticated
  WITH CHECK (public.current_app_role() IN ('admin', 'eload'));

CREATE POLICY "eload_update_authenticated"
  ON eload FOR UPDATE TO authenticated
  USING (public.current_app_role() IN ('admin', 'eload'))
  WITH CHECK (public.current_app_role() IN ('admin', 'eload'));

CREATE POLICY "eload_delete_admin"
  ON eload FOR DELETE TO authenticated
  USING (public.is_admin());

-- ── HISTORICAL DATA ──────────────────────────────────────
DROP POLICY IF EXISTS "historicaldata_select_all"  ON historicaldata;
DROP POLICY IF EXISTS "historicaldata_insert_all"  ON historicaldata;
DROP POLICY IF EXISTS "historicaldata_update_all"  ON historicaldata;
DROP POLICY IF EXISTS "historicaldata_delete_all"  ON historicaldata;

CREATE POLICY "historicaldata_select_authenticated"
  ON historicaldata FOR SELECT TO authenticated USING (true);

CREATE POLICY "historicaldata_write_admin"
  ON historicaldata FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "historicaldata_update_admin"
  ON historicaldata FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "historicaldata_delete_admin"
  ON historicaldata FOR DELETE TO authenticated
  USING (public.is_admin());

-- ── Anon: deny everything by default ─────────────────────
REVOKE ALL ON users, installations, eload, historicaldata FROM anon;
