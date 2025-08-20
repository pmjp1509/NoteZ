import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pctsgizlyfkyslymeywy.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseKey) {
  throw new Error('Missing Supabase key. Please set VITE_SUPABASE_ANON_KEY in your environment variables.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)
