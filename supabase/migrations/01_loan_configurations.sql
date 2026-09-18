-- ==============================================================================
-- SYM EMPIRE PLATFORM (S.E.P.) — OPTIONAL LOAN CONFIGURATIONS SCHEMA
-- Migration: 01_loan_configurations.sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.loan_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.client_profiles(id) ON DELETE CASCADE, -- NULL indicates GLOBAL DEFAULT
    min_amount NUMERIC NOT NULL DEFAULT 500.0,
    max_amount NUMERIC NOT NULL DEFAULT 25000.0,
    min_duration_days INTEGER NOT NULL DEFAULT 3,
    max_duration_days INTEGER NOT NULL DEFAULT 30,
    note TEXT,
    updated_by TEXT DEFAULT 'ADMIN',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for speedy lookups
CREATE INDEX IF NOT EXISTS idx_loan_config_client ON public.loan_configurations(client_id);
