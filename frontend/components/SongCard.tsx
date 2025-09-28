import React, { useState } from 'react';
import { Play, Pause, ArrowUp, ChevronDown, ChevronUp, Music, Clock, Share2, Download } from "lucide-react";
import { Song } from './types';
import Toast from './Toast';

interface SongCardProps {
  song: Song;
  index: number;
  songs: Song[];
  playingId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  recentlyUpvoted: Set<string>;
  rankingChanges: Set<string>;
  rankingDirections: {[key: string]: 'up' | 'down'};
  highlightedSong: string | null;
  onTogglePlay: (id: string) => void;
  onUpvote: (id: string) => void;
  onSeek: (time: number) => void;
  formatTime: (time: number) => string;
}

export default function SongCard({
  song,
  index,
  songs,
  playingId,
  isPlaying,
  currentTime,
  duration,
  recentlyUpvoted,
  rankingChanges,
  rankingDirections,
  highlightedSong,
  onTogglePlay,
  onUpvote,
  onSeek,
  formatTime
}: SongCardProps) {
  // Lyrics state
  const [isLyricsExpanded, setIsLyricsExpanded] = useState(false);
  const [lyrics, setLyrics] = useState<string>('');
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsError, setLyricsError] = useState<string>('');
  
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type, isVisible: true });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  const getRankStyle = (index: number) => {
    if (index === 0) return 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/50';
    if (index === 1) return 'bg-gray-400 text-black shadow-lg shadow-gray-400/50';
    if (index === 2) return 'bg-amber-600 text-black shadow-lg shadow-amber-600/50';
    return 'text-white';
  };

  const getPopularityPercentage = () => {
    const maxUpvotes = Math.max(...songs.map(s => s.upvote_count), 1);
    return Math.round((song.upvote_count / maxUpvotes) * 100);
  };

  const fetchLyrics = async () => {
    if (!song.lyrics_url || lyrics) return;
    
    setLyricsLoading(true);
    setLyricsError('');
    
    try {
      const response = await fetch(song.lyrics_url);
      if (!response.ok) {
        throw new Error('Failed to fetch lyrics');
      }
      const text = await response.text();
      setLyrics(text);
    } catch (err) {
      setLyricsError('Failed to load lyrics');
      console.error('Error fetching lyrics:', err);
    } finally {
      setLyricsLoading(false);
    }
  };

  const handleLyricsToggle = () => {
    setIsLyricsExpanded(!isLyricsExpanded);
    if (!isLyricsExpanded && !lyrics) {
      fetchLyrics();
    }
  };

  const formatLyrics = (text: string) => {
    if (!text || text === 'No lyrics available') {
      return <div className="text-slate-500 italic">{text}</div>;
    }

    // First, let's properly format the text by adding line breaks
    const formattedText = text
      // Add line break after genre markers
      .replace(/(\*\*[^*]+\*\*)/g, '$1\n')
      // Add line break after section headers
      .replace(/(\*\([^)]+\)\*)/g, '$1\n')
      // Add line break before section headers (except at start)
      .replace(/(?<!^)(\*\([^)]+\)\*)/g, '\n$1')
      // Split long sentences into multiple lines at natural points
      .replace(/([.!?])\s+(?=[A-Z])/g, '$1\n')
      // Add line breaks after exclamations in lyrics
      .replace(/([!])\s+(?=[A-Z][a-z])/g, '$1\n');

    const lines = formattedText.split('\n');
    const elements: React.ReactElement[] = [];
    let key = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) {
        // Empty line - add spacing
        elements.push(<div key={key++} className="h-2"></div>);
        continue;
      }

      // Genre/Style (bold text like **Country**)
      if (line.match(/^\*\*.*\*\*$/)) {
        const genre = line.replace(/\*\*/g, '');
        elements.push(
          <div key={key++} className="text-emerald-400 font-bold text-base mb-3 text-center">
            {genre}
          </div>
        );
        continue;
      }

      // Section headers (italic text like *(Verse 1)*)
      if (line.match(/^\*\(.*\)\*$/)) {
        const section = line.replace(/\*\(|\)\*/g, '');
        elements.push(
          <div key={key++} className="text-violet-400 font-semibold text-sm mb-2 mt-4">
            {section}
          </div>
        );
        continue;
      }

      // Regular lyrics lines
      elements.push(
        <div key={key++} className="text-slate-300 leading-relaxed mb-1">
          {line}
        </div>
      );
    }

    return elements;
  };

  const handleShare = async () => {
    if (!song.audio_url) {
      showToast('No audio file available to share', 'error');
      return;
    }

    try {
      // Try to fetch the audio file as a blob for sharing
      const response = await fetch(song.audio_url);
      const audioBlob = await response.blob();
      const audioFile = new File([audioBlob], `${song.title || `${song.repository.name}_Beat`}.mp3`, { type: 'audio/mpeg' });

      const shareData = {
        title: `${song.title || `${song.repository.name} Beat`} - GitBeat`,
        text: `Check out this AI-generated beat from ${song.repository.url.replace('https://github.com/', '')}!`,
        files: [audioFile]
      };

      // Check if we can share files
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        showToast('Audio shared successfully!', 'success');
      } else {
        // Fallback: copy link to clipboard since we can't share files
        const fallbackData = {
          title: shareData.title,
          text: `${shareData.text}\n🎵 Audio: ${song.audio_url}`,
          url: window.location.href
        };
        await navigator.clipboard.writeText(`${fallbackData.title}\n${fallbackData.text}\n${fallbackData.url}`);
        showToast('Link and audio URL copied to clipboard!', 'success');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      // Final fallback: copy text info to clipboard
      try {
        const fallbackText = `${song.title || `${song.repository.name} Beat`} - GitBeat\nCheck out this AI-generated beat from ${song.repository.url.replace('https://github.com/', '')}!\n🎵 Audio: ${song.audio_url}\n${window.location.href}`;
        await navigator.clipboard.writeText(fallbackText);
        showToast('Link and audio URL copied to clipboard!', 'success');
      } catch (clipboardError) {
        console.error('Error copying to clipboard:', clipboardError);
        showToast('Failed to share audio', 'error');
      }
    }
  };

  const handleDownload = () => {
    if (!song.audio_url) {
      showToast('No audio file available for download', 'error');
      return;
    }

    try {
      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = song.audio_url;
      link.download = `${song.title || `${song.repository.name}_Beat`}.mp3`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Download started!', 'success');
    } catch (error) {
      console.error('Error downloading:', error);
      showToast('Failed to download file', 'error');
    }
  };

  return (
    <div
      id={`song-${song.id}`}
      className={`p-3 sm:p-4 rounded-lg transition-all duration-500 hover:shadow-xl transform ${
        highlightedSong === song.id
          ? 'animate-pulse scale-105 ring-4 ring-yellow-400/70 shadow-[0_0_40px_rgba(255,215,0,0.5)] bg-gradient-to-r from-yellow-900/30 to-orange-900/30'
          : rankingChanges.has(song.id) 
            ? 'animate-pulse scale-105 ring-2 ring-emerald-400/50'
            : ''
      } bg-[#1C2530] hover:bg-slate-800 border-slate-600 hover:border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.1)] hover:shadow-emerald-500/20 border hover:scale-[1.02]`}
      style={{
        transitionProperty: 'all, transform, box-shadow',
        transitionDuration: '800ms',
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        animationDelay: `${index * 100}ms`,
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
                rankingChanges.has(song.id) ? 'animate-bounce scale-125' : ''
              } ${getRankStyle(index)}`}>
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
                <button
                  onClick={handleLyricsToggle}
                  className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors hover:cursor-pointer"
                >
                  <span>{isLyricsExpanded ? 'Hide Lyrics' : 'View Lyrics'}</span>
                  {isLyricsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              )}
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onTogglePlay(song.id)}
              className="hover:cursor-pointer w-8 h-8 text-white rounded-md hover:bg-emerald-400 hover:scale-105 transition-all duration-300 flex items-center justify-center"
            >
              {playingId === song.id && isPlaying ? (
                <Pause size={14} />
              ) : (
                <Play size={14} />
              )}
            </button>
            <button
              onClick={() => onUpvote(song.id)}
              className={`hover:cursor-pointer w-8 h-8 text-black rounded-md transition-all duration-300 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.3)] ${
                recentlyUpvoted.has(song.id)
                  ? 'bg-violet-400 scale-110 shadow-lg shadow-violet-500/50 animate-pulse'
                  : 'bg-emerald-300 hover:bg-violet-400 hover:scale-105 hover:shadow-lg hover:shadow-violet-500/50'
              }`}
            >
              <ArrowUp size={14} className={recentlyUpvoted.has(song.id) ? 'animate-bounce' : ''} />
            </button>
            <button
              onClick={handleShare}
              disabled={!song.audio_url}
              className="hover:cursor-pointer w-8 h-8 text-slate-400 hover:text-emerald-400 rounded-md hover:bg-slate-700/50 hover:scale-105 transition-all duration-300 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
              title="Share"
            >
              <Share2 size={14} />
            </button>
            <button
              onClick={handleDownload}
              disabled={!song.audio_url}
              className="hover:cursor-pointer w-8 h-8 text-slate-400 hover:text-emerald-400 rounded-md hover:bg-slate-700/50 hover:scale-105 transition-all duration-300 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
              title="Download"
            >
              <Download size={14} />
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
          </div>
          
          <div className="text-right">
            <div className="text-sm font-bold text-emerald-300">
              {getPopularityPercentage()}%
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
            rankingChanges.has(song.id) ? 'animate-bounce scale-125' : ''
          } ${getRankStyle(index)}`}>
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
              <button
                onClick={handleLyricsToggle}
                className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors hover:cursor-pointer"
              >
                <span>{isLyricsExpanded ? 'Hide Lyrics' : 'View Lyrics'}</span>
                {isLyricsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
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
        </div>

        {/* Progress bar */}
        <div className="flex-1 mx-4 lg:mx-8 min-w-[100px]">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>popularity</span>
            <span>{getPopularityPercentage()}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-lg h-2 overflow-hidden shadow-inner">
            <div 
              className="bg-emerald-300 h-2 rounded-lg hover:from-fuchsia-500 hover:to-violet-500 transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
              style={{ width: `${getPopularityPercentage()}%` }}
            ></div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onTogglePlay(song.id)}
            className="hover:cursor-pointer w-10 h-10 text-white rounded-md hover:bg-emerald-400 hover:scale-105 transition-all duration-300 flex items-center justify-center"
          >
            {playingId === song.id && isPlaying ? (
              <Pause size={16} />
            ) : (
              <Play size={16} />
            )}
          </button>
          <button
            onClick={() => onUpvote(song.id)}
            className={`hover:cursor-pointer w-10 h-10 text-black rounded-md transition-all duration-300 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.3)] ${
              recentlyUpvoted.has(song.id)
                ? 'bg-violet-400 scale-110 shadow-lg shadow-violet-500/50 animate-pulse'
                : 'bg-emerald-300 hover:bg-violet-400 hover:scale-105 hover:shadow-lg hover:shadow-violet-500/50'
            }`}
          >
            <ArrowUp size={16} className={recentlyUpvoted.has(song.id) ? 'animate-bounce' : ''} />
          </button>
          <button
            onClick={handleShare}
            disabled={!song.audio_url}
            className="hover:cursor-pointer w-10 h-10 text-slate-400 hover:text-emerald-400 rounded-md hover:bg-slate-700/50 hover:scale-105 transition-all duration-300 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
            title="Share"
          >
            <Share2 size={16} />
          </button>
          <button
            onClick={handleDownload}
            disabled={!song.audio_url}
            className="hover:cursor-pointer w-10 h-10 text-slate-400 hover:text-emerald-400 rounded-md hover:bg-slate-700/50 hover:scale-105 transition-all duration-300 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
            title="Download"
          >
            <Download size={16} />
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
              onSeek(newTime);
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
              onClick={() => onTogglePlay(song.id)}
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

      {/* Expandable Lyrics Section */}
      {song.lyrics_url && (
        <div className={`mt-4 border-t border-slate-700 pt-4 transition-all duration-300 ease-in-out overflow-hidden ${
          isLyricsExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 pt-0 mt-0 border-t-0'
        }`}>
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-white">Lyrics</h3>
              <div className="text-xs text-slate-500 bg-slate-700 px-2 py-1 rounded">
                AI Generated
              </div>
            </div>
            
            {lyricsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3">
                  <div className="animate-spin w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full"></div>
                  <span className="text-slate-400 text-sm">Loading lyrics...</span>
                </div>
              </div>
            ) : lyricsError ? (
              <div className="text-center py-8">
                <p className="text-red-400 text-sm mb-3">{lyricsError}</p>
                <button
                  onClick={fetchLyrics}
                  className="px-3 py-1 bg-emerald-300 text-black text-xs font-medium rounded hover:bg-emerald-400 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                <div className="text-slate-300 text-sm leading-relaxed space-y-3">
                  {formatLyrics(lyrics || 'No lyrics available')}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
}