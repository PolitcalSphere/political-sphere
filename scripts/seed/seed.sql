-- Sample seeder for local e2e tests
-- Creates a minimal users table and inserts one demo user if not present

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert demo user if not exists
INSERT INTO public.users (email, name, password_hash)
SELECT 'demo@political.test', 'Demo User', 'demo-hash' 
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'demo@political.test');

-- Add any other seed data below (roles, permissions, sample posts)
