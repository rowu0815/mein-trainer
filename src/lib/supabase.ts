import { createClient } from '@supabase/supabase-js'

// NEXT_PUBLIC_ keys are intentionally public (Supabase anon key is safe to expose)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  ?? 'https://nbczyrivqghwlryuaqlh.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5iY3p5cml2cWdod2xyeXVhcWxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NzcwODUsImV4cCI6MjA4ODQ1MzA4NX0.Y5sry3Mb8wTNNnR6pP2J_eRfhvqj9rnUgQWqoStKUAo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type LicensePlate = {
  code: string
  city: string
  district: string
  state: string
  user_id: string | null
  level: number
  next_review: string | null
}
