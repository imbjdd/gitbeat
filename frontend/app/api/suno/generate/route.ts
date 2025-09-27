import { NextRequest, NextResponse } from 'next/server';

interface SunoGenerateRequest {
  prompt: string;
  style?: string;
  title?: string;
  customMode?: boolean;
  instrumental?: boolean;
  model?: string;
  negativeTags?: string;
  vocalGender?: 'm' | 'f';
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
  callBackUrl?: string;
}

interface SunoAPIResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}


export async function POST(request: NextRequest) {
  try {
    const { 
      prompt,
      style = "Electronic",
      title = "AI Generated Track",
      customMode = true,
      instrumental = false,
      model = "V5",
      negativeTags = "",
      vocalGender = "m",
      styleWeight = 0.65,
      weirdnessConstraint = 0.65,
      audioWeight = 0.65,
      callBackUrl
    }: SunoGenerateRequest = await request.json();

    // Set callback URL to our Next.js app
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://gitbeat.vercel.app'
      : process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    const finalCallbackUrl = callBackUrl || `${baseUrl}/api/suno/callback`;

    console.log("📥 Received Suno request:", { prompt, style, title, callbackUrl: finalCallbackUrl });

    if (!prompt) {
      return NextResponse.json({ 
        success: false,
        error: 'Prompt is required' 
      }, { status: 400 });
    }

    const sunoApiToken = process.env.SUNO_API_TOKEN;
    if (!sunoApiToken) {
      return NextResponse.json({ 
        success: false,
        error: 'SUNO_API_TOKEN not configured' 
      }, { status: 500 });
    }

    const url = 'https://api.sunoapi.org/api/v1/generate';
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sunoApiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        style,
        title,
        customMode,
        instrumental,
        model,
        negativeTags,
        vocalGender,
        styleWeight,
        weirdnessConstraint,
        audioWeight,
        callBackUrl: finalCallbackUrl
      })
    };

    console.log("🎵 Calling Suno API...");
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    console.log("📡 Suno API response:", data);

    if (!response.ok) {
      throw new Error(`Suno API error: ${response.status} - ${data.message || 'Unknown error'}`);
    }

    return NextResponse.json({
      success: true,
      data
    } as SunoAPIResponse);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error("❌ Error in Suno API:", error);
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}