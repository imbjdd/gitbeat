import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface SunoCallbackData {
  code: number;
  msg: string;
  data: {
    callbackType: string;
    task_id: string;
    data: Array<{
      id: string;
      audio_url: string;
      source_audio_url: string;
      stream_audio_url: string;
      source_stream_audio_url: string;
      image_url: string;
      video_url?: string;
      lyric?: string;
      title?: string;
      tags?: string;
      created_at?: string;
      model_name?: string;
      status?: string;
      gpt_description_prompt?: string;
      prompt?: string;
      type?: string;
    }>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const callbackData: SunoCallbackData = await request.json();
    
    console.log("🎵 Received Suno callback:", JSON.stringify(callbackData, null, 2));

    if (callbackData.code !== 200) {
      console.error("❌ Suno callback error:", callbackData.msg);
      return NextResponse.json({ error: 'Callback error' }, { status: 400 });
    }

    if (callbackData.data.callbackType !== "complete") {
      console.log("⏳ Callback type not complete:", callbackData.data.callbackType);
      return NextResponse.json({ success: true, message: 'Callback received but not complete' });
    }

    const taskId = callbackData.data.task_id;
    const generatedTracks = callbackData.data.data;

    if (!generatedTracks || generatedTracks.length === 0) {
      console.error("❌ No tracks in callback data");
      return NextResponse.json({ error: 'No tracks in callback' }, { status: 400 });
    }

    // Get the first track (assuming we generate one track per request)
    const track = generatedTracks[0];

    // Find the pending song record by task_id (we'll need to store this)
    // For now, we'll look for songs with no audio_url and match by creation time
    // This is a temporary solution - in production you'd want a proper task tracking table
    
    // Get the most recent song without audio_url (created in last 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: pendingSongs, error: fetchError } = await supabase
      .from('songs')
      .select(`
        *,
        repository:repositories(*)
      `)
      .is('audio_url', null)
      .gte('created_at', tenMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error("❌ Error fetching pending songs:", fetchError);
      throw new Error(`Failed to fetch pending songs: ${fetchError.message}`);
    }

    if (!pendingSongs || pendingSongs.length === 0) {
      console.log("⚠️ No pending songs found for task_id:", taskId);
      return NextResponse.json({ 
        success: true, 
        message: 'No pending songs found - track will be stored for later' 
      });
    }

    const pendingSong = pendingSongs[0];

    // Update the song with the audio URLs
    const { data: updatedSong, error: updateError } = await supabase
      .from('songs')
      .update({
        audio_url: track.audio_url,
        // You could also store other URLs in a JSON field if needed
        // metadata: {
        //   stream_url: track.stream_audio_url,
        //   image_url: track.image_url,
        //   lyrics: track.lyric,
        //   suno_id: track.id
        // }
      })
      .eq('id', pendingSong.id)
      .select(`
        *,
        repository:repositories(*)
      `)
      .single();

    if (updateError) {
      console.error("❌ Error updating song:", updateError);
      throw new Error(`Failed to update song: ${updateError.message}`);
    }

    console.log("✅ Successfully updated song with audio URL:", updatedSong.id);

    return NextResponse.json({
      success: true,
      message: 'Song updated with audio URL',
      song: updatedSong
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error("❌ Error in Suno callback:", error);
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}