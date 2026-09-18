-- ==============================================================================
-- SYM EMPIRE PLATFORM (S.E.P.) - SYM LOAN DATABASE SCHEMA
-- Target Tenant: Supabase (SYM-LOAN / gypqeknsxfljdvmycylv)
-- ==============================================================================

-- 1. ENUMS
CREATE TYPE public.profile_status AS ENUM (
    'ACTIVE',
    'FRAUD',
    'USELESS CLIENT',
    'BLOCKED'
);

CREATE TYPE public.request_status AS ENUM (
    'PENDING',
    'ACCEPTED',
    'DECLINED'
);

-- 2. HISTORICAL LEDGERS TABLE
CREATE TABLE IF NOT EXISTS public.historical_ledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    old_name TEXT NOT NULL,
    historical_balance NUMERIC NOT NULL DEFAULT 0.0,
    historical_tag TEXT DEFAULT 'STANDARD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. CLIENT PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.client_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT NOT NULL,
    nid_url TEXT NOT NULL,
    status public.profile_status NOT NULL DEFAULT 'ACTIVE',
    strikes_count INTEGER NOT NULL DEFAULT 0,
    historical_ledger_id UUID REFERENCES public.historical_ledgers(id) ON DELETE SET NULL,
    admin_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. MONEY REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.money_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.client_profiles(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    deadline_date DATE NOT NULL,
    status public.request_status NOT NULL DEFAULT 'PENDING',
    admin_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. DAILY EXPENSE ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.daily_expense_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name TEXT NOT NULL,
    total_price NUMERIC NOT NULL,
    budget_limit_at_creation NUMERIC NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. EXPENSE SPLITS TABLE
CREATE TABLE IF NOT EXISTS public.expense_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_item_id UUID NOT NULL REFERENCES public.daily_expense_items(id) ON DELETE CASCADE,
    person_name TEXT NOT NULL,
    split_share_price NUMERIC NOT NULL DEFAULT 0.0,
    is_loan_transfer BOOLEAN NOT NULL DEFAULT false,
    client_profile_id UUID REFERENCES public.client_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. SYSTEM BUDGETS TABLE
CREATE TABLE IF NOT EXISTS public.system_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timeframe_type TEXT NOT NULL,
    budget_value NUMERIC NOT NULL DEFAULT 0.0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
