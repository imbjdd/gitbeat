import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

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
    console.log("📤 Starting lyrics upload...");
    console.log("📤 Song ID:", songId);
    console.log("📤 Lyrics length:", lyrics.length);
    console.log("📤 Lyrics preview:", lyrics.substring(0, 200) + "...");
    
    const fileName = `${songId}_lyrics.txt`;
    console.log("📤 File name:", fileName);
    
    const { data, error } = await supabase.storage
      .from('lyrics-files')
      .upload(fileName, lyrics, {
        contentType: 'text/plain',
        upsert: true
      });

    if (error) {
      console.error("❌ Error uploading lyrics:", error);
      console.error("❌ Upload error details:", JSON.stringify(error, null, 2));
      return null;
    }

    console.log("✅ Upload successful, data:", data);

    // Get public URL for the uploaded lyrics
    const { data: publicUrlData } = supabase.storage
      .from('lyrics-files')
      .getPublicUrl(fileName);

    console.log("🔗 Generated public URL:", publicUrlData.publicUrl);
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

    // Upload lyrics first if dust_analysis is provided
    let lyricsUrl = null;
    console.log("🔍 Checking dust_analysis:", {
      exists: !!dust_analysis,
      length: dust_analysis?.length || 0,
      trimmedLength: dust_analysis?.trim().length || 0,
      preview: dust_analysis?.substring(0, 100) + "..."
    });
    
    if (dust_analysis && dust_analysis.trim()) {
      console.log("📝 Uploading lyrics BEFORE creating song record");
      // Strip emojis from the dust analysis before uploading
      const cleanedLyrics = stripEmojis(dust_analysis);
      console.log("📝 Cleaned lyrics length:", cleanedLyrics.length);
      
      // Generate a temporary ID for the lyrics file
      const tempId = randomUUID();
      lyricsUrl = await uploadLyricsToStorage(cleanedLyrics, tempId);
      console.log("📝 Lyrics uploaded with URL:", lyricsUrl);
    }

    // Create song record with audio URL and lyrics URL if available
    const audioUrl = suno_response && typeof suno_response === 'object' && 'audioUrl' in suno_response 
      ? suno_response.audioUrl as string 
      : null;
      
    const songData = {
      repository_id: repositoryId,
      audio_url: audioUrl,
      lyrics_url: lyricsUrl, // Include lyrics URL from the start
    };

    console.log("🎵 Creating song record with data:", songData);

    // Create the song record with lyrics URL already included
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

    console.log("🎵 Created AI-generated song with lyrics URL:", song.id);
    console.log("🎵 Song lyrics_url:", song.lyrics_url);

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