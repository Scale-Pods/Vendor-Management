import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const isConfigured = supabaseUrl && supabaseUrl !== 'YOUR_SUPABASE_URL';

const mock = {
  from: () => ({
    select: async () => ({ data: [], error: { message: 'Supabase not configured' } }),
    order: () => mock.from(),
    limit: () => mock.from(),
    eq: () => mock.from(),
  }),
  rpc: async () => ({ data: [], error: { message: 'Supabase not configured' } }),
};

export const supabase = (isConfigured && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : mock;

export const adminSupabase = (isConfigured && supabaseServiceKey)
  ? createClient(supabaseUrl, supabaseServiceKey)
  : supabase;
