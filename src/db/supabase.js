import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://eydtvfbrzaiabrfohntb.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5ZHR2ZmJyemFpYWJyZm9obnRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNDYxMDIsImV4cCI6MjEwMTkyMjEwMn0.mkoUTMOs20P3s_8e5JTjGvr8akfdgPd93UqMcPIJWxI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
