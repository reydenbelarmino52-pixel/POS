import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'placeholder';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.warn('Supabase credentials missing. Mock data will be used if fallback is active.');
}

export const supabase = createClient(
  supabaseUrl.includes('http') ? supabaseUrl : 'https://placeholder.supabase.co',
  supabaseAnonKey.length > 5 ? supabaseAnonKey : 'placeholder'
);
