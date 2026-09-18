-- ==============================================================================
-- SYM EMPIRE PLATFORM (S.E.P.) — MULTI-CHANNEL DISBURSEMENT & MFS ENGINE
-- Migration: 02_disbursement_fields.sql
-- ==============================================================================

-- Note: The system stores structured disbursement JSON in money_requests.admin_note
-- for 100% backwards compatibility with existing Supabase tables.
-- If preferred, the following dedicated columns can optionally be added to money_requests:

/*
ALTER TABLE public.money_requests
ADD COLUMN IF NOT EXISTS payout_method TEXT DEFAULT 'CASH', -- 'CASH', 'BKASH', 'NAGAD'
ADD COLUMN IF NOT EXISTS destination_number TEXT,
ADD COLUMN IF NOT EXISTS trx_id TEXT,
ADD COLUMN IF NOT EXISTS mfs_fee NUMERIC DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS fee_handling TEXT DEFAULT 'INCLUDED', -- 'INCLUDED', 'DEDUCTED', 'WAIVED'
ADD COLUMN IF NOT EXISTS total_disbursed NUMERIC,
ADD COLUMN IF NOT EXISTS receipt_url TEXT,
ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMPTZ;
*/
