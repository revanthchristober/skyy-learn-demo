import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://bturhosivfvyvanztkjb.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_8TrwhPda5rp_z3NiKlYXtA_1v1miGyW';

export const supabaseServer = createClient(supabaseUrl, supabaseAnonKey);
