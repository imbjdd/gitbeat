"use client";

import { useState } from "react";
import { Play, Pause, ArrowUp, Music } from "lucide-react";

interface Repo {
  id: string;
  name: string;
  url: string;
  beats: number;
  marketCap: string;
  isPlaying: boolean;
  color: string;
  upvotes: number;
}

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("");
  const [repos, setRepos] = useState<Repo[]>([
    {
      id: "1",
      name: "react",
      url: "https://github.com/react/react",
      beats: 69420,
      marketCap: "$420K",
      isPlaying: false,
      color: "bg-indigo-500",
      upvotes: 1337,
    },
    {
      id: "2", 
      name: "nextjs",
      url: "https://github.com/vercel/next.js",
      beats: 42069,
      marketCap: "$269K",
      isPlaying: false,
      color: "bg-emerald-500",
      upvotes: 888,
    },
    {
      id: "3",
      name: "vscode", 
      url: "https://github.com/microsoft/vscode",
      beats: 31337,
      marketCap: "$133K",
      isPlaying: false,
      color: "bg-violet-500",
      upvotes: 420,
    },
  ]);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    const repoName = repoUrl.split("/").pop() || repoUrl;
    const colors = ["bg-rose-500", "bg-indigo-500", "bg-emerald-300", "bg-amber-500", "bg-violet-500", "bg-fuchsia-500"];
    const newRepo: Repo = {
      id: Date.now().toString(),
      name: repoName,
      url: repoUrl,
      beats: Math.floor(Math.random() * 10000),
      marketCap: `$${Math.floor(Math.random() * 500)}K`,
      isPlaying: false,
      color: colors[Math.floor(Math.random() * colors.length)],
      upvotes: Math.floor(Math.random() * 100),
    };

    setRepos([newRepo, ...repos]);
    setRepoUrl("");
  };

  const togglePlay = (id: string) => {
    setPlayingId(playingId === id ? null : id);
  };

  const handleUpvote = (id: string) => {
    setRepos(repos.map(repo => 
      repo.id === id 
        ? { ...repo, upvotes: repo.upvotes + 1 }
        : repo
    ));
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent hover:from-orange-400 hover:to-fuchsia-400 transition-all duration-500 cursor-pointer drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]">gitbeat 🎧</h1>
        </div>

        {/* GitHub Repo Input Section */}
        <div className="my-24">
          <div className="text-center mb-6">
            <h2 className="text-5xl font-bold mb-2 bg-emerald-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(16,185,129,0.6)] flex items-center justify-center gap-3">Turn your GitHub repo into <span className="bg-emerald-300 text-black px-2 py-1 rounded">beats</span> <Music className="text-emerald-300 drop-shadow-[0_0_15px_rgba(110,231,183,0.8)]" size={48} /></h2>
            <p className="text-slate-400 text-sm">Paste your GitHub repository URL below to generate music</p>
          </div>
          
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
            <div className="flex gap-3">
              <input
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/username/repository"
                className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:shadow-lg focus:shadow-emerald-400/50 hover:bg-slate-800 transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
              />
              <button
                type="submit"
                className="px-8 py-3 bg-emerald-300 text-black font-semibold rounded-md hover:bg-emerald-400 hover:scale-105 hover:shadow-lg hover:shadow-emerald-400/50 transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
              >
                Generate Beat
              </button>
            </div>
          </form>
        </div>

        {/* Leaderboard Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Leaderboard</h2>
            <div className="text-sm text-gray-400">{repos.length} beats generated</div>
          </div>

          {/* Leaderboard List */}
          <div className="space-y-3">
            {repos.map((repo, index) => (
              <div
                key={repo.id}
                className="bg-[#1C2530] p-4 rounded-lg hover:bg-slate-800 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/20 shadow-[0_0_25px_rgba(16,185,129,0.1)] border border-slate-600 hover:border-emerald-500/30"
              >
                <div className="flex items-center">
                  {/* Rank */}
                  <div className="w-8 h-8 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>

                  {/* Token circle and name */}
                  <div className="flex items-center gap-3 ml-4 min-w-[200px]">
                    <div>
                      <div className="font-semibold text-white hover:text-emerald-400 transition-colors drop-shadow-[0_0_5px_rgba(16,185,129,0.3)]">{repo.name}</div>
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-400 hover:text-emerald-400 transition-colors hover:drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]"
                      >
                        {repo.url.replace('https://github.com/', '')}
                      </a>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-8 ml-8 min-w-[250px]">
                    <div className="text-center">
                      <div className="text-lg font-bold text-emerald-400 hover:text-emerald-300 transition-colors drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]">{repo.beats.toLocaleString()}</div>
                      <div className="text-xs text-slate-400">beats</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-white hover:text-amber-400 transition-colors drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{repo.marketCap}</div>
                      <div className="text-xs text-slate-400">market cap</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-white hover:text-violet-300 transition-colors drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]">{repo.upvotes}</div>
                      <div className="text-xs text-slate-400">upvotes</div>
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
                    onClick={() => togglePlay(repo.id)}
                    className="w-10 h-10 text-white rounded-md hover:bg-emerald-400 hover:scale-105 transition-all duration-300 mr-3 flex items-center justify-center "
                  >
                    {playingId === repo.id ? (
                      <Pause size={16} />
                    ) : (
                      <Play size={16} />
                    )}
                  </button>
                
                  {/* Upvote button */}
                  <button
                    onClick={() => handleUpvote(repo.id)}
                    className="w-10 h-10 bg-emerald-300 text-black rounded-md hover:bg-violet-400 hover:scale-105 transition-all duration-300 flex items-center justify-center hover:shadow-lg hover:shadow-violet-500/50 shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                  >
                    <ArrowUp size={16} />
                  </button>

                </div>

                {/* Playing indicator */}
                {playingId === repo.id && (
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

          {repos.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg mb-2">No beats generated yet</div>
              <div className="text-gray-400 text-sm">Add your first GitHub repo above to get started!</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
