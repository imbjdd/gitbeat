export interface Song {
  id: string;
  repository_id: string;
  audio_url?: string;
  lyrics_url?: string;
  created_at: string;
  updated_at: string;
  upvote_count: number;
  repository: {
    id: string;
    name: string;
    url: string;
    created_at: string;
    updated_at: string;
  };
  title?: string; // For display purposes
  isPlaying?: boolean;
}

export type ActiveTab = 'beats' | 'repo';
export type AnalysisTone = 'fun' | 'serious';
