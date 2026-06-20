import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'placeholder';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_ANON_KEY && !supabaseServiceKey)) {
  console.warn('Supabase credentials missing. Mock data will be used if fallback is active.');
}

const activeKey = supabaseServiceKey && supabaseServiceKey.length > 5 
  ? supabaseServiceKey 
  : (supabaseAnonKey.length > 5 ? supabaseAnonKey : 'placeholder');

export const supabase = createClient(
  supabaseUrl.includes('http') ? supabaseUrl : 'https://placeholder.supabase.co',
  activeKey
);
