'use strict';
/**
 * src/lib/supabase.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Supabase Client Factory
 *
 * Exports two clients:
 *   - supabase  : uses the ANON (publishable) key  → for client-safe queries
 *   - supabaseAdmin : uses the SERVICE ROLE key    → for server-only admin ops
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY    = process.env.SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  throw new Error('[Supabase] Missing required environment variables. Check your .env file.');
}

// Public client — safe for row-level security enforced queries
const supabase = createClient(SUPABASE_URL, ANON_KEY);

// Admin client — bypasses RLS, server-side only
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

module.exports = { supabase, supabaseAdmin };
