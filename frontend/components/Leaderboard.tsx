import { Song } from './types';
import SongCard from './SongCard';

interface LeaderboardProps {
  songs: Song[];
  loading: boolean;
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

export default function Leaderboard({
  songs,
  loading,
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
}: LeaderboardProps) {
  const sortedSongs = [...songs].sort((a, b) => b.upvote_count - a.upvote_count);

  return (
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
            {sortedSongs.map((song, index) => (
              <SongCard
                key={song.id}
                song={song}
                index={index}
                songs={songs}
                playingId={playingId}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                recentlyUpvoted={recentlyUpvoted}
                rankingChanges={rankingChanges}
                rankingDirections={rankingDirections}
                highlightedSong={highlightedSong}
                onTogglePlay={onTogglePlay}
                onUpvote={onUpvote}
                onSeek={onSeek}
                formatTime={formatTime}
              />
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
  );
}
