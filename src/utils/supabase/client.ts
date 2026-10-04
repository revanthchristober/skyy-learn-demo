import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bturhosivfvyvanztkjb.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_8TrwhPda5rp_z3NiKlYXtA_1v1miGyW';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
