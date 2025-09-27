import { NextRequest, NextResponse } from 'next/server'
import { supabase, uploadAudioFile, uploadLyricsFile } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const repoUrl = formData.get('repoUrl') as string
    const audioFile = formData.get('audioFile') as File | null
    const lyrics = formData.get('lyrics') as string | null
    const title = formData.get('title') as string | null

    if (!repoUrl || typeof repoUrl !== 'string') {
      return NextResponse.json(
        { error: 'Repository URL is required' },
        { status: 400 }
      )
    }

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      )
    }

    if (!title) {
      return NextResponse.json(
        { error: 'Song title is required' },
        { status: 400 }
      )
    }

    // Extract repository name from URL
    const repoName = repoUrl.split('/').pop() || repoUrl

    // Check if repository already exists
    const { data: existingRepo, error: repoCheckError } = await supabase
      .from('repositories')
      .select('*')
      .eq('url', repoUrl)
      .single()

    if (repoCheckError && repoCheckError.code !== 'PGRST116') {
      console.error('Error checking repository:', repoCheckError)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    let repository = existingRepo

    // Create repository if it doesn't exist
    if (!existingRepo) {
      const { data: newRepo, error: repoError } = await supabase
        .from('repositories')
        .insert([
          {
            name: repoName,
            url: repoUrl
          }
        ])
        .select()
        .single()

      if (repoError) {
        console.error('Error creating repository:', repoError)
        return NextResponse.json(
          { error: 'Failed to create repository' },
          { status: 500 }
        )
      }

      repository = newRepo
    }

    // Upload audio file first
    let audioUrl: string | undefined
    let lyricsUrl: string | undefined
    
    try {
      // Generate a temporary song ID for file naming
      const tempSongId = `temp-${Date.now()}`
      audioUrl = await uploadAudioFile(audioFile, tempSongId)
      console.log('Audio uploaded successfully:', audioUrl)
      
      // Upload lyrics file if provided
      if (lyrics && lyrics.trim()) {
        try {
          lyricsUrl = await uploadLyricsFile(lyrics, title, tempSongId)
          console.log('Lyrics uploaded successfully:', lyricsUrl)
        } catch (error) {
          console.error('Error uploading lyrics file:', error)
          // Continue without lyrics if upload fails
        }
      }
    } catch (error) {
      console.error('Error uploading audio file:', error)
      return NextResponse.json(
        { error: 'Failed to upload audio file' },
        { status: 500 }
      )
    }

    // Create song record with file URLs
    const { data: song, error: songError } = await supabase
      .from('songs')
      .insert([
        {
          repository_id: repository.id,
          audio_url: audioUrl,
          lyrics_url: lyricsUrl
        }
      ])
      .select('*')
      .single()

    if (songError) {
      console.error('Error creating song:', songError)
      return NextResponse.json(
        { error: 'Failed to create song' },
        { status: 500 }
      )
    }

    // Fetch the song with repository info
    const { data: songWithRepo, error: fetchError } = await supabase
      .from('songs')
      .select(`
        *,
        repository:repositories(*)
      `)
      .eq('id', song.id)
      .single()

    if (fetchError) {
      console.error('Error fetching song with repository:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch song details' },
        { status: 500 }
      )
    }

    // Get upvote count for the song (should be 0 for new song)
    const { data: upvotes, error: upvoteError } = await supabase
      .from('upvotes')
      .select('id')
      .eq('song_id', song.id)

    if (upvoteError) {
      console.error('Error fetching upvotes:', upvoteError)
    }

    const songWithUpvotes = {
      ...songWithRepo,
      upvote_count: upvotes?.length || 0,
      title: title // Add title for frontend display
    }

    return NextResponse.json({
      success: true,
      song: songWithUpvotes
    })

  } catch (error) {
    console.error('Error in upload route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
