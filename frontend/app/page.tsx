"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, ArrowUp, Music } from "lucide-react";

interface Song {
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

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [lyrics, setLyrics] = useState("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [recentlyUpvoted, setRecentlyUpvoted] = useState<Set<string>>(new Set());
  const [rankingChanges, setRankingChanges] = useState<Set<string>>(new Set());
  const [rankingDirections, setRankingDirections] = useState<{[key: string]: 'up' | 'down'}>({});
  const previousRankingsRef = useRef<{[key: string]: number}>({});

  // Fetch songs on component mount
  useEffect(() => {
    fetchSongs();
  }, []);

  // Clean up audio when component unmounts
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
      }
    };
  }, [currentAudio]);

  // Track ranking changes and trigger animations
  useEffect(() => {
    if (songs.length === 0) return;

    const sortedSongs = [...songs].sort((a, b) => b.upvote_count - a.upvote_count);
    const currentRankings: {[key: string]: number} = {};
    const changedSongs = new Set<string>();
    const newDirections: {[key: string]: 'up' | 'down'} = {};
    const previousRankings = previousRankingsRef.current;

    sortedSongs.forEach((song, index) => {
      currentRankings[song.id] = index;
      
      // Check if this song's ranking changed
      if (previousRankings[song.id] !== undefined && previousRankings[song.id] !== index) {
        changedSongs.add(song.id);
        // Determine direction (lower index = higher rank = moved up)
        newDirections[song.id] = previousRankings[song.id] > index ? 'up' : 'down';
      }
    });

    // Update rankings and trigger animations for changed songs
    if (Object.keys(previousRankings).length > 0 && changedSongs.size > 0) {
      setRankingChanges(changedSongs);
      setRankingDirections(newDirections);
      
      // Clear animation state after animation completes
      setTimeout(() => {
        setRankingChanges(new Set());
        setRankingDirections({});
      }, 800);
    }

    // Update the ref with current rankings
    previousRankingsRef.current = currentRankings;
  }, [songs]); // Only depend on songs, not previousRankings

  const fetchSongs = async () => {
    try {
      const response = await fetch('/api/songs');
      const data = await response.json();
      
      if (data.success) {
        setSongs(data.songs);
      } else {
        console.error('Failed to fetch songs:', data.error);
      }
    } catch (error) {
      console.error('Error fetching songs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim() || !title.trim() || !audioFile || submitting) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('repoUrl', repoUrl);
      formData.append('title', title);
      formData.append('audioFile', audioFile);
      if (lyrics.trim()) {
        formData.append('lyrics', lyrics);
      }

      const response = await fetch('/api/songs/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        // Add the new song to the beginning of the list
        setSongs([data.song, ...songs]);
        setRepoUrl("");
        setTitle("");
        setAudioFile(null);
        setLyrics("");
        // Reset file input
        const fileInput = document.getElementById('audioFile') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        console.error('Failed to create song:', data.error);
        alert(`Failed to create song: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating song:', error);
      alert('Error creating song. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const togglePlay = (id: string) => {
    const song = songs.find(s => s.id === id);
    if (!song?.audio_url) {
      alert('No audio file available for this song');
      return;
    }

    // Stop current audio if playing
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
    }

    // If same song, just stop
    if (playingId === id) {
      setPlayingId(null);
      return;
    }

    // Play new song
    const audio = new Audio(song.audio_url);
    audio.addEventListener('ended', () => {
      setPlayingId(null);
      setCurrentAudio(null);
    });
    
    audio.play().then(() => {
      setPlayingId(id);
      setCurrentAudio(audio);
    }).catch((error) => {
      console.error('Error playing audio:', error);
      alert('Error playing audio file');
    });
  };

  const handleUpvote = async (id: string) => {
    // Add visual feedback immediately
    setRecentlyUpvoted(prev => new Set(prev).add(id));
    
    // Remove visual feedback after animation
    setTimeout(() => {
      setRecentlyUpvoted(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }, 600);

    // Update UI immediately - this is the only UI update
    setSongs(prevSongs => 
      prevSongs.map(song => 
        song.id === id 
          ? { ...song, upvote_count: song.upvote_count + 1 }
          : song
      )
    );

    // Update database in background (fire and forget)
    fetch(`/api/songs/${id}/upvote`, {
      method: 'POST',
    }).catch(error => {
      // Silent error - don't revert UI, just log
      console.error('Background upvote failed:', error);
    });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent hover:from-orange-400 hover:to-fuchsia-400 transition-all duration-500 cursor-pointer drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]">gitbeat 🎧</h1>
        </div>

        {/* Song Upload Section */}
        <div className="my-24">
          <div className="text-center mb-6">
            <h2 className="text-5xl font-bold mb-2 bg-emerald-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(16,185,129,0.6)] flex items-center justify-center gap-3">Upload your <span className="bg-emerald-300 text-black px-2 py-1 rounded">beats</span> <Music className="text-emerald-300 drop-shadow-[0_0_15px_rgba(110,231,183,0.8)]" size={48} /></h2>
            <p className="text-slate-400 text-sm">Upload your song with GitHub repository info</p>
          </div>
          
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-4">
            {/* Repository URL */}
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/username/repository"
              required
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:shadow-lg focus:shadow-emerald-400/50 hover:bg-slate-800 transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
            />
            
            {/* Song Title */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Song title"
              required
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:shadow-lg focus:shadow-emerald-400/50 hover:bg-slate-800 transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
            />
            
            {/* Audio File */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">Audio File (required)</label>
              <input
                type="file"
                id="audioFile"
                accept="audio/*"
                onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                required
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-emerald-300 file:text-black hover:file:bg-emerald-400 focus:outline-none focus:border-emerald-400 transition-all duration-300"
              />
            </div>
            
            {/* Lyrics (Optional) */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">Lyrics (optional)</label>
              <textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder="Enter song lyrics..."
                rows={4}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:shadow-lg focus:shadow-emerald-400/50 hover:bg-slate-800 transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.1)] resize-vertical"
              />
            </div>
            
            <button
              type="submit"
              disabled={submitting || !repoUrl.trim() || !title.trim() || !audioFile}
              className="w-full px-8 py-3 bg-emerald-300 text-black font-semibold rounded-md hover:bg-emerald-400 hover:scale-105 hover:shadow-lg hover:shadow-emerald-400/50 transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {submitting ? 'Uploading...' : 'Upload Song'}
            </button>
          </form>
        </div>

        {/* Leaderboard Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Leaderboard</h2>
            <div className="text-sm text-gray-400">{songs.length} beats generated</div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-2">Loading beats...</div>
            </div>
          ) : (
            <>
              {/* Leaderboard List */}
              <div className="space-y-3 transition-all duration-300">
                {songs
                  .sort((a, b) => b.upvote_count - a.upvote_count) // Sort by upvotes descending
                  .map((song, index) => (
                  <div
                    key={song.id}
                    className={`p-4 rounded-lg transition-all duration-500 hover:shadow-xl transform ${
                      rankingChanges.has(song.id) 
                        ? 'animate-pulse scale-105 ring-2 ring-emerald-400/50' // Animation for ranking change
                        : ''
                    } ${
                      index === 0 
                        ? 'bg-gradient-to-r from-yellow-900/30 to-[#1C2530] border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.2)]' // 1st place
                        : index === 1
                        ? 'bg-gradient-to-r from-gray-800/30 to-[#1C2530] border-gray-400/50 shadow-[0_0_25px_rgba(156,163,175,0.15)]' // 2nd place
                        : index === 2  
                        ? 'bg-gradient-to-r from-amber-900/30 to-[#1C2530] border-amber-600/50 shadow-[0_0_25px_rgba(217,119,6,0.15)]' // 3rd place
                        : 'bg-[#1C2530] hover:bg-slate-800 border-slate-600 hover:border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.1)]' // Other ranks
                    } hover:shadow-emerald-500/20 border`}
                    style={{
                      transitionProperty: 'all, transform, box-shadow',
                      transitionDuration: '800ms',
                      transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    <div className="flex items-center">
                      {/* Rank */}
                      <div className="relative">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all duration-500 ${
                          rankingChanges.has(song.id) 
                            ? 'animate-bounce scale-125' // Extra animation for rank change
                            : ''
                        } ${
                          index === 0 
                            ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/50' // 1st place
                            : index === 1
                            ? 'bg-gray-400 text-black shadow-lg shadow-gray-400/50' // 2nd place  
                            : index === 2
                            ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/50' // 3rd place
                            : 'text-white' // Other ranks
                        }`}>
                          {index + 1}
                        </div>
                        
                        {/* Ranking direction indicator */}
                        {rankingChanges.has(song.id) && rankingDirections[song.id] && (
                          <div className={`absolute -top-2 -right-2 w-4 h-4 rounded-full flex items-center justify-center text-xs animate-ping ${
                            rankingDirections[song.id] === 'up' 
                              ? 'bg-green-500 text-white' 
                              : 'bg-red-500 text-white'
                          }`}>
                            {rankingDirections[song.id] === 'up' ? '↑' : '↓'}
                          </div>
                        )}
                      </div>

                      {/* Song info */}
                      <div className="flex items-center gap-3 ml-4 min-w-[200px]">
                        <div>
                          <div className="font-semibold text-white hover:text-emerald-400 transition-colors drop-shadow-[0_0_5px_rgba(16,185,129,0.3)]">
                            {song.title || `${song.repository.name} Beat`}
                          </div>
                          <a
                            href={song.repository.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-slate-400 hover:text-emerald-400 transition-colors hover:drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]"
                          >
                            {song.repository.url.replace('https://github.com/', '')}
                          </a>
                          {song.lyrics_url && (
                            <a
                              href={song.lyrics_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-xs text-violet-400 hover:text-violet-300 transition-colors"
                            >
                              View Lyrics
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-8 ml-8 min-w-[200px]">
                        <div className="text-center">
                          <div className={`text-lg font-bold text-white hover:text-violet-300 transition-all duration-300 drop-shadow-[0_0_8px_rgba(139,92,246,0.6)] ${
                            recentlyUpvoted.has(song.id) ? 'scale-125 text-violet-300' : ''
                          }`}>
                            {song.upvote_count}
                          </div>
                          <div className="text-xs text-slate-400">upvotes</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-emerald-400 hover:text-emerald-300 transition-colors drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]">
                            {song.audio_url ? '🎵' : '⏳'}
                          </div>
                          <div className="text-xs text-slate-400">audio</div>
                        </div>
                      </div>

                  {/* Progress bar */}
                  <div className="flex-1 mx-8">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>popularity</span>
                      <span>{Math.floor(Math.random() * 100)}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-lg h-2 overflow-hidden shadow-inner">
                      <div 
                        className="bg-emerald-300 h-2 rounded-lg hover:from-fuchsia-500 hover:to-violet-500 transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                        style={{ width: `${Math.floor(Math.random() * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                      {/* Play button */}
                      <button
                        onClick={() => togglePlay(song.id)}
                        className="w-10 h-10 text-white rounded-md hover:bg-emerald-400 hover:scale-105 transition-all duration-300 mr-3 flex items-center justify-center "
                      >
                        {playingId === song.id ? (
                          <Pause size={16} />
                        ) : (
                          <Play size={16} />
                        )}
                      </button>
                    
                      {/* Upvote button */}
                      <button
                        onClick={() => handleUpvote(song.id)}
                        className={`w-10 h-10 text-black rounded-md transition-all duration-300 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.3)] ${
                          recentlyUpvoted.has(song.id)
                            ? 'bg-violet-400 scale-110 shadow-lg shadow-violet-500/50 animate-pulse'
                            : 'bg-emerald-300 hover:bg-violet-400 hover:scale-105 hover:shadow-lg hover:shadow-violet-500/50'
                        }`}
                      >
                        <ArrowUp size={16} className={recentlyUpvoted.has(song.id) ? 'animate-bounce' : ''} />
                      </button>

                    </div>

                    {/* Playing indicator */}
                    {playingId === song.id && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <div className="text-xs text-emerald-400 mb-2 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]">♪ playing beat... 🔥🎵💯</div>
                    <div className="w-full bg-slate-700 rounded-lg h-1 overflow-hidden shadow-inner">
                      <div className="bg-gradient-to-r from-emerald-500 via-cyan-500 to-violet-500 h-1 rounded-lg w-1/3 shadow-[0_0_15px_rgba(16,185,129,0.7)]"></div>
                    </div>
                  </div>
                    )}
                  </div>
                ))}
              </div>

              {songs.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-lg mb-2">No beats generated yet</div>
                  <div className="text-gray-400 text-sm">Add your first GitHub repo above to get started!</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
