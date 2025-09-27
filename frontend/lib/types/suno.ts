export interface SunoGenerateRequest {
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

export interface SunoGenerateResponse {
  success: boolean;
  data?: SunoTrackData;
  error?: string;
}

export interface SunoTrackData {
  id?: string;
  title?: string;
  audio_url?: string;
  video_url?: string;
  image_url?: string;
  lyric?: string;
  created_at?: string;
  model_name?: string;
  status?: string;
  gpt_description_prompt?: string;
  prompt?: string;
  type?: string;
  tags?: string;
}