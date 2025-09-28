import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to strip emojis from text
function stripEmojis(text: string): string {
  // Remove emojis using regex - covers most emoji ranges
  return text.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
    // Remove additional emoji ranges
    .replace(/[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]/gu, '')
    // Remove miscellaneous symbols and pictographs
    .replace(/[\u{2190}-\u{21FF}]|[\u{2B00}-\u{2BFF}]/gu, '')
    // Clean up extra whitespace that might be left after emoji removal
    .replace(/\s+/g, ' ')
    .trim();
}

// Function to upload lyrics to Supabase storage
async function uploadLyricsToStorage(lyrics: string, songId: string): Promise<string | null> {
  try {
    const fileName = `${songId}_lyrics.txt`;
    const { data, error } = await supabase.storage
      .from('lyrics-files')
      .upload(fileName, lyrics, {
        contentType: 'text/plain',
        upsert: true
      });

    if (error) {
      console.error("❌ Error uploading lyrics:", error);
      return null;
    }

    // Get public URL for the uploaded lyrics
    const { data: publicUrlData } = supabase.storage
      .from('lyrics-files')
      .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error("❌ Error in uploadLyricsToStorage:", error);
    return null;
  }
}

interface AIGeneratedSongRequest {
  repository_url: string;
  suno_response: Record<string, unknown>;
  dust_analysis?: string;
  title?: string;
  task_id?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { repository_url, suno_response, dust_analysis, title }: AIGeneratedSongRequest = await request.json();

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

    // Create song record with audio URL if available
    const audioUrl = suno_response && typeof suno_response === 'object' && 'audioUrl' in suno_response 
      ? suno_response.audioUrl as string 
      : null;
      
    const songData = {
      repository_id: repositoryId,
      audio_url: audioUrl,
      lyrics_url: null, // Will be updated after lyrics upload
    };

    // First, create the song record to get an ID
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

    // Upload lyrics if dust_analysis is provided
    let lyricsUrl = null;
    if (dust_analysis && dust_analysis.trim()) {
      console.log("📝 Uploading lyrics for song:", song.id);
      // Strip emojis from the dust analysis before uploading
      const cleanedLyrics = stripEmojis(dust_analysis);
      lyricsUrl = await uploadLyricsToStorage(cleanedLyrics, song.id);
      
      if (lyricsUrl) {
        // Update the song record with the lyrics URL
        const { error: updateError } = await supabase
          .from('songs')
          .update({ lyrics_url: lyricsUrl })
          .eq('id', song.id);

        if (updateError) {
          console.error("❌ Error updating song with lyrics URL:", updateError);
        } else {
          console.log("✅ Updated song with lyrics URL:", lyricsUrl);
        }
      }
    }

    return NextResponse.json({
      success: true,
      song: {
        ...song,
        lyrics_url: lyricsUrl || song.lyrics_url,
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