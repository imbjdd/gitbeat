import { Music } from "lucide-react";
import { isValidGitHubUrl } from './utils/github';
import ErrorMessage from './ErrorMessage';
import LoadingMessage from './LoadingMessage';

interface BeatsAnalysisProps {
  isAnalyzing: boolean;
  loadingText: string;
  urlError: string;
  setUrlError: (error: string) => void;
  onAnalyze: (repoUrl: string) => void;
}

export default function BeatsAnalysis({ 
  isAnalyzing, 
  loadingText, 
  urlError, 
  setUrlError, 
  onAnalyze 
}: BeatsAnalysisProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent page reload
    
    const input = document.getElementById('dustRepoInput') as HTMLInputElement;
    const repoUrl = input.value.trim();
    if (!repoUrl) return;
    
    // Validate GitHub URL
    if (!isValidGitHubUrl(repoUrl)) {
      setUrlError("Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo)");
      return;
    }
    
    setUrlError("");
    onAnalyze(repoUrl);
  };


  return (
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
        
        <form className="max-w-2xl mx-auto space-y-4" onSubmit={handleSubmit}>
          <div className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-3 px-4">
            <input
              type="url"
              placeholder="https://github.com/username/repository"
              className="flex-1 px-3 sm:px-4 py-3 bg-slate-800 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:shadow-lg focus:shadow-emerald-400/50 hover:bg-slate-700 transition-all duration-300 text-sm sm:text-base"
              id="dustRepoInput"
              onChange={() => setUrlError("")}
            />
            <button
              type="submit"
              disabled={isAnalyzing}
              className="hover:cursor-pointer hover:shadow-lg hover:shadow-emerald-500/50 px-4 sm:px-6 py-3 bg-emerald-300 text-black font-semibold rounded-md hover:bg-emerald-400 hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base w-full sm:w-auto"
            >
              {isAnalyzing ? `${loadingText}...` : 'Analyze'}
            </button>
          </div>
          
          {/* URL Error Message */}
          {urlError && (
            <div className="max-w-2xl mx-auto px-4 mt-3">
              <ErrorMessage error={urlError} />
            </div>
          )}
          
          {/* Enhanced Loading Message for Beats */}
          {isAnalyzing && (
            <div className="max-w-2xl mx-auto px-4 mt-6">
              <LoadingMessage
                loadingText={loadingText}
                title="your repository"
                description="Creating your unique beats from code patterns. Just leave the page open and come back in a few minutes."
                estimatedTime="5 minutes"
                process="Analyzing code → Generating lyrics → Creating music"
                theme="emerald"
              />
            </div>
          )}
        </form>
      </div>
    </>
  );
}
