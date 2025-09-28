import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Rate limiting: max 300 upvotes per hour per user
const RATE_LIMIT_COUNT = 300
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour in milliseconds

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

    // Check rate limiting using cookies
    const cookieName = 'upvote_history'
    const existingCookie = request.cookies.get(cookieName)?.value
    
    let upvoteHistory: { timestamp: number, songId: string }[] = []
    if (existingCookie) {
      try {
        upvoteHistory = JSON.parse(existingCookie)
      } catch {
        upvoteHistory = []
      }
    }

    // Clean old entries (older than rate limit window)
    const now = Date.now()
    upvoteHistory = upvoteHistory.filter(entry => 
      now - entry.timestamp < RATE_LIMIT_WINDOW
    )

    // Check if user has exceeded rate limit
    if (upvoteHistory.length >= RATE_LIMIT_COUNT) {
      const oldestEntry = upvoteHistory[0]
      const timeUntilReset = Math.ceil((oldestEntry.timestamp + RATE_LIMIT_WINDOW - now) / 1000 / 60) // minutes
      
      return NextResponse.json(
        { 
          error: `Rate limit exceeded. Try again in ${timeUntilReset} minute${timeUntilReset !== 1 ? 's' : ''}.`,
          rateLimited: true
        },
        { status: 429 }
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

    // Create new upvote
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

    // Update rate limiting history
    upvoteHistory.push({ timestamp: now, songId })
    
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

    // Create response with updated cookie
    const response = NextResponse.json({
      success: true,
      message: 'Upvote added successfully',
      upvote_count: upvotes?.length || 0,
      remainingUpvotes: RATE_LIMIT_COUNT - upvoteHistory.length
    })

    // Set updated cookie (expires in 1 hour)
    response.cookies.set(cookieName, JSON.stringify(upvoteHistory), {
      maxAge: RATE_LIMIT_WINDOW / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    })

    return response

  } catch (error) {
    console.error('Error in upvote route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
