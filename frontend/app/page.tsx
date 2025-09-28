"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, ArrowUp, Music } from "lucide-react";
import { analyzeGitHubRepository, RepositoryAnalysis } from "@/lib/github-analysis";
import { useSunoPolling } from "@/lib/hooks/useSunoPolling";

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
  const [dustAnalysis, setDustAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysisTone, setAnalysisTone] = useState<'fun' | 'serious'>('serious');

  // Suno polling hook for music generation
  const sunoPolling = useSunoPolling({
    onSuccess: async (data) => {
      if (data.response?.sunoData && data.response.sunoData.length > 0) {
        const sunoData = data.response.sunoData[0];
        
        // Get the repository URL from the input
        const repoInput = document.getElementById('dustRepoInput') as HTMLInputElement;
        const repoUrl = repoInput.value.trim();
        
        if (repoUrl) {
          try {
            const saveResponse = await fetch('/api/songs/ai-generated', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                repository_url: repoUrl,
                suno_response: sunoData,
                dust_analysis: dustAnalysis,
                title: sunoData.title || "Repository AI Beat"
              })
            });
            
            const saveData = await saveResponse.json();
            if (saveData.success) {
              setSongs([saveData.song, ...songs]);
              setIsAnalyzing(false); // Stop loading when music is completely generated and saved
            }
          } catch {
            // Silent error
            setIsAnalyzing(false); // Stop loading on error
          }
        }
      }
    },
    onError: () => {
      // Silent error
      setIsAnalyzing(false); // Stop loading on music generation error
    }
  });

  // Auto-generate music when dustAnalysis is available
  useEffect(() => {
    if (dustAnalysis && !isGenerating && !sunoPolling.isPolling) {
      const generateMusic = async () => {
        setIsGenerating(true);
        try {
          const response = await fetch('/api/suno/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: `${dustAnalysis} - Create a song with vocals about this repository`,
              style: "Electronic",
              title: "Repository Beat",
              model: "V5",
              instrumental: false
            })
          });
          
          const data = await response.json();
          if (data.data?.taskId) {
            // Start polling for the result
            sunoPolling.startPolling(data.data.taskId);
          }
        } catch {
          // Silent error
          setIsAnalyzing(false); // Stop loading on error
        } finally {
          setIsGenerating(false);
        }
      };

      generateMusic();
    }
  }, [dustAnalysis, isGenerating, sunoPolling]);

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
      const analysis = await analyzeGitHubRepository(githubRepoUrl.trim(), setAiAnalyzing, analysisTone);
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-center sm:justify-between mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent hover:from-orange-400 hover:to-fuchsia-400 transition-all duration-500 cursor-pointer drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]">gitbeat 🎧</h1>
        </div>



        {/* Tab Navigation */}
        <div className="flex justify-center mb-6 sm:mb-8 px-2">
          <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-600 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('beats')}
              className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 rounded-md font-medium text-sm sm:text-base transition-all duration-300 hover:cursor-pointer ${
                activeTab === 'beats'
                  ? 'bg-emerald-300 text-black shadow-lg shadow-emerald-300/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              Beats
            </button>
            <button
              onClick={() => setActiveTab('repo')}
              className={`flex-1 sm:flex-none px-3 sm:px-6 py-2 rounded-md font-medium text-sm sm:text-base transition-all duration-300 hover:cursor-pointer ${
                activeTab === 'repo'
                  ? 'bg-yellow-200 text-black shadow-lg shadow-yellow-200/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <span className="hidden sm:inline">Repository Analysis</span>
              <span className="sm:hidden">Analysis</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'beats' ? (
          <>
            {/* Song Upload Section */}
        <div className="my-12 sm:my-24">
          <div className="text-center mb-6 px-4">
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-2 bg-emerald-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(16,185,129,0.6)] flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
              <span className="flex items-center gap-2">Turn your GitHub repo into</span>
              <span className="flex items-center gap-2">
                <span className="bg-emerald-300 text-black px-2 py-1 rounded text-xl sm:text-2xl lg:text-5xl">beats</span> 
                <Music className="text-emerald-300 drop-shadow-[0_0_15px_rgba(110,231,183,0.8)]" size={32} />
              </span>
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">Paste your GitHub repository URL to generate music</p>
          </div>
          
              <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-4">
       
          <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3 px-4">
            <input
              type="url"
              placeholder="https://github.com/username/repository"
              className="flex-1 px-3 sm:px-4 py-3 bg-slate-800 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:shadow-lg focus:shadow-violet-400/50 hover:bg-slate-700 transition-all duration-300 text-sm sm:text-base"
              id="dustRepoInput"
            />
            <button
              onClick={async () => {
                const input = document.getElementById('dustRepoInput') as HTMLInputElement;
                const repoUrl = input.value.trim();
                if (!repoUrl) return;
                
                setIsAnalyzing(true);
                try {
                  const response = await fetch('/api/dust/conversation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      message: `Analyze this repository: ${repoUrl}`,
                      github_repo: repoUrl
                    })
                  });
                  
                  const data = await response.json();
                  if (!data.error) {
                    setDustAnalysis(data.content || "");
                    // Don't set isAnalyzing to false here - let it continue during music generation
                  }
                } catch {
                  // Silent error
                  setIsAnalyzing(false);
                }
              }}
              disabled={isAnalyzing}
              className="px-4 sm:px-6 py-3 bg-green-300 text-black font-semibold rounded-md hover:bg-violet-600 hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(139,92,246,0.4)] disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base w-full sm:w-auto"
            >
              {isAnalyzing ? 'Loading...' : 'Analyze'}
            </button>
          </div>
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
                    className={`p-3 sm:p-4 rounded-lg transition-all duration-500 hover:shadow-xl transform ${
                      rankingChanges.has(song.id) 
                        ? 'animate-pulse scale-105 ring-2 ring-emerald-400/50' // Animation for ranking change
                        : ''
                    } ${
                        'bg-[#1C2530] hover:bg-slate-800 border-slate-600 hover:border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.1)]' // Other ranks
                    } hover:shadow-emerald-500/20 border`}
                    style={{
                      transitionProperty: 'all, transform, box-shadow',
                      transitionDuration: '800ms',
                      transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
              >
                {/* Mobile Layout */}
                <div className="block sm:hidden">
                  {/* Top row: Rank, Title, Actions */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Rank */}
                      <div className="relative flex-shrink-0">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                          rankingChanges.has(song.id) 
                            ? 'animate-bounce scale-125' 
                            : ''
                        } ${
                          index === 0 
                            ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/50'
                            : index === 1
                            ? 'bg-gray-400 text-black shadow-lg shadow-gray-400/50'
                            : index === 2
                            ? 'bg-amber-600 text-black shadow-lg shadow-amber-600/50'
                            : 'text-white'
                        }`}>
                          {index + 1}
                        </div>
                        {rankingChanges.has(song.id) && rankingDirections[song.id] && (
                          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center text-xs animate-ping ${
                            rankingDirections[song.id] === 'up' 
                              ? 'bg-green-500 text-white' 
                              : 'bg-red-500 text-white'
                          }`}>
                            {rankingDirections[song.id] === 'up' ? '↑' : '↓'}
                          </div>
                        )}
                      </div>
                      
                      {/* Song info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white hover:text-emerald-400 transition-colors drop-shadow-[0_0_5px_rgba(16,185,129,0.3)] text-sm truncate">
                          {song.title || `${song.repository.name} Beat`}
                        </div>
                        <a
                          href={song.repository.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-slate-400 hover:text-emerald-400 transition-colors hover:drop-shadow-[0_0_5px_rgba(16,185,129,0.5)] block truncate"
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
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => togglePlay(song.id)}
                        className="hover:cursor-pointer w-8 h-8 text-white rounded-md hover:bg-emerald-400 hover:scale-105 transition-all duration-300 flex items-center justify-center"
                      >
                        {playingId === song.id && isPlaying ? (
                          <Pause size={14} />
                        ) : (
                          <Play size={14} />
                        )}
                      </button>
                      <button
                        onClick={() => handleUpvote(song.id)}
                        className={`hover:cursor-pointer w-8 h-8 text-black rounded-md transition-all duration-300 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.3)] ${
                          recentlyUpvoted.has(song.id)
                            ? 'bg-violet-400 scale-110 shadow-lg shadow-violet-500/50 animate-pulse'
                            : 'bg-emerald-300 hover:bg-violet-400 hover:scale-105 hover:shadow-lg hover:shadow-violet-500/50'
                        }`}
                      >
                        <ArrowUp size={14} className={recentlyUpvoted.has(song.id) ? 'animate-bounce' : ''} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Bottom row: Stats */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className={`text-sm font-bold text-white hover:text-violet-300 transition-all duration-300 drop-shadow-[0_0_8px_rgba(139,92,246,0.6)] ${
                          recentlyUpvoted.has(song.id) ? 'scale-125 text-violet-300' : ''
                        }`}>
                          {song.upvote_count}
                        </div>
                        <div className="text-xs text-slate-400">upvotes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]">
                          {song.audio_url ? '🎵' : '⏳'}
                        </div>
                        <div className="text-xs text-slate-400">audio</div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-300">
                        {(() => {
                          const maxUpvotes = Math.max(...songs.map(s => s.upvote_count), 1);
                          const percentage = Math.round((song.upvote_count / maxUpvotes) * 100);
                          return `${percentage}%`;
                        })()}
                      </div>
                      <div className="text-xs text-slate-400">popularity</div>
                    </div>
                  </div>
                </div>

                {/* Desktop Layout */}
                <div className="hidden sm:flex items-center">
                  {/* Rank */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all duration-500 ${
                      rankingChanges.has(song.id) 
                        ? 'animate-bounce scale-125'
                        : ''
                    } ${
                      index === 0 
                        ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/50'
                        : index === 1
                        ? 'bg-gray-400 text-black shadow-lg shadow-gray-400/50'
                        : index === 2
                        ? 'bg-amber-600 text-black shadow-lg shadow-amber-600/50'
                        : 'text-white'
                    }`}>
                      {index + 1}
                    </div>
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
                  <div className="flex items-center gap-4 lg:gap-8 ml-4 lg:ml-8">
                    <div className="text-center">
                      <div className={`text-sm lg:text-lg font-bold text-white hover:text-violet-300 transition-all duration-300 drop-shadow-[0_0_8px_rgba(139,92,246,0.6)] ${
                        recentlyUpvoted.has(song.id) ? 'scale-125 text-violet-300' : ''
                      }`}>
                        {song.upvote_count}
                      </div>
                      <div className="text-xs text-slate-400">upvotes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm lg:text-lg font-bold text-emerald-400 hover:text-emerald-300 transition-colors drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]">
                        {song.audio_url ? '🎵' : '⏳'}
                      </div>
                      <div className="text-xs text-slate-400">audio</div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="flex-1 mx-4 lg:mx-8 min-w-[100px]">
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

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => togglePlay(song.id)}
                      className="hover:cursor-pointer w-10 h-10 text-white rounded-md hover:bg-emerald-400 hover:scale-105 transition-all duration-300 flex items-center justify-center"
                    >
                      {playingId === song.id && isPlaying ? (
                        <Pause size={16} />
                      ) : (
                        <Play size={16} />
                      )}
                    </button>
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
          <div className="space-y-6 sm:space-y-8 my-12 sm:my-24 px-2 sm:px-0">
            {/* Repository Analysis Header */}
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-2 text-yellow-200 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)] flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
                <span>Analyze GitHub</span>
                <span className="bg-yellow-200 text-black px-2 py-1 rounded text-xl sm:text-2xl lg:text-5xl">Repository</span> 
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm px-4">Get insights into contributors, languages, and activity for any repository</p>
            </div>

            {/* Analysis Mode Toggle */}
            <div className="max-w-2xl mx-auto px-4 mb-6">
              <div className="flex items-center justify-center gap-4">
                <span className="text-slate-400 text-sm">Analysis Style:</span>
                <div className="flex items-center gap-3">
                <span className={`text-sm transition-colors ${analysisTone === 'fun' ? 'text-slate-400' : 'text-yellow-200 font-medium'}`}>
                  Professional
                  </span>
                 
                  <button
                    onClick={() => setAnalysisTone(analysisTone === 'fun' ? 'serious' : 'fun')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-200 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                      analysisTone === 'fun' ? 'bg-yellow-200' : 'bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        analysisTone === 'fun' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className={`text-sm transition-colors ${analysisTone === 'serious' ? 'text-slate-400' : 'text-yellow-200 font-medium'}`}>
                    Fun
                  </span>
                </div>
              </div>
              <p className="text-center text-xs text-slate-500 mt-2">
                {analysisTone === 'fun' 
                  ? 'Get a playful, creative analysis with personality insights' 
                  : 'Get a professional, data-focused analysis'
                }
              </p>
            </div>

            {/* Repository Search Form */}
            <div className="max-w-2xl mx-auto px-4">
              <form onSubmit={handleRepoSubmit} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <input
                  type="url"
                  value={githubRepoUrl}
                  onChange={(e) => setGithubRepoUrl(e.target.value)}
                  placeholder="Enter GitHub repository URL (e.g., https://github.com/owner/repo)"
                  className="flex-1 px-3 sm:px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-yellow-200 focus:shadow-lg focus:shadow-yellow-200/50 hover:bg-slate-800 transition-all duration-300 text-sm sm:text-base"
                  required
                />
                <button
                  type="submit"
                  disabled={repoLoading || !githubRepoUrl.trim()}
                  className="px-4 sm:px-8 py-3 bg-yellow-200 text-black font-semibold rounded-md hover:bg-yellow-100 hover:scale-105 hover:shadow-lg hover:shadow-yellow-200/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 hover:cursor-pointer text-sm sm:text-base w-full sm:w-auto"
                >
                  {repoLoading ? 'Analyzing...' : 'Analyze Repository'}
                </button>
              </form>
            </div>

            {/* Repository Dashboard */}
            {repoData && (
              <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
                {/* Repository Header */}
                <div className="bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-700 shadow-[0_0_20px_rgba(250,204,21,0.1)]">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                    <img
                      src={repoData.repository.owner.avatar_url}
                      alt={repoData.repository.owner.login}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-yellow-200 shadow-lg flex-shrink-0"
                    />
                    <div className="text-center sm:text-left flex-1">
                      <h3 className="text-xl sm:text-2xl font-bold text-white">
                        {repoData.repository.name}
                      </h3>
                      <p className="text-yellow-200 font-medium">by @{repoData.repository.owner.login}</p>
                      {repoData.repository.description && (
                        <p className="text-slate-400 mt-2 text-sm sm:text-base">{repoData.repository.description}</p>
                      )}
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-4 mt-3 text-xs sm:text-sm text-slate-400">
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
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-700 text-center">
                    <div className="text-xl sm:text-3xl font-bold text-yellow-200 mb-1 sm:mb-2">
                      {repoData.stats.totalCommits}
                    </div>
                    <div className="text-slate-400 text-xs sm:text-sm">Total Commits</div>
                  </div>
                  <div className="bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-700 text-center">
                    <div className="text-xl sm:text-3xl font-bold text-yellow-200 mb-1 sm:mb-2">
                      {repoData.stats.totalContributors}
                    </div>
                    <div className="text-slate-400 text-xs sm:text-sm">Contributors</div>
                  </div>
                  <div className="bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-700 text-center">
                    <div className="text-xl sm:text-3xl font-bold text-yellow-200 mb-1 sm:mb-2">
                      {repoData.stats.topLanguage}
                    </div>
                    <div className="text-slate-400 text-xs sm:text-sm">Top Language</div>
                  </div>
                  <div className="bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-700 text-center">
                    <div className="text-xl sm:text-3xl font-bold text-yellow-200 mb-1 sm:mb-2">
                      {Math.round(repoData.repository.size / 1024)} MB
                    </div>
                    <div className="text-slate-400 text-xs sm:text-sm">Repository Size</div>
                  </div>
                </div>

                {/* Languages & Contributors */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* Language Breakdown */}
                  <div className="bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-700">
                    <h4 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Language Breakdown</h4>
                    <div className="space-y-3">
                      {repoData.stats.languageBreakdown.length > 0 ? (
                        repoData.stats.languageBreakdown.map((lang) => (
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
                  <div className="bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-700">
                    <h4 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Top Contributors</h4>
                    <div className="space-y-3">
                      {repoData.stats.topContributors.length > 0 ? (
                        repoData.stats.topContributors.slice(0, 5).map((contributor) => (
                          <div key={contributor.user.login} className="flex items-center justify-between">
                            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                              <img
                                src={contributor.user.avatar_url}
                                alt={contributor.user.login}
                                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-slate-600 flex-shrink-0"
                              />
                              <span className="text-slate-300 text-sm sm:text-base truncate">{contributor.user.login}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <div className="text-right">
                                <div className="text-xs sm:text-sm text-white">{contributor.commits} commits</div>
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
                  <div className="space-y-4 sm:space-y-6">
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
                      🤖 AI Team Analysis
                    </h3>
                    
                    {/* Team Dynamics & Project Health */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                      <div className="bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-700">
                        <h4 className="text-lg sm:text-xl font-bold text-yellow-200 mb-2 sm:mb-3">Team Dynamics</h4>
                        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                          {repoData.aiInsights.teamDynamics}
                        </p>
                      </div>
                      <div className="bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-700">
                        <h4 className="text-lg sm:text-xl font-bold text-yellow-200 mb-2 sm:mb-3">Project Health</h4>
                        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                          {repoData.aiInsights.projectHealth}
                        </p>
                      </div>
                    </div>

                    {/* Contributor Personalities */}
                    <div className="bg-slate-900 rounded-xl p-4 sm:p-6 border border-slate-700">
                      <h4 className="text-lg sm:text-xl font-bold text-yellow-200 mb-3 sm:mb-4">Contributor Personalities</h4>
                      <div className="space-y-4 sm:space-y-6">
                        {repoData.aiInsights.contributorPersonalities.map((personality) => (
                          <div key={personality.user.login} className="bg-slate-800 rounded-lg p-3 sm:p-4 border border-slate-600">
                            <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                              <img
                                src={personality.user.avatar_url}
                                alt={personality.user.login}
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-yellow-200 flex-shrink-0 self-center sm:self-start"
                              />
                              <div className="flex-1 w-full">
                                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 mb-2 sm:mb-2">
                                  <h5 className="text-base sm:text-lg font-semibold text-white text-center sm:text-left">
                                    {personality.user.login}
                                  </h5>
                                  <span className="px-2 py-1 bg-yellow-200/20 text-yellow-200 text-xs rounded-full">
                                    {personality.workPattern}
                                  </span>
                                </div>
                                
                                <div className="space-y-2 sm:space-y-3 text-center sm:text-left">
                                  <div>
                                    <span className="text-xs sm:text-sm font-medium text-yellow-200">Working Style: </span>
                                    <span className="text-xs sm:text-sm text-slate-300">{personality.workingStyle}</span>
                                  </div>
                                  
                                  <div>
                                    <span className="text-xs sm:text-sm font-medium text-yellow-200">Personality: </span>
                                    <span className="text-xs sm:text-sm text-slate-300">{personality.personality}</span>
                                  </div>
                                  
                                  <div>
                                    <span className="text-xs sm:text-sm font-medium text-yellow-200">Collaboration: </span>
                                    <span className="text-xs sm:text-sm text-slate-300">{personality.collaborationStyle}</span>
                                  </div>
                                  
                                  <div>
                                    <span className="text-xs sm:text-sm font-medium text-yellow-200">Strengths: </span>
                                    <div className="flex flex-wrap gap-1 mt-1 justify-center sm:justify-start">
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
