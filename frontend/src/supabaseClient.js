import { createClient } from '@supabase/supabase-js';

// Vite 프로젝트에서는 import.meta.env를 통해 환경 변수에 접근합니다.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
