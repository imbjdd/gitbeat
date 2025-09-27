import { NextRequest, NextResponse } from 'next/server';

interface SunoStatusResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    parentMusicId: string;
    param: string;
    response?: {
      taskId: string;
      sunoData: Array<{
        id: string;
        audioUrl: string;
        streamAudioUrl: string;
        imageUrl: string;
        prompt: string;
        modelName: string;
        title: string;
        tags: string;
        createTime: string;
        duration: number;
      }>;
    };
    status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
    type: string;
    errorCode: string | null;
    errorMessage: string | null;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    if (!taskId) {
      return NextResponse.json({ 
        success: false,
        error: 'Task ID is required' 
      }, { status: 400 });
    }

    const sunoApiToken = process.env.SUNO_API_TOKEN;
    if (!sunoApiToken) {
      return NextResponse.json({ 
        success: false,
        error: 'SUNO_API_TOKEN not configured' 
      }, { status: 500 });
    }

    const url = `https://api.sunoapi.org/api/v1/generate/record-info?taskId=${taskId}`;
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sunoApiToken}`,
        'Content-Type': 'application/json'
      }
    };

    console.log(`🔍 Checking Suno status for task: ${taskId}`);
    
    const response = await fetch(url, options);
    const data: SunoStatusResponse = await response.json();
    
    console.log("📡 Suno status response:", data);

    if (!response.ok) {
      throw new Error(`Suno API error: ${response.status} - ${data.msg || 'Unknown error'}`);
    }

    return NextResponse.json({
      success: true,
      data: data.data
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error("❌ Error checking Suno status:", error);
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}