import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const songId = resolvedParams.id

    if (!songId) {
      return NextResponse.json(
        { error: 'Song ID is required' },
        { status: 400 }
      )
    }

    // Check if song exists
    const { data: song, error: songError } = await supabase
      .from('songs')
      .select('id')
      .eq('id', songId)
      .single()

    if (songError || !song) {
      return NextResponse.json(
        { error: 'Song not found' },
        { status: 404 }
      )
    }

    // Create new upvote (no duplicate prevention)
    const { error: insertError } = await supabase
      .from('upvotes')
      .insert([
        {
          song_id: songId
        }
      ])

    if (insertError) {
      console.error('Error creating upvote:', insertError)
      return NextResponse.json(
        { error: 'Failed to create upvote' },
        { status: 500 }
      )
    }

    // Get updated upvote count
    const { data: upvotes, error: countError } = await supabase
      .from('upvotes')
      .select('id')
      .eq('song_id', songId)

    if (countError) {
      console.error('Error counting upvotes:', countError)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Upvote added successfully',
      upvote_count: upvotes?.length || 0
    })

  } catch (error) {
    console.error('Error in upvote route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
