import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Mock client that returns empty data via proper async — never hangs
const mockSupabase = {
  from: () => ({
    select: async () => ({ data: [], error: { message: 'Supabase not configured' } }),
    order: () => mockSupabase.from(),
    limit: () => mockSupabase.from(),
    eq: () => mockSupabase.from(),
  })
};

export const supabase = (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'YOUR_SUPABASE_URL')
  ? createClient(supabaseUrl, supabaseAnonKey)
  : mockSupabase;
