-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Global: clinic registry
CREATE TABLE IF NOT EXISTS public.clinics (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  slug        TEXT        UNIQUE NOT NULL,
  schema_name TEXT        UNIQUE NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Global: roles
CREATE TABLE IF NOT EXISTS public.roles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        UNIQUE NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Global: role permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id  UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  resource TEXT NOT NULL,
  action   TEXT NOT NULL,
  PRIMARY KEY (role_id, resource, action)
);

-- Seed roles
INSERT INTO public.roles (name, description) VALUES
  ('super_admin',  'Platform-level administrator'),
  ('clinic_owner', 'Full access within their clinic'),
  ('dentist',      'Clinical access — patients, treatments, notes'),
  ('receptionist', 'Scheduling, billing, patient basic info'),
  ('patient',      'Portal access — own records only')
ON CONFLICT (name) DO NOTHING;

-- Function: provision a new tenant schema
CREATE OR REPLACE FUNCTION public.create_tenant_schema(p_schema TEXT)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', p_schema);
END;
$$;