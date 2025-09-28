"use client";

import { useState, useEffect, useRef } from "react";
import { analyzeGitHubRepository, RepositoryAnalysis as RepositoryAnalysisType } from "@/lib/github-analysis";
import { useSunoPolling } from "@/lib/hooks/useSunoPolling";
import { useLoadingText } from "@/components/hooks/useLoadingText";
import { isValidGitHubUrl } from "@/components/utils/github";
import { Song, ActiveTab, AnalysisTone } from "@/components/types";
import Header from "@/components/Header";
import TabNavigation from "@/components/TabNavigation";
import BeatsAnalysis from "@/components/BeatsAnalysis";
import Leaderboard from "@/components/Leaderboard";
import RepositoryAnalysis from "@/components/RepositoryAnalysis";

export default function Home() {
  // Core state
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('beats');
  const [urlError, setUrlError] = useState<string>("");
  
  // Audio player state
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Leaderboard state
  const [recentlyUpvoted, setRecentlyUpvoted] = useState<Set<string>>(new Set());
  const [rankingChanges, setRankingChanges] = useState<Set<string>>(new Set());
  const [rankingDirections, setRankingDirections] = useState<{[key: string]: 'up' | 'down'}>({});
  const previousRankingsRef = useRef<{[key: string]: number}>({});
  
  // Beats analysis state
  const [dustAnalysis, setDustAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const hasGeneratedMusicRef = useRef(false);
  
  // Repository analysis state
  const [githubRepoUrl, setGithubRepoUrl] = useState("");
  const [repoData, setRepoData] = useState<RepositoryAnalysisType | null>(null);
  const [repoLoading, setRepoLoading] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [analysisTone, setAnalysisTone] = useState<AnalysisTone>('fun');
  
  // Custom hooks
  const loadingText = useLoadingText(isAnalyzing || repoLoading || aiAnalyzing);
  
  // Ref for auto-scrolling to new songs
  const newSongRef = useRef<string | null>(null);
  
  // State for highlighting newly added songs
  const [highlightedSong, setHighlightedSong] = useState<string | null>(null);

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
            // Get the prompt that was used for Suno generation
            const sunoPrompt = `${dustAnalysis} - Create a song with vocals about this repository`;
            
            const saveResponse = await fetch('/api/songs/ai-generated', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                repository_url: repoUrl,
                suno_response: sunoData,
                dust_analysis: sunoPrompt, // Use the full Suno prompt as lyrics
                title: sunoData.title || "Repository AI Beat"
              })
            });
            
            const saveData = await saveResponse.json();
            if (saveData.success) {
              setSongs([saveData.song, ...songs]);
              newSongRef.current = saveData.song.id; // Mark this song for auto-scroll
              setHighlightedSong(saveData.song.id); // Mark this song for highlighting
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
    if (dustAnalysis && !isGenerating && !sunoPolling.isPolling && !hasGeneratedMusicRef.current) {
      hasGeneratedMusicRef.current = true;
      
      const generateMusic = async () => {
        setIsGenerating(true);
        try {
          const response = await fetch('/api/suno/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: `${dustAnalysis} - Create a song with vocals about this repository`,
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
          hasGeneratedMusicRef.current = false; // Reset on error
        } finally {
          setIsGenerating(false);
        }
      };

      generateMusic();
    }
  }, [dustAnalysis, isGenerating, sunoPolling.isPolling, sunoPolling.startPolling]);

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

    // Auto-scroll to newly added song
    if (newSongRef.current) {
      const songElement = document.getElementById(`song-${newSongRef.current}`);
      if (songElement) {
        setTimeout(() => {
          songElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }, 100); // Small delay to ensure DOM is updated
      }
      newSongRef.current = null; // Clear the ref
    }

    // Update the ref with current rankings
    previousRankingsRef.current = currentRankings;
  }, [songs]); // Only depend on songs, not previousRankings

  // Handle highlight timeout separately
  useEffect(() => {
    if (highlightedSong) {
      const timeout = setTimeout(() => {
        setHighlightedSong(null);
      }, 3000);
      
      return () => clearTimeout(timeout);
    }
  }, [highlightedSong]);

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
    
    // Validate GitHub URL
    if (!isValidGitHubUrl(githubRepoUrl.trim())) {
      setUrlError("Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo)");
      return;
    }
    
    setUrlError("");
    setRepoLoading(true);
    setAiAnalyzing(false);
    try {
      const analysis = await analyzeGitHubRepository(githubRepoUrl.trim(), setAiAnalyzing, analysisTone);
      setRepoData(analysis);
    } catch (error) {
      console.error('Error analyzing repository:', error);
      setUrlError('Failed to analyze GitHub repository. Please check the URL and try again.');
    } finally {
      setRepoLoading(false);
      setAiAnalyzing(false);
    }
  };

  // Handle beats analysis
  const handleBeatsAnalyze = async (repoUrl: string) => {
    setIsAnalyzing(true);
    hasGeneratedMusicRef.current = false; // Reset flag for new analysis
    setDustAnalysis(""); // Clear previous analysis to trigger new generation
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
  };

  // Handle tab change
  const handleTabChange = () => {
    setUrlError("");
  };

  const handleUpvote = async (id: string) => {
    try {
      const response = await fetch(`/api/songs/${id}/upvote`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.rateLimited) {
          alert(data.error);
          return;
        }
        throw new Error(data.error || 'Failed to upvote');
      }

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

      // Update UI with actual count from server
      setSongs(prevSongs => 
        prevSongs.map(song => 
          song.id === id 
            ? { ...song, upvote_count: data.upvote_count }
            : song
        )
      );

    } catch (error) {
      console.error('Upvote failed:', error);
      alert('Failed to upvote. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-center sm:justify-between mb-6 sm:mb-8">
          <div className="flex items-center justify-center">
            <h1 className={`text-xl sm:text-2xl lg:text-3xl font-bold transition-all duration-500 cursor-pointer flex items-center -gap-1 ${
              activeTab === 'beats' 
                ? 'text-emerald-300 drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]' 
                : 'text-yellow-200 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]'
            }`}>
              gitbeat 
              <img 
                src={activeTab === 'beats' ? '/gitbeat-logo-green.svg' : '/gitbeat-logo-yellow.svg'}
                alt="GitBeat Icon" 
                className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 hover:scale-110 transition-all duration-500"
                style={{
                  filter: activeTab === 'beats' 
                    ? 'drop-shadow(0 0 15px rgba(16, 185, 129, 0.6))' 
                    : 'drop-shadow(0 0 15px rgba(250, 204, 21, 0.6))'
                }}
              />
            </h1>
          </div>
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
            <BeatsAnalysis
              isAnalyzing={isAnalyzing}
              loadingText={loadingText}
              urlError={urlError}
              setUrlError={setUrlError}
              onAnalyze={handleBeatsAnalyze}
            />
            
            <Leaderboard
              songs={songs}
              loading={loading}
              playingId={playingId}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              recentlyUpvoted={recentlyUpvoted}
              rankingChanges={rankingChanges}
              rankingDirections={rankingDirections}
              highlightedSong={highlightedSong}
              onTogglePlay={togglePlay}
              onUpvote={handleUpvote}
              onSeek={seekTo}
              formatTime={formatTime}
            />
          </>
        ) : (
          <RepositoryAnalysis
            githubRepoUrl={githubRepoUrl}
            setGithubRepoUrl={setGithubRepoUrl}
            analysisTone={analysisTone}
            setAnalysisTone={setAnalysisTone}
            repoLoading={repoLoading}
            aiAnalyzing={aiAnalyzing}
            loadingText={loadingText}
            urlError={urlError}
            setUrlError={setUrlError}
            repoData={repoData}
            onSubmit={handleRepoSubmit}
          />
        )}
      </div>
    </div>
  );
}
