import { createClient, SupabaseClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ijavfdrhouleuhxtbjyi.supabase.co'
const DEFAULT_SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqYXZmZHJob3VsZXVoeHRianlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NjYwMDMsImV4cCI6MjA5NjU0MjAwM30.jt9Q8Kkty0JdvJxvkAVWfHQ94pdxGQ78GmaSTS2hITE'

export const supabase: SupabaseClient = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY)

const TABLE_NAME = 'outgoing_incoming_docs'

export async function fetchDocuments() {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .order('date', { ascending: false })

  if (error) throw error
  return data
}

export async function upsertDocuments(rows: any[]) {
  // rows should include an `id` when updating; otherwise this will insert
  const { data, error } = await supabase.from(TABLE_NAME).upsert(rows, { onConflict: 'id' })
  if (error) throw error
  return data
}

export async function deleteDocument(id: string | number) {
  const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id)
  if (error) throw error
  return true
}
