import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Repository {
  id: string
  name: string
  url: string
  created_at: string
  updated_at: string
}

export interface Song {
  id: string
  repository_id: string
  audio_url?: string
  lyrics_url?: string
  created_at: string
  updated_at: string
  // Computed fields
  upvote_count?: number
}

export interface Upvote {
  id: string
  song_id: string
  created_at: string
}

// Extended types for frontend use
export interface SongWithRepository extends Song {
  repository: Repository
}

export interface SongWithUpvotes extends Song {
  upvotes: Upvote[]
}

// Helper functions for file uploads
export const uploadAudioFile = async (file: File, songId: string) => {
  const fileName = `${songId}-${Date.now()}.${file.name.split('.').pop()}`
  
  const { error } = await supabase.storage
    .from('audio-files')
    .upload(fileName, file)

  if (error) {
    console.error('Storage upload error:', error)
    throw new Error(`Failed to upload audio file: ${error.message}`)
  }
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('audio-files')
    .getPublicUrl(fileName)

  return publicUrl
}

export const uploadLyricsFile = async (lyrics: string, title: string, songId: string) => {
  const fileName = `${songId}-${Date.now()}.txt`
  const content = `Title: ${title}\n\n${lyrics}`
  const file = new Blob([content], { type: 'text/plain' })
  
  const { error } = await supabase.storage
    .from('lyrics-files')
    .upload(fileName, file)

  if (error) {
    console.error('Storage upload error:', error)
    throw new Error(`Failed to upload lyrics file: ${error.message}`)
  }
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('lyrics-files')
    .getPublicUrl(fileName)

  return publicUrl
}
