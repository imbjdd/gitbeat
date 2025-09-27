import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Fetch all songs with their repositories and upvote counts
    const { data: songs, error } = await supabase
      .from('songs_with_upvote_counts')
      .select(`
        *,
        repository:repositories(*)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching songs:', error)
      return NextResponse.json(
        { error: 'Failed to fetch songs' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      songs: songs || []
    })

  } catch (error) {
    console.error('Error in songs route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
