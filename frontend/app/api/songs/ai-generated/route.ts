import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface AIGeneratedSongRequest {
  repository_url: string;
  suno_response: Record<string, unknown>;
  dust_analysis?: string;
  title?: string;
  task_id?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { repository_url, suno_response, title }: AIGeneratedSongRequest = await request.json();

    console.log("📥 Received AI-generated song request:", { repository_url, title });

    if (!repository_url) {
      return NextResponse.json({ 
        success: false,
        error: 'Repository URL is required' 
      }, { status: 400 });
    }

    if (!suno_response) {
      return NextResponse.json({ 
        success: false,
        error: 'Suno response is required' 
      }, { status: 400 });
    }

    // Extract repository name from URL
    const repoName = repository_url.split('/').pop() || 'Unknown Repository';

    // First, check if repository exists or create it
    const { data: existingRepo } = await supabase
      .from('repositories')
      .select('*')
      .eq('url', repository_url)
      .single();

    let repositoryId: string;

    if (existingRepo) {
      repositoryId = existingRepo.id;
      console.log("📁 Found existing repository:", repositoryId);
    } else {
      // Create new repository
      const { data: newRepo, error: repoError } = await supabase
        .from('repositories')
        .insert({
          name: repoName,
          url: repository_url
        })
        .select()
        .single();

      if (repoError) {
        console.error("❌ Error creating repository:", repoError);
        throw new Error(`Failed to create repository: ${repoError.message}`);
      }

      repositoryId = newRepo.id;
      console.log("✅ Created new repository:", repositoryId);
    }

    // Create song record (without audio_url for now, will be updated by callback)
    const songData = {
      repository_id: repositoryId,
      audio_url: null, // Will be updated by callback when generation is complete
      lyrics_url: null, // We could store the dust analysis as lyrics
    };

    // Store the task_id for later matching with callback
    // In a production app, you'd want a separate tasks table to track this properly

    const { data: song, error: songError } = await supabase
      .from('songs')
      .insert(songData)
      .select(`
        *,
        repository:repositories(*)
      `)
      .single();

    if (songError) {
      console.error("❌ Error creating song:", songError);
      throw new Error(`Failed to create song: ${songError.message}`);
    }

    console.log("🎵 Created AI-generated song:", song.id);

    return NextResponse.json({
      success: true,
      song: {
        ...song,
        title: title || `${repoName} AI Beat`,
        upvote_count: 0
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error("❌ Error in AI-generated song API:", error);
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}