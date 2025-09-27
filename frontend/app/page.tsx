"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, ArrowUp, Music } from "lucide-react";
import { analyzeGitHubRepository, RepositoryAnalysis } from "@/lib/github-analysis";

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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'beats' | 'repo'>('beats');
  const [githubRepoUrl, setGithubRepoUrl] = useState("");
  const [repoData, setRepoData] = useState<RepositoryAnalysis | null>(null);
  const [repoLoading, setRepoLoading] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

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

    // If same song is playing, pause/resume
    if (playingId === id && currentAudio) {
      if (isPlaying) {
        currentAudio.pause();
        setIsPlaying(false);
      } else {
        currentAudio.play().then(() => {
          setIsPlaying(true);
        }).catch((error) => {
          console.error('Error resuming audio:', error);
          alert('Error playing audio file');
        });
      }
      return;
    }

    // Stop current audio if playing different song
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
      setPlayingId(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }

    // Play new song
    const audio = new Audio(song.audio_url);
    
    // Set up event listeners
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener('ended', () => {
      setPlayingId(null);
      setCurrentAudio(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    });

    audio.addEventListener('pause', () => {
      setIsPlaying(false);
    });

    audio.addEventListener('play', () => {
      setIsPlaying(true);
    });
    
    audio.play().then(() => {
      setPlayingId(id);
      setCurrentAudio(audio);
      setIsPlaying(true);
    }).catch((error) => {
      console.error('Error playing audio:', error);
      alert('Error playing audio file');
    });
  };

  // Function to seek to a specific time
  const seekTo = (time: number) => {
    if (currentAudio) {
      currentAudio.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Format time in MM:SS format
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle GitHub repository analysis
  const handleRepoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubRepoUrl.trim()) return;
    
    setRepoLoading(true);
    setAiAnalyzing(false);
    try {
      const analysis = await analyzeGitHubRepository(githubRepoUrl.trim(), setAiAnalyzing);
      setRepoData(analysis);
    } catch (error) {
      console.error('Error analyzing repository:', error);
      alert('Failed to analyze GitHub repository. Please check the URL.');
    } finally {
      setRepoLoading(false);
      setAiAnalyzing(false);
    }
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

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-600">
            <button
              onClick={() => setActiveTab('beats')}
              className={`px-6 py-2 rounded-md font-medium transition-all duration-300 hover:cursor-pointer ${
                activeTab === 'beats'
                  ? 'bg-emerald-300 text-black shadow-lg shadow-emerald-300/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Beats
            </button>
            <button
              onClick={() => setActiveTab('repo')}
              className={`px-6 py-2 rounded-md font-medium transition-all duration-300 hover:cursor-pointer ${
                activeTab === 'repo'
                  ? 'bg-yellow-200 text-black shadow-lg shadow-yellow-200/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Repository Analysis
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'beats' ? (
          <>
            {/* Song Upload Section */}
        <div className="my-24">
          <div className="text-center mb-6">
            <h2 className="text-5xl font-bold mb-2 bg-emerald-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(16,185,129,0.6)] flex items-center justify-center gap-3">Turn your GitHub repo into <span className="bg-emerald-300 text-black px-2 py-1 rounded">beats</span> <Music className="text-emerald-300 drop-shadow-[0_0_15px_rgba(110,231,183,0.8)]" size={48} /></h2>
                <p className="text-slate-400 text-sm">Paste your GitHub repository URL to generate music</p>
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
                  className="w-full px-8 py-3 bg-emerald-300 text-black font-semibold rounded-md hover:bg-emerald-400 hover:scale-105 hover:shadow-lg hover:shadow-emerald-400/50 transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 hover:cursor-pointer"
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
                          <span>{(() => {
                            const maxUpvotes = Math.max(...songs.map(s => s.upvote_count), 1);
                            const percentage = Math.round((song.upvote_count / maxUpvotes) * 100);
                            return `${percentage}%`;
                          })()}</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-lg h-2 overflow-hidden shadow-inner">
                      <div 
                        className="bg-emerald-300 h-2 rounded-lg hover:from-fuchsia-500 hover:to-violet-500 transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                            style={{ 
                              width: `${(() => {
                                const maxUpvotes = Math.max(...songs.map(s => s.upvote_count), 1);
                                return Math.round((song.upvote_count / maxUpvotes) * 100);
                              })()}%` 
                            }}
                      ></div>
                    </div>
                  </div>

                  {/* Play button */}
                  <button
                        onClick={() => togglePlay(song.id)}
                        className="hover:cursor-pointer w-10 h-10 text-white rounded-md hover:bg-emerald-400 hover:scale-105 transition-all duration-300 mr-3 flex items-center justify-center "
                  >
                        {playingId === song.id && isPlaying ? (
                      <Pause size={16} />
                    ) : (
                      <Play size={16} />
                    )}
                  </button>
                
                  {/* Upvote button */}
                  <button
                        onClick={() => handleUpvote(song.id)}
                        className={`hover:cursor-pointer w-10 h-10 text-black rounded-md transition-all duration-300 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.3)] ${
                          recentlyUpvoted.has(song.id)
                            ? 'bg-violet-400 scale-110 shadow-lg shadow-violet-500/50 animate-pulse'
                            : 'bg-emerald-300 hover:bg-violet-400 hover:scale-105 hover:shadow-lg hover:shadow-violet-500/50'
                        }`}
                      >
                        <ArrowUp size={16} className={recentlyUpvoted.has(song.id) ? 'animate-bounce' : ''} />
                  </button>

                </div>

                    {/* Enhanced Playing indicator with controls */}
                    {playingId === song.id && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]">
                            {isPlaying ? '♪ playing beat...' : 'paused'}
                          </div>
                          <div className="text-xs text-slate-400">
                            {formatTime(currentTime)} / {formatTime(duration)}
                          </div>
                        </div>
                        
                        {/* Seekable progress bar */}
                        <div 
                          className="w-full bg-slate-700 rounded-lg h-2 overflow-hidden shadow-inner cursor-pointer relative group"
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickX = e.clientX - rect.left;
                            const width = rect.width;
                            const newTime = (clickX / width) * duration;
                            seekTo(newTime);
                          }}
                        >
                          {/* Progress bar */}
                          <div 
                            className="bg-gradient-to-r bg-emerald-300 h-2 rounded-lg transition-all duration-100 shadow-[0_0_15px_rgba(16,185,129,0.7)]"
                            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                          ></div>
                          
                          {/* Hover indicator */}
                          <div 
                            className="absolute top-0 h-2 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                            style={{ 
                              left: '0px',
                              width: '2px',
                              transform: 'translateX(var(--mouse-x, 0px))'
                            }}
                          ></div>
                        </div>
                        
                        {/* Playback controls */}
                        <div className="flex items-center justify-center mt-3 gap-2">
                          <button
                            onClick={() => togglePlay(song.id)}
                            className="w-8 h-8 bg-emerald-400 text-black rounded-full hover:bg-emerald-300 transition-all duration-200 flex items-center justify-center hover:scale-110 hover:cursor-pointer"
                          >
                            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                          </button>
                          
                          <div className="text-xs text-slate-400 ml-2">
                            Click on the progress bar to seek
                          </div>
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
          </>
        ) : (
          // Repository Analysis Tab
          <div className="space-y-8 my-24">
            {/* Repository Analysis Header */}
            <div className="text-center mb-8">
              <h2 className="text-5xl font-bold mb-2 text-yellow-200 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)] flex items-center justify-center gap-3">
                Analyze GitHub <span className="bg-yellow-200 text-black px-2 py-1 rounded">Repository</span> 
              </h2>
              <p className="text-slate-400 text-sm">Get insights into contributors, languages, and activity for any repository</p>
            </div>

            {/* Repository Search Form */}
            <div className="max-w-2xl mx-auto">
              <form onSubmit={handleRepoSubmit} className="flex gap-4">
                <input
                  type="url"
                  value={githubRepoUrl}
                  onChange={(e) => setGithubRepoUrl(e.target.value)}
                  placeholder="Enter GitHub repository URL (e.g., https://github.com/owner/repo)"
                  className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-yellow-200 focus:shadow-lg focus:shadow-yellow-200/50 hover:bg-slate-800 transition-all duration-300"
                  required
                />
                <button
                  type="submit"
                  disabled={repoLoading || !githubRepoUrl.trim()}
                  className="px-8 py-3 bg-yellow-200 text-black font-semibold rounded-md hover:bg-yellow-100 hover:scale-105 hover:shadow-lg hover:shadow-yellow-200/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 hover:cursor-pointer"
                >
                  {repoLoading ? 'Analyzing...' : 'Analyze Repository'}
                </button>
              </form>
            </div>

            {/* Repository Dashboard */}
            {repoData && (
              <div className="space-y-6">
                {/* Repository Header */}
                <div className="bg-slate-900 rounded-xl p-6 border border-slate-700 shadow-[0_0_20px_rgba(250,204,21,0.1)]">
                  <div className="flex items-center gap-6">
                    <img
                      src={repoData.repository.owner.avatar_url}
                      alt={repoData.repository.owner.login}
                      className="w-20 h-20 rounded-full border-2 border-yellow-200 shadow-lg"
                    />
                    <div>
                      <h3 className="text-2xl font-bold text-white">
                        {repoData.repository.name}
                      </h3>
                      <p className="text-yellow-200 font-medium">by @{repoData.repository.owner.login}</p>
                      {repoData.repository.description && (
                        <p className="text-slate-400 mt-2">{repoData.repository.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-sm text-slate-400">
                        <span>⭐ {repoData.repository.stargazers_count} stars</span>
                        <span>🍴 {repoData.repository.forks_count} forks</span>
                        <span>📅 Created {new Date(repoData.repository.created_at).getFullYear()}</span>
                        <a
                          href={repoData.repository.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-yellow-200 hover:text-yellow-100 transition-colors hover:cursor-pointer"
                        >
                          View Repository →
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-900 rounded-xl p-6 border border-slate-700 text-center">
                    <div className="text-3xl font-bold text-yellow-200 mb-2">
                      {repoData.stats.totalCommits}
                    </div>
                    <div className="text-slate-400 text-sm">Total Commits</div>
                  </div>
                  <div className="bg-slate-900 rounded-xl p-6 border border-slate-700 text-center">
                    <div className="text-3xl font-bold text-yellow-200 mb-2">
                      {repoData.stats.totalContributors}
                    </div>
                    <div className="text-slate-400 text-sm">Contributors</div>
                  </div>
                  <div className="bg-slate-900 rounded-xl p-6 border border-slate-700 text-center">
                    <div className="text-3xl font-bold text-yellow-200 mb-2">
                      {repoData.stats.topLanguage}
                    </div>
                    <div className="text-slate-400 text-sm">Top Language</div>
                  </div>
                  <div className="bg-slate-900 rounded-xl p-6 border border-slate-700 text-center">
                    <div className="text-3xl font-bold text-yellow-200 mb-2">
                      {Math.round(repoData.repository.size / 1024)} MB
                    </div>
                    <div className="text-slate-400 text-sm">Repository Size</div>
                  </div>
                </div>

                {/* Languages & Contributors */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Language Breakdown */}
                  <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
                    <h4 className="text-xl font-bold text-white mb-4">Language Breakdown</h4>
                    <div className="space-y-3">
                      {repoData.stats.languageBreakdown.length > 0 ? (
                        repoData.stats.languageBreakdown.map((lang, index) => (
                          <div key={lang.language} className="flex items-center justify-between">
                            <span className="text-slate-300">{lang.language}</span>
                            <div className="flex items-center gap-2">
                            <div className="w-24 bg-slate-700 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-yellow-200 h-2 rounded-full"
                                style={{
                                  width: `${lang.percentage}%`
                                }}
                              ></div>
                            </div>
                              <span className="text-slate-400 text-sm w-12">{lang.percentage}%</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-slate-400">
                          <div className="text-sm">Language data not available</div>
                          <div className="text-xs mt-1">Repository may not have detectable languages</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Top Contributors */}
                  <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
                    <h4 className="text-xl font-bold text-white mb-4">Top Contributors</h4>
                    <div className="space-y-3">
                      {repoData.stats.topContributors.length > 0 ? (
                        repoData.stats.topContributors.slice(0, 5).map((contributor, index) => (
                          <div key={contributor.user.login} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <img
                                src={contributor.user.avatar_url}
                                alt={contributor.user.login}
                                className="w-8 h-8 rounded-full border border-slate-600"
                              />
                              <span className="text-slate-300">{contributor.user.login}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <div className="text-sm text-white">{contributor.commits} commits</div>
                                <div className="text-xs text-slate-400">{contributor.percentage}%</div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-slate-400">
                          <div className="text-sm">Contributor statistics are being processed</div>
                          <div className="text-xs mt-1">This may take a few moments for large repositories</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                

                {/* AI Insights Section */}
                {repoData.aiInsights ? (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                      🤖 AI Team Analysis
                    </h3>
                    
                    {/* Team Dynamics & Project Health */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
                        <h4 className="text-xl font-bold text-yellow-200 mb-3">Team Dynamics</h4>
                        <p className="text-slate-300 text-sm leading-relaxed">
                          {repoData.aiInsights.teamDynamics}
                        </p>
                      </div>
                      <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
                        <h4 className="text-xl font-bold text-yellow-200 mb-3">Project Health</h4>
                        <p className="text-slate-300 text-sm leading-relaxed">
                          {repoData.aiInsights.projectHealth}
                        </p>
                      </div>
                    </div>

                    {/* Contributor Personalities */}
                    <div className="bg-slate-900 rounded-xl p-6 border border-slate-700">
                      <h4 className="text-xl font-bold text-yellow-200 mb-4">Contributor Personalities</h4>
                      <div className="space-y-6">
                        {repoData.aiInsights.contributorPersonalities.map((personality, index) => (
                          <div key={personality.user.login} className="bg-slate-800 rounded-lg p-4 border border-slate-600">
                            <div className="flex items-start gap-4">
                              <img
                                src={personality.user.avatar_url}
                                alt={personality.user.login}
                                className="w-12 h-12 rounded-full border-2 border-yellow-200 flex-shrink-0"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h5 className="text-lg font-semibold text-white">
                                    {personality.user.login}
                                  </h5>
                                  <span className="px-2 py-1 bg-yellow-200/20 text-yellow-200 text-xs rounded-full">
                                    {personality.workPattern}
                                  </span>
                                </div>
                                
                                <div className="space-y-3">
                                  <div>
                                    <span className="text-sm font-medium text-yellow-200">Working Style: </span>
                                    <span className="text-sm text-slate-300">{personality.workingStyle}</span>
                                  </div>
                                  
                                  <div>
                                    <span className="text-sm font-medium text-yellow-200">Personality: </span>
                                    <span className="text-sm text-slate-300">{personality.personality}</span>
                                  </div>
                                  
                                  <div>
                                    <span className="text-sm font-medium text-yellow-200">Collaboration: </span>
                                    <span className="text-sm text-slate-300">{personality.collaborationStyle}</span>
                                  </div>
                                  
                                  <div>
                                    <span className="text-sm font-medium text-yellow-200">Strengths: </span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {personality.strengths.map((strength, idx) => (
                                        <span
                                          key={idx}
                                          className="px-2 py-1 bg-yellow-200/20 text-yellow-200 text-xs rounded-full"
                                        >
                                          {strength}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : aiAnalyzing ? (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                      🤖 AI Team Analysis
                    </h3>
                    <div className="bg-slate-900 rounded-xl p-8 border border-slate-700 text-center">
                      <div className="animate-spin w-8 h-8 border-4 border-yellow-200 border-t-transparent rounded-full mx-auto mb-4"></div>
                      <p className="text-slate-300 text-sm">
                        AI is analyzing contributor patterns and team dynamics...
                      </p>
                      <p className="text-slate-400 text-xs mt-2">
                        This may take 10-30 seconds depending on repository complexity
                      </p>
                    </div>
                  </div>
                ) : repoData.stats.totalContributors > 0 ? (
                  <div className="space-y-6">
                    <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                      🤖 AI Team Analysis
                    </h3>
                    <div className="bg-slate-900 rounded-xl p-6 border border-slate-700 text-center">
                      <p className="text-slate-400 text-sm">
                        AI analysis requires OpenAI API key configuration
                      </p>
                      <p className="text-slate-500 text-xs mt-2">
                        Set OPENAI_API_KEY environment variable to enable personality insights
                      </p>
                    </div>
                  </div>
                ) : null}

            </div>
          )}

          
        </div>
        )}
      </div>
    </div>
  );
}
